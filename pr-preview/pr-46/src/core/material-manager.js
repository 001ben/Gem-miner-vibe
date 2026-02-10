import * as THREE from 'three';
import { cb } from '../utils/graphics-utils.js';

export class MaterialManager {
    constructor() {
        this.texLoader = new THREE.TextureLoader();
        this.textureCache = new Map();

        // Define Code-based Material Presets
        this.materialPresets = {
            "Glass": new THREE.MeshPhysicalMaterial({
                name: "Glass",
                color: 0xaaccff, // Light blue tint
                metalness: 0.0,
                roughness: 0.05,
                transmission: 0.9,
                transparent: true,
                ior: 1.5,
                thickness: 0.5,
                side: THREE.DoubleSide
            }),
            "Track": new THREE.MeshStandardMaterial({
                name: "Track",
                color: 0xffffff,
                roughness: 0.9,
                metalness: 0.0
            }),
            "YellowMetallic": new THREE.MeshStandardMaterial({
                name: "YellowMetallic",
                color: 0xf39c12, // Industrial Orange-Yellow
                metalness: 0.7,
                roughness: 0.2
            })
        };
    }

    async applyMaterial(mesh, config, overrideName = null) {
        const name = mesh.name;
        const matName = mesh.material ? mesh.material.name : "";
        const matDampId = (mesh.material && mesh.material.userData) ? mesh.material.userData.damp_id : null;
        const meshDampId = mesh.userData.damp_id;
        const parentDampId = (mesh.parent && mesh.parent.userData) ? mesh.parent.userData.damp_id : null;

        const dampId = overrideName || matDampId || meshDampId || parentDampId;

        console.log(`[DEBUG] applyMaterial '${name}': damp_id='${dampId}' (mat='${matDampId}', mesh='${meshDampId}', parent='${parentDampId}')`);

        if (!dampId) {
            console.warn(`[CONTRACT WARNING] Mesh '${name}' has no damp_id tag.`);
            return;
        }

        const settings = (config && config.components) ? config.components[dampId] : null;
        if (!settings) {
            console.warn(`[CONTRACT WARNING] No config settings found for damp_id '${dampId}'`);
        } else {
            console.log(`[DEBUG] Found settings for '${dampId}':`, settings);
        }

        // 1. Determine Target Material Base
        const targetPresetName = settings?.preset || (dampId === "cabin" || matName.includes("Glass") ? "Glass" : (dampId === "track_link" || name.includes("Track") ? "Track" : null));

        let material;
        let isNewMaterial = false;

        // Reuse existing material if compatible
        if (mesh.material && ((targetPresetName && mesh.material.name === targetPresetName) || (!targetPresetName && !["Glass", "Track", "YellowMetallic"].includes(mesh.material.name)))) {
            material = mesh.material;
        } else {
            // Create new material base
            isNewMaterial = true;
            if (targetPresetName && this.materialPresets[targetPresetName]) {
                material = this.materialPresets[targetPresetName].clone();
            } else {
                material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, metalness: 0.2 });
            }
        }

        // 2. Apply Contract Settings
        if (settings) {
            if (settings.color) material.color.set(settings.color);
            if (settings.roughness !== undefined) material.roughness = settings.roughness;
            if (settings.metalness !== undefined) material.metalness = settings.metalness;
            if (settings.transmission !== undefined && material.isMeshPhysicalMaterial) material.transmission = settings.transmission;
            if (settings.ior !== undefined && material.isMeshPhysicalMaterial) material.ior = settings.ior;

            if (settings.textureId && settings.textureId !== 'None') {
                const texPath = settings.textureId.startsWith('http') ? settings.textureId : `assets/textures/${settings.textureId}`;
                const cacheKey = `${texPath}_${JSON.stringify(settings.uvTransform || {})}`;

                try {
                    let tex;
                    if (this.textureCache.has(cacheKey)) {
                        tex = this.textureCache.get(cacheKey);
                    } else {
                        tex = await this.texLoader.loadAsync(cb(texPath));
                        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
                        tex.colorSpace = THREE.SRGBColorSpace;
                        if (settings.uvTransform) {
                            const uv = settings.uvTransform;
                            if (uv.scale !== undefined) tex.repeat.set(uv.scale, uv.scale);
                            if (uv.rotation !== undefined) tex.rotation = uv.rotation;
                            if (uv.offset !== undefined) tex.offset.set(uv.offset[0], uv.offset[1]);
                            tex.center.set(0.5, 0.5);
                        }
                        this.textureCache.set(cacheKey, tex);
                    }

                    if (material.map !== tex) {
                        material.map = tex;
                        material.needsUpdate = true;
                    }
                } catch (e) {
                    console.error(`[CONTRACT ERROR] Failed texture: ${texPath}`, e);
                }
            } else {
                if (material.map) {
                    material.map = null;
                    material.needsUpdate = true;
                }
            }
        }

        // 3. Final Atomic Assignment
        if (isNewMaterial) {
            mesh.material = material;
        }
        if (mesh.isInstancedMesh) mesh.instanceMatrix.needsUpdate = true;
    }
}
