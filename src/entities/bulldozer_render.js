import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MaterialManager } from '../core/material-manager.js';
import { cb } from '../utils/graphics-utils.js';

export class BulldozerRenderer {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.loader = new GLTFLoader();
    this.materialManager = new MaterialManager();
    this.animatedInstances = [];

    this.trackParams = {
      up: new THREE.Vector3(1, 0, 0), // Axle
      rotX: 0,
      rotY: 0,
      rotZ: Math.PI * 0.5, // 90 deg (flipped to point grousers out)
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
  }

  // Expose presets for the UI via the manager
  get materialPresets() {
      return this.materialManager.materialPresets;
  }

  async load(url, configUrlOrObj = null) {
    console.log(`[DEBUG]BulldozerRenderer.load: ${url}`);

    // Reset state
    this.config = null;

    if (configUrlOrObj) {
      if (typeof configUrlOrObj === 'string') {
        try {
          const resp = await fetch(cb(configUrlOrObj));
          if (resp.ok) this.config = await resp.json();
        } catch (e) {
          console.warn("[WARN] Failed to load bulldozer config", e);
        }
      } else {
        this.config = configUrlOrObj;
      }
    }

    // Apply Assembly Offsets from Config
    if (this.config && this.config.assembly) {
      const tracks = this.config.assembly.tracks;
      if (tracks) {
        if (tracks.spread !== undefined) this.trackParams.spread = tracks.spread;
        if (tracks.verticalOffset !== undefined) this.trackParams.verticalOffset = tracks.verticalOffset;
        if (tracks.rotZ !== undefined) this.trackParams.rotZ = tracks.rotZ;
        console.log(`[CONTRACT] Applied assembly offsets: Spread=${this.trackParams.spread}, Vert=${this.trackParams.verticalOffset}, RotZ=${this.trackParams.rotZ}`);
      }
    }

    return new Promise((resolve, reject) => {
      this.loader.load(cb(url), async (gltf) => {
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

        // Helper to check if a node is part of the special machinery (Body or Tracks)
        const specialRoots = [bodyMeshNode, trackLinkNode, pathLNode, pathRNode].filter(n => n);
        const isSpecial = (node) => {
            if (specialRoots.includes(node)) return true;
            // Check ancestors
            let parent = node.parent;
            while(parent) {
                if (specialRoots.includes(parent)) return true;
                parent = parent.parent;
            }
            return false;
        };

        // 1. Setup Body (Special)
        if (bodyMeshNode) {
          console.log(`[DEBUG] Found body node: ${bodyMeshNode.name}`);
          const body = bodyMeshNode.clone();
          body.name = "Bulldozer_Body";
          body.userData.damp_id = bodyMeshNode.userData.damp_id; 
          this.group.add(body);

          const meshes = [];
          body.traverse(c => { if(c.isMesh) meshes.push(c); });
          for (const c of meshes) {
              const sourceNode = bodyMeshNode.getObjectByName(c.name);
              if (sourceNode && sourceNode.userData.damp_id) c.userData.damp_id = sourceNode.userData.damp_id;
              if (sourceNode && sourceNode.material && sourceNode.material.userData.damp_id) {
                  c.material.userData.damp_id = sourceNode.material.userData.damp_id;
              }
              c.castShadow = c.receiveShadow = true;
              await this.applyMaterial(c);
          }
        }

        // 2. Setup Tracks (Special)
        if (trackLinkNode && pathLNode && pathRNode) {
          const setupTrack = async (pathNode, side) => {
            const attr = pathNode.geometry.attributes.position;
            let rawPoints = [];
            pathNode.updateMatrixWorld(true);
            for (let i = 0; i < attr.count; i++) {
              const v = new THREE.Vector3().fromBufferAttribute(attr, i);
              v.applyMatrix4(pathNode.matrixWorld);
              rawPoints.push(v);
            }

            // Deduplicate and Sort Points (Greedy Nearest Neighbor)
            const points = [];
            if (rawPoints.length > 0) {
                let current = rawPoints.splice(0, 1)[0];
                points.push(current);
                while (rawPoints.length > 0) {
                    let bestIdx = -1;
                    let bestDist = Infinity;
                    for (let j = 0; j < rawPoints.length; j++) {
                        const d = current.distanceToSquared(rawPoints[j]);
                        if (d < bestDist) {
                            bestDist = d;
                            bestIdx = j;
                        }
                    }
                    if (bestDist < 0.0001) {
                        rawPoints.splice(bestIdx, 1);
                    } else {
                        current = rawPoints.splice(bestIdx, 1)[0];
                        points.push(current);
                    }
                }
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
            mesh.userData.damp_id = trackLinkNode.userData.damp_id; 
            if (trackLinkNode.material && trackLinkNode.material.userData.damp_id) {
                mesh.material.userData.damp_id = trackLinkNode.material.userData.damp_id;
            }
            this.group.add(mesh);
            await this.applyMaterial(mesh);
            this.animatedInstances.push({ mesh, curve, count, speed: 0.02, offset: 0, side });
          };
          await setupTrack(pathLNode, -1);
          await setupTrack(pathRNode, 1);
        }

        // 3. Setup Generic Components (Fallthrough)
        // Identify any root children that are NOT special and add them
        const genericRoots = [];
        gltf.scene.children.forEach(child => {
             if (!isSpecial(child)) {
                 genericRoots.push(child);
             }
        });

        for (const node of genericRoots) {
            console.log(`[DEBUG] Processing generic node: ${node.name}`);
            const clone = node.clone();
            this.group.add(clone);

            const meshes = [];
            clone.traverse(c => { if(c.isMesh) meshes.push(c); });
            for (const c of meshes) {
                // Try to find source to map userData
                const sourceNode = node.getObjectByName(c.name) || node;
                if (sourceNode) {
                    if (sourceNode.userData.damp_id) c.userData.damp_id = sourceNode.userData.damp_id;
                    if (sourceNode.material && sourceNode.material.userData.damp_id) {
                         c.material.userData.damp_id = sourceNode.material.userData.damp_id;
                    }
                }
                c.castShadow = c.receiveShadow = true;
                await this.applyMaterial(c);
            }
        }

        this.isLoaded = true;
        resolve();
      }, undefined, reject);
    });
  }

  async applyMaterial(mesh, overrideName = null) {
      // Delegate to the specialized manager
      await this.materialManager.applyMaterial(mesh, this.config, overrideName);
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
      if (Math.abs(track.speed) > 0.001) track.offset = (track.offset - track.speed * delta) % 1.0;
      for (let i = 0; i < track.count; i++) {
        let t = (i / 50 + track.offset) % 1.0;
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