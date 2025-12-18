import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// --- Triplanar Shader Logic ---
function enhanceMaterialWithTriplanar(material) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uScale = { value: 0.1 };
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\nvarying vec3 vWorldPosition;\nvarying vec3 vWorldNormal;`);
    shader.vertexShader = shader.vertexShader.replace('#include <worldpos_vertex>', `#include <worldpos_vertex>\nvarying vec3 vWorldPosition;\nvarying vec3 vWorldNormal;\nvWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvWorldNormal = normalize(mat3(modelMatrix) * normal);`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vWorldPosition;\nvarying vec3 vWorldNormal;\nuniform float uScale;`);
    const triplanarLogic = `
            vec3 blending = abs(vWorldNormal);
            blending = normalize(max(blending, 0.00001));
            float b = (blending.x + blending.y + blending.z);
            blending /= b;
            vec3 coord = vWorldPosition * uScale;
            vec4 xaxis = texture2D(map, coord.yz);
            vec4 yaxis = texture2D(map, coord.xz);
            vec4 zaxis = texture2D(map, coord.xy);
            vec4 texColor = xaxis * blending.x + yaxis * blending.y + zaxis * blending.z;
            diffuseColor *= texColor;
        `;
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', triplanarLogic);
  };
}

export class BulldozerRenderer {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.loader = new GLTFLoader();
    this.texLoader = new THREE.TextureLoader();
    this.animatedInstances = [];

    this.trackParams = {
      up: new THREE.Vector3(1, 0, 0), // Axle
      rotX: 0,
      rotY: 0,
      rotZ: Math.PI * 1.5, // 270 deg
      spread: 0.15,
      verticalOffset: -0.53
    };

    this.scale = 10.0;
    this._position = new THREE.Vector3();
    this._tangent = new THREE.Vector3();
    this._lookAtTarget = new THREE.Vector3();
    this.dummy = new THREE.Object3D();
    this.isLoaded = false;
    this.config = null;

