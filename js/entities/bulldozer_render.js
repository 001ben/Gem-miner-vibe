import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

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

    this.materialPresets = {
      "Glass": new THREE.MeshPhysicalMaterial({
        name: "Glass", color: 0xaaccff, metalness: 0.1, roughness: 0.1,
        transmission: 0.6, transparent: true, ior: 1.5, thickness: 0.05, side: THREE.DoubleSide
      }),
      "Track": new THREE.MeshStandardMaterial({
        name: "Track", color: 0x222222, roughness: 0.9, metalness: 0.1
      })
    };
  }

  async load(url, configUrlOrObj = null) {
    console.log(`[DEBUG] BulldozerRenderer.load: ${url}`);
    const cb = (u) => `${u}${u.includes('?') ? '&' : '?'}cb=${Date.now()}`;

    if (typeof configUrlOrObj === 'string') {
      const resp = await fetch(cb(configUrlOrObj));
      if (resp.ok) this.config = await resp.json();
    } else {
      this.config = configUrlOrObj;
    }

    if (this.config?.assembly?.tracks) {
      Object.assign(this.trackParams, this.config.assembly.tracks);
      console.log(`[CONTRACT] Applied Assembly: Spread=${this.trackParams.spread}, Vert=${this.trackParams.verticalOffset}`);
    }

    return new Promise((resolve, reject) => {
      this.loader.load(cb(url), (gltf) => {
        let bodyMeshNode = null;
        let trackLinkNode = null;
        let pathLNode = null;
        let pathRNode = null;

        gltf.scene.traverse(c => {
          if (c.name.includes("Bulldozer_Body")) bodyMeshNode = c;
          if (c.userData.damp_id === "track_link" || c.name.includes("Asset_TrackLink")) trackLinkNode = c;
          if (c.userData.damp_id === "path_l" || c.name.includes("Asset_TrackPath_L")) pathLNode = c;
          if (c.userData.damp_id === "path_r" || c.name.includes("Asset_TrackPath_R")) pathRNode = c;
        });

                // 1. Setup Body
                if (bodyMeshNode) {
                  const body = bodyMeshNode.clone();
                  this.group.add(body);
                  
                  // Center the chassis group
                  body.position.set(0, 0, 0);
                  body.rotation.set(0, 0, 0);
                  body.scale.set(1, 1, 1);
        
                  body.traverse(async (c) => {            if (c.isMesh) {
              const sourceNode = bodyMeshNode.getObjectByName(c.name);
              if (sourceNode) {
                  if (sourceNode.userData.damp_id) c.userData.damp_id = sourceNode.userData.damp_id;
                  if (sourceNode.material?.userData?.damp_id) c.material.userData.damp_id = sourceNode.material.userData.damp_id;
              }
              c.castShadow = c.receiveShadow = true;
              await this.applyMaterial(c);
            }
          });
        }

        // 2. Setup Tracks
        if (trackLinkNode && pathLNode && pathRNode) {
          const setupTrack = async (pathNode, side) => {
            const attr = pathNode.geometry.attributes.position;
            const points = [];
            pathNode.updateMatrixWorld(true);
            for (let i = 0; i < attr.count; i++) {
              points.push(new THREE.Vector3().fromBufferAttribute(attr, i).applyMatrix4(pathNode.matrixWorld));
            }
            const curve = new THREE.CatmullRomCurve3(points, true, 'centripetal', 0.5);
            const count = 50;
            
            const linkGeo = trackLinkNode.geometry.clone();
            trackLinkNode.updateMatrixWorld(true);
            linkGeo.applyMatrix4(trackLinkNode.matrixWorld);
            linkGeo.center();

            const mesh = new THREE.InstancedMesh(linkGeo, new THREE.MeshStandardMaterial(), count);
            mesh.name = side < 0 ? "Instanced_Track_L" : "Instanced_Track_R";
            mesh.userData.damp_id = 'track_link';
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

  async applyMaterial(mesh) {
    const name = mesh.name;
    const matName = mesh.material ? mesh.material.name : "";
    const matDampId = (mesh.material && mesh.material.userData) ? mesh.material.userData.damp_id : null;
    const meshDampId = mesh.userData.damp_id;
    
    let configKey = matDampId || meshDampId || name;
    let source = matDampId ? "material.userData.damp_id" : (meshDampId ? "mesh.userData.damp_id" : "mesh.name");

    if (this.config?.components) {
        if (this.config.components[configKey]) { /* found */ }
        else if (this.config.components[name]) { configKey = name; source = "mesh.name"; }
        else if (this.config.components[matName]) { configKey = matName; source = "material.name"; }
    }

    const settings = this.config?.components?.[configKey];
    console.log(`[CONTRACT] RESOLVE: '${name}' (Mat: ${matName}) -> key: '${configKey}' | settings: ${!!settings} (from ${source})`);

    const cb = (u) => `${u}${u.includes('?') ? '&' : '?'}cb=${Date.now()}`;

    // Selection
    let material;
    if (settings?.preset && this.materialPresets[settings.preset]) {
      material = this.materialPresets[settings.preset].clone();
    } else if (configKey === "cabin" || matName.includes("Glass")) {
      material = this.materialPresets["Glass"].clone();
    } else if (configKey === "track_link" || name.includes("Track")) {
      material = this.materialPresets["Track"].clone();
    } else {
      material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
    }
    mesh.material = material;

    if (settings) {
      if (settings.color) material.color.set(settings.color);
      if (settings.roughness !== undefined) material.roughness = settings.roughness;
      if (settings.metalness !== undefined) material.metalness = settings.metalness;
      if (settings.transmission !== undefined && material.isMeshPhysicalMaterial) material.transmission = settings.transmission;

      if (settings.textureId && settings.textureId !== 'None') {
        this.texLoader.load(cb(`assets/textures/${settings.textureId}`), (tex) => {
          tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
          tex.colorSpace = THREE.SRGBColorSpace;
          if (settings.uvTransform) {
            const uv = settings.uvTransform;
            if (uv.scale !== undefined) tex.repeat.set(uv.scale, uv.scale);
            if (uv.rotation !== undefined) tex.rotation = uv.rotation;
            if (uv.offset !== undefined) tex.offset.set(uv.offset[0], uv.offset[1]);
            tex.center.set(0.5, 0.5);
          }
          material.map = tex;
          material.needsUpdate = true;
          if (mesh.isInstancedMesh) mesh.instanceMatrix.needsUpdate = true;
        });
      }
    }
  }

  setPose(pos, ang) {
    this.group.position.set(pos.x, this.scale * 1.0, pos.y);
    this.group.rotation.y = -ang;
    this.group.scale.setScalar(this.scale);
  }
  setScale(s) { this.scale = s; this.group.scale.setScalar(s); }
  setSpeeds(l, r) { this.animatedInstances.forEach(t => { t.speed = (t.side === -1) ? l : r; }); }

  update(delta) {
    if (!this.isLoaded) return;
    this.animatedInstances.forEach(track => {
      if (Math.abs(track.speed) > 0.001) track.offset = (track.offset + track.speed * delta) % 1.0;
      for (let i = 0; i < track.count; i++) {
        let t = (i / 50 + track.offset) % 1.0;
        if (t < 0) t += 1.0;
        track.curve.getPointAt(t, this._position);
        track.curve.getTangentAt(t, this._tangent);
        this.dummy.up.copy(this.trackParams.up);
        this.dummy.position.copy(this._position);
        this.dummy.lookAt(this._lookAtTarget.copy(this._position).add(this._tangent));
        this.dummy.rotateZ(this.trackParams.rotZ);
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