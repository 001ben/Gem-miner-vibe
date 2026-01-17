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

    this.plowParams = {
      segmentCount: 1,
      segmentWidth: 1.0,
      hasWings: false,
      wingScale: 1.0,
      hasTeeth: false,
      mesh: null,
      teethMesh: null,
      wingL: null,
      wingR: null
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
      await this.loadConfig(configUrlOrObj);
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

        await this.processGenericNodes(genericRoots);

        this.isLoaded = true;
        resolve();
      }, undefined, reject);
    });
  }

  async loadPlow(url, configUrlOrObj = null) {
    console.log(`[DEBUG]BulldozerRenderer.loadPlow: ${url}`);

    if (configUrlOrObj) {
      await this.loadConfig(configUrlOrObj);
    }

    return new Promise((resolve, reject) => {
      this.loader.load(cb(url), async (gltf) => {
        // Plow assets are likely just the generic components
        const roots = [];
        gltf.scene.children.forEach(child => roots.push(child));

        await this.processGenericNodes(roots);
        resolve();
      }, undefined, reject);
    });
  }

  async loadConfig(configUrlOrObj) {
      let newConfig = {};
      if (typeof configUrlOrObj === 'string') {
        try {
          const resp = await fetch(cb(configUrlOrObj));
          if (resp.ok) newConfig = await resp.json();
        } catch (e) {
          console.warn("[WARN] Failed to load config", e);
        }
      } else {
        newConfig = configUrlOrObj;
      }

      // Merge config
      if (!this.config) {
          this.config = newConfig;
      } else {
          // Deep merge or shallow merge?
          // Shallow merge of top keys, deeper for assembly/components
          this.config = {
              ...this.config,
              ...newConfig,
              assembly: { ...this.config.assembly, ...newConfig.assembly },
              components: { ...this.config.components, ...newConfig.components }
          };
      }

      // Apply Assembly Offsets
      if (this.config && this.config.assembly) {
        const tracks = this.config.assembly.tracks;
        if (tracks) {
          if (tracks.spread !== undefined) this.trackParams.spread = tracks.spread;
          if (tracks.verticalOffset !== undefined) this.trackParams.verticalOffset = tracks.verticalOffset;
          if (tracks.rotZ !== undefined) this.trackParams.rotZ = tracks.rotZ;
        }
        const plow = this.config.assembly.plow;
        if (plow) {
          if (plow.segmentCount !== undefined) this.plowParams.segmentCount = plow.segmentCount;
          if (plow.segmentWidth !== undefined) this.plowParams.segmentWidth = plow.segmentWidth;
        }
      }
  }

  async processGenericNodes(nodes) {
        for (const node of nodes) {
            // Special handling for instantiable segments
            if (node.name.includes("Plow_Segment")) {
                 console.log(`[DEBUG] Converting ${node.name} to InstancedMesh`);
                 let meshNode = null;
                 node.traverse(c => { if (c.isMesh && !meshNode) meshNode = c; });

                 if (meshNode) {
                     const count = 50; // Max capacity
                     const instancedMesh = new THREE.InstancedMesh(meshNode.geometry.clone(), meshNode.material.clone(), count);
                     instancedMesh.name = "Instanced_Plow_Segment";
                     instancedMesh.userData.damp_id = node.userData.damp_id || meshNode.userData.damp_id;
                     if (meshNode.material && meshNode.material.userData.damp_id) {
                        instancedMesh.material.userData.damp_id = meshNode.material.userData.damp_id;
                     }
                     instancedMesh.castShadow = true;
                     instancedMesh.receiveShadow = true;
                     this.group.add(instancedMesh);
                     await this.applyMaterial(instancedMesh);

                     this.plowParams.mesh = instancedMesh;
                     continue;
                 }
            }

            // Special handling for teeth
            if (node.name.includes("Plow_Tooth")) {
                 console.log(`[DEBUG] Converting ${node.name} to InstancedMesh`);
                 let meshNode = null;
                 node.traverse(c => { if (c.isMesh && !meshNode) meshNode = c; });

                 if (meshNode) {
                     const count = 50;
                     const instancedMesh = new THREE.InstancedMesh(meshNode.geometry.clone(), meshNode.material.clone(), count);
                     instancedMesh.name = "Instanced_Plow_Tooth";
                     instancedMesh.userData.damp_id = node.userData.damp_id || meshNode.userData.damp_id;
                     if (meshNode.material && meshNode.material.userData.damp_id) {
                        instancedMesh.material.userData.damp_id = meshNode.material.userData.damp_id;
                     }
                     instancedMesh.castShadow = true;
                     instancedMesh.receiveShadow = true;
                     this.group.add(instancedMesh);
                     await this.applyMaterial(instancedMesh);

                     this.plowParams.teethMesh = instancedMesh;
                     continue;
                 }
            }

            // Special handling for Wings
            if (node.name.includes("Plow_Wing_L")) {
                const clone = node.clone();
                this.group.add(clone);
                this.plowParams.wingL = clone;
                await this.applyGenericMaterials(clone, node);
                continue;
            }
            if (node.name.includes("Plow_Wing_R")) {
                const clone = node.clone();
                this.group.add(clone);
                this.plowParams.wingR = clone;
                await this.applyGenericMaterials(clone, node);
                continue;
            }

            // Standard clone for other generic objects
            const clone = node.clone();
            this.group.add(clone);
            await this.applyGenericMaterials(clone, node);
        }
  }

  async applyGenericMaterials(clone, sourceRoot) {
        const meshes = [];
        clone.traverse(c => { if(c.isMesh) meshes.push(c); });
        for (const c of meshes) {
            const sourceNode = sourceRoot.getObjectByName(c.name) || sourceRoot;
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

  async applyMaterial(mesh, overrideName = null) {
      // Delegate to the specialized manager
      // Silencing noisy logs (optional refactor: pass a logLevel to manager)
      // For now, we rely on the manager not to spam if we don't want it,
      // but the user asked to clean up logs.
      await this.materialManager.applyMaterial(mesh, this.config, overrideName);
  }

  setScale(s) { this.scale = s; this.group.scale.setScalar(s); }
  setPose(pos, ang) {
    this.group.position.set(pos.x, this.scale * 1.0, pos.y);
    this.group.rotation.y = -ang;
    this.group.scale.setScalar(this.scale);
  }
  setSpeeds(l, r) { this.animatedInstances.forEach(t => { t.speed = (t.side === -1) ? l : r; }); }

  setPlowWidth(count) {
      if (this.plowParams.segmentCount !== count) {
          this.plowParams.segmentCount = count;
          this.updatePlow();
      }
  }

  setPlowWings(enabled, scale = 1.0) {
      if (this.plowParams.hasWings !== enabled || Math.abs(this.plowParams.wingScale - scale) > 0.001) {
          this.plowParams.hasWings = enabled;
          this.plowParams.wingScale = scale;
          this.updatePlow();
      }
  }

  setPlowTeeth(enabled) {
      if (this.plowParams.hasTeeth !== enabled) {
          this.plowParams.hasTeeth = enabled;
          this.updatePlow();
      }
  }

  updatePlow() {
      if (!this.plowParams.mesh) return;

      const count = Math.max(1, Math.min(50, this.plowParams.segmentCount));
      const width = this.plowParams.segmentWidth;
      const totalWidth = count * width;
      const startX = -totalWidth / 2 + width / 2;

      // Z-Offset to push plow forward relative to chassis center
      // Chassis is approx 40-60 deep. We need ~50 units offset?
      // Since renderer scale is 10.0, and units here are local to group.
      // 1 unit here = 10 units in world.
      // We need ~50 units world offset => 5.0 units local.
      // Trying -5.0 to be safe and clear the chassis completely.
      const zOffset = -20.0; // DEBUG: Extreme offset

      // DEBUG: Force Material
      if (!this.plowParams.mesh.userData.isDebugMaterial) {
          this.plowParams.mesh.material = new THREE.MeshBasicMaterial({ color: 0xff0000, depthTest: false, transparent: true, opacity: 0.8 });
          this.plowParams.mesh.userData.isDebugMaterial = true;
      }

      console.log(`!!! DEBUG: PLOW RENDER PARAMETERS !!!`, { count, totalWidth, zOffset, mesh: this.plowParams.mesh });

      this.dummy.scale.set(5, 5, 5); // DEBUG: Huge scale
      this.dummy.rotation.set(0, 0, 0);

      // Update Segments
      this.plowParams.mesh.count = count;
      this.plowParams.mesh.frustumCulled = false; // Fix visibility
      for (let i = 0; i < count; i++) {
          this.dummy.position.set(startX + i * width, 50, zOffset); // DEBUG: Y=50
          this.dummy.updateMatrix();
          this.plowParams.mesh.setMatrixAt(i, this.dummy.matrix);
      }
      this.plowParams.mesh.instanceMatrix.needsUpdate = true;

      // Update Teeth
      if (this.plowParams.teethMesh) {
          this.plowParams.teethMesh.frustumCulled = false;
          this.plowParams.teethMesh.count = this.plowParams.hasTeeth ? count : 0;
          this.plowParams.teethMesh.visible = this.plowParams.hasTeeth;
          if (this.plowParams.hasTeeth) {
             for (let i = 0; i < count; i++) {
                this.dummy.position.set(startX + i * width, 0, zOffset);
                this.dummy.updateMatrix();
                this.plowParams.teethMesh.setMatrixAt(i, this.dummy.matrix);
            }
            this.plowParams.teethMesh.instanceMatrix.needsUpdate = true;
          }
      }

      // Update Wings
      const wingOffset = totalWidth / 2;
      const wingScale = this.plowParams.wingScale || 1.0;

      if (this.plowParams.wingL) {
          this.plowParams.wingL.visible = this.plowParams.hasWings;
          this.plowParams.wingL.scale.setScalar(wingScale);
          this.plowParams.wingL.position.set(-wingOffset, 0, zOffset);
      }
      if (this.plowParams.wingR) {
          this.plowParams.wingR.visible = this.plowParams.hasWings;
          this.plowParams.wingR.scale.setScalar(wingScale);
          this.plowParams.wingR.position.set(wingOffset, 0, zOffset);
      }
  }

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