    // Define Code-based Material Presets
    this.materialPresets = {
        "Glass": new THREE.MeshPhysicalMaterial({
            name: "Glass",
            color: 0xaaccff,
            metalness: 0.1,
            roughness: 0.1,
            transmission: 0.6,
            transparent: true,
            ior: 1.5,
            thickness: 0.05,
            side: THREE.DoubleSide
        }),
        "Track": new THREE.MeshStandardMaterial({
            name: "Track",
            color: 0x222222,
            roughness: 0.9,
            metalness: 0.1
        })
    };
  }

  async load(url, configUrlOrObj = null) {
    console.log(`[DEBUG]BulldozerRenderer.load: ${url}`);
    
    const cb = (u) => {
        if (typeof u !== 'string') return u;
        if (u.startsWith('http')) return u; 
        const separator = u.includes('?') ? '&' : '?';
        return `${u}${separator}cb=${Date.now()}`;
    };

    // Reset state
    this.config = null;

    if (configUrlOrObj) {
        if (typeof configUrlOrObj === 'string') {
            try {
                const resp = await fetch(cb(configUrlOrObj));
                if (resp.ok) this.config = await resp.json();
            } catch (e) {
                console.warn("[WARN] Failed to load config", e);
            }
        } else {
            this.config = configUrlOrObj;
        }
    }

    return new Promise((resolve, reject) => {
      this.loader.load(url, (gltf) => {
        let bodyMeshNode = null;
        let trackLinkNode = null;
        let pathLNode = null;
        let pathRNode = null;

        gltf.scene.traverse(c => {
            if (c.name.includes("Bulldozer_Body")) bodyMeshNode = c;
            if (c.name.includes("Asset_TrackLink")) trackLinkNode = c;
            if (c.name.includes("Asset_TrackPath_L")) pathLNode = c;
            if (c.name.includes("Asset_TrackPath_R")) pathRNode = c;
        });

        // Setup Body
        if (bodyMeshNode) {
          const body = bodyMeshNode.clone();
          body.name = "Bulldozer_Body"; 
          this.group.add(body);
          body.traverse(async (c) => {
            if (c.isMesh) {
              c.castShadow = c.receiveShadow = true;
              await this.applyMaterial(c);
            }
          });
        }

        // Setup Tracks
        if (trackLinkNode && pathLNode && pathRNode) {
          const setupTrack = async (pathNode, side) => {
            const attr = pathNode.geometry.attributes.position;
            const points = [];
            pathNode.updateMatrixWorld(true);
            for (let i = 0; i < attr.count; i++) {
                const v = new THREE.Vector3().fromBufferAttribute(attr, i);
                v.applyMatrix4(pathNode.matrixWorld);
                points.push(v);
            }
            const curve = new THREE.CatmullRomCurve3(points, true, 'centripetal', 0.5);
            const count = 50;
            const linkGeo = trackLinkNode.geometry.clone();
            trackLinkNode.updateMatrixWorld(true);
            linkGeo.applyMatrix4(trackLinkNode.matrixWorld); 
            linkGeo.computeBoundingBox();
            const center = new THREE.Vector3();
            linkGeo.boundingBox.getCenter(center);
            linkGeo.translate(-center.x, -center.y, -center.z);
            
            const mesh = new THREE.InstancedMesh(linkGeo, new THREE.MeshStandardMaterial(), count);
            mesh.name = side < 0 ? "Instanced_Track_L" : "Instanced_Track_R";
            this.group.add(mesh);
            await this.applyMaterial(mesh);
            this.animatedInstances.push({ mesh, curve, count, speed: 0, offset: 0, side });
          };
          setupTrack(pathLNode, -1);
          setupTrack(pathRNode, 1);
        }

        this.isLoaded = true;
        resolve();
      }, undefined, reject);
    });
  }

  async applyMaterial(mesh, overrideName = null) {
    const name = overrideName || mesh.name;
    const matName = mesh.material ? mesh.material.name : "";
    
    // Determine which config entry to use
    let configKey = name;
    if (this.config && this.config.components) {
        if (this.config.components[name]) configKey = name;
        else if (this.config.components[matName]) configKey = matName;
        else if (matName.includes("Yellow")) configKey = "Bulldozer_Body";
        else if (matName.includes("Glass")) configKey = "Cabin";
        else if (name.includes("Cube") || name.includes("Wheel") || matName.includes("Metal") || matName === "") {
            configKey = "Bulldozer_Body";
        } else if (name.includes("Track")) {
            configKey = "Asset_TrackLink";
        }
    }
    
    const settings = (this.config && this.config.components) ? this.config.components[configKey] : null;
    console.log(`[DEBUG] applyMaterial: ${name} (Mat: ${matName}) mapped to: ${configKey} | Found: ${!!settings}`);

    const cb = (u) => {
        if (!u || u === 'None') return u;
        if (u.startsWith('http')) return u;
        return `${u}${u.includes('?') ? '&' : '?'}cb=${Date.now()}`;
    };

    // 1. Base Material selection
    let material;
    if (settings && settings.preset && this.materialPresets[settings.preset]) {
        material = this.materialPresets[settings.preset].clone();
    } else if (configKey === "Cabin" || matName.includes("Glass")) {
        material = this.materialPresets["Glass"].clone();
    } else if (configKey === "Asset_TrackLink" || name.includes("Track")) {
        material = this.materialPresets["Track"].clone();
    } else {
        material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, metalness: 0.2 });
    }
    mesh.material = material;

    // 2. Overrides
    if (settings) {
        if (settings.color) material.color.set(settings.color);
        if (settings.roughness !== undefined) material.roughness = settings.roughness;
        if (settings.metalness !== undefined) material.metalness = settings.metalness;
        if (settings.transmission !== undefined && material.isMeshPhysicalMaterial) material.transmission = settings.transmission;
        if (settings.ior !== undefined && material.isMeshPhysicalMaterial) material.ior = settings.ior;
    
        // 3. Texture
        if (settings.textureId && settings.textureId !== 'None') {
            const path = settings.textureId.startsWith('http') ? settings.textureId : `assets/textures/${settings.textureId}`;
            this.texLoader.load(cb(path), (tex) => {
                tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
                tex.colorSpace = THREE.SRGBColorSpace;
                if (settings.uvTransform) {
                    const uv = settings.uvTransform;
                    if (uv.scale !== undefined) tex.repeat.set(uv.scale, uv.scale);
                    if (uv.rotation !== undefined) tex.rotation = uv.rotation;
                    if (uv.offset !== undefined) tex.offset.set(uv.offset[0], uv.offset[1]);
                    tex.center.set(0.5, 0.5); 
                }
                mesh.material.map = tex;
                mesh.material.needsUpdate = true;
                if (mesh.isInstancedMesh) mesh.instanceMatrix.needsUpdate = true;
            });
        }
    }
  }

  setScale(s) { this.scale = s; this.group.scale.setScalar(s); }
  setPose(pos, ang) {
    this.group.position.set(pos.x, this.scale * 1.0, pos.y);
    this.group.rotation.y = -ang; 
    this.group.scale.setScalar(this.scale);
  }
  setSpeeds(l, r) { this.animatedInstances.forEach(t => { t.speed = (t.side === -1) ? l : r; }); }

  update(delta) {
    if (!this.isLoaded) return;
    this.animatedInstances.forEach(track => {
        if (Math.abs(track.speed) > 0.001) track.offset = (track.offset + track.speed * delta) % 1.0;
        for (let i = 0; i < track.count; i++) {
            let t = (i / track.count + track.offset) % 1.0;
            if (t < 0) t += 1.0;
            track.curve.getPointAt(t, this._position);
            track.curve.getTangentAt(t, this._tangent);
            this.dummy.up.copy(this.trackParams.up);
            this.dummy.position.copy(this._position);
            this._lookAtTarget.copy(this._position).add(this._tangent);
            this.dummy.lookAt(this._lookAtTarget);
            if (this.trackParams.rotZ) this.dummy.rotateZ(this.trackParams.rotZ);
            if (this.trackParams.spread) this.dummy.position.addScaledVector(this.trackParams.up, this.trackParams.spread * track.side);
            if (this.trackParams.verticalOffset) this.dummy.position.y += this.trackParams.verticalOffset;
            this.dummy.updateMatrix();
            track.mesh.setMatrixAt(i, this.dummy.matrix);
        }
        track.mesh.instanceMatrix.needsUpdate = true;
    });
  }

  destroy() {
    this.scene.remove(this.group);
    this.group.traverse(c => {
        if (c.geometry) c.geometry.dispose();
        if (c.material) Array.isArray(c.material) ? c.material.forEach(m => m.dispose()) : c.material.dispose();
    });
    this.animatedInstances = [];
    this.isLoaded = false;
  }
}