import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

// --- State Management ---
const state = {
    assetId: null,
    textureId: null,
    material: {
        color: '#ffffff',
        roughness: 0.5,
        metalness: 0.0
    },
    transform: {
        scale: 1.0,
        rotation: 0,
        offsetX: 0.0,
        offsetY: 0.0
    }
};

// --- Scene Setup ---
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x222222);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(3, 2, 3);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
// Updated to modern color space API
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(5, 10, 7.5);
scene.add(dirLight);

// Environment (Optional, for reflections)
// new RGBELoader().load('path/to/hdr', (texture) => { ... });

// --- Asset Logic ---
const gltfLoader = new GLTFLoader();
const texLoader = new THREE.TextureLoader();

let currentMesh = null;
let currentTexture = null;

async function loadCatalog() {
    try {
        const resp = await fetch('assets/catalog.json');
        const catalog = await resp.json();
        populateUI(catalog);
    } catch (e) {
        console.error("Failed to load catalog:", e);
    }
}

async function loadModel(filename) {
    if (!filename) return;
    state.assetId = filename;

    // Clear old model
    if (currentMesh) {
        scene.remove(currentMesh);
        currentMesh = null;
    }

    try {
        const gltf = await gltfLoader.loadAsync(`assets/${filename}`);
        const model = gltf.scene;

        // Find the main mesh (assume single mesh or join logic needed)
        // For simplicity, apply material to all meshes
        model.traverse((child) => {
            if (child.isMesh) {
                // Apply a standard material we can control
                child.material = new THREE.MeshStandardMaterial({
                    color: state.material.color,
                    roughness: state.material.roughness,
                    metalness: state.material.metalness
                });

                // If we have a texture loaded, apply it
                if (currentTexture) {
                    child.material.map = currentTexture;
                    child.material.needsUpdate = true;
                }
            }
        });

        // Center model
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);

        scene.add(model);
        currentMesh = model;
        updateMaterial(); // Re-apply current state
    } catch (e) {
        console.error("Failed to load model:", e);
    }
}

async function loadTexture(filename) {
    if (!filename || filename === 'None') {
        state.textureId = null;
        currentTexture = null;
        updateMaterial();
        return;
    }

    state.textureId = filename;
    try {
        const tex = await texLoader.loadAsync(`assets/textures/${filename}`);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        // Updated to modern color space API
        tex.colorSpace = THREE.SRGBColorSpace;
        currentTexture = tex;
        updateMaterial();
    } catch (e) {
        console.error("Failed to load texture:", e);
    }
}

function updateMaterial() {
    if (!currentMesh) return;

    currentMesh.traverse((child) => {
        if (child.isMesh && child.material) {
            const m = child.material;
            m.color.set(state.material.color);
            m.roughness = state.material.roughness;
            m.metalness = state.material.metalness;

            if (currentTexture) {
                m.map = currentTexture;

                // Texture Transform
                // Center rotation (0.5, 0.5)
                m.map.center.set(0.5, 0.5);
                m.map.repeat.set(state.transform.scale, state.transform.scale);
                m.map.rotation = state.transform.rotation * (Math.PI / 180);
                m.map.offset.set(state.transform.offsetX, state.transform.offsetY);

                m.needsUpdate = true;
            } else {
                m.map = null;
                m.needsUpdate = true;
            }
        }
    });
}

// --- UI Binding ---
function populateUI(catalog) {
    const assetSel = document.getElementById('asset-select');
    assetSel.innerHTML = '';
    catalog.models.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = m;
        assetSel.appendChild(opt);
    });

    if(catalog.models.length > 0) loadModel(catalog.models[0]);

    assetSel.addEventListener('change', (e) => loadModel(e.target.value));

    const texSel = document.getElementById('texture-select');
    texSel.innerHTML = '<option value="None">None</option>';
    catalog.textures.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t;
        texSel.appendChild(opt);
    });

    texSel.addEventListener('change', (e) => loadTexture(e.target.value));
}

// Sliders
function bindSlider(id, stateKey, subKey, unit = '') {
    const el = document.getElementById(id);
    const valEl = document.getElementById('val-' + id.replace('mat-', '').replace('tex-', '')); // simple helper

    el.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (stateKey === 'material') {
            state.material[subKey] = val;
        } else if (stateKey === 'transform') {
            state.transform[subKey] = val;
        }
        if (valEl) valEl.textContent = val + unit;
        updateMaterial();
    });
}

bindSlider('mat-roughness', 'material', 'roughness');
bindSlider('mat-metalness', 'material', 'metalness');
bindSlider('tex-scale', 'transform', 'scale');
bindSlider('tex-rotation', 'transform', 'rotation', '°');
bindSlider('tex-offset-x', 'transform', 'offsetX');
bindSlider('tex-offset-y', 'transform', 'offsetY');

document.getElementById('mat-color').addEventListener('input', (e) => {
    state.material.color = e.target.value;
    updateMaterial();
});

// UI Toggle
const uiContainer = document.getElementById('ui-container');
const uiToggle = document.getElementById('ui-toggle');
uiToggle.addEventListener('click', () => {
    uiContainer.classList.toggle('collapsed');
    uiToggle.style.right = uiContainer.classList.contains('collapsed') ? '10px' : '310px';
});


// --- Export ---
document.getElementById('btn-copy').addEventListener('click', () => {
    const exportData = {
        schemaVersion: "1.0",
        assetId: state.assetId,
        material: {
            textureId: state.textureId,
            color: state.material.color,
            roughness: state.material.roughness,
            metalness: state.material.metalness
        },
        uvTransform: {
            scale: state.transform.scale,
            rotation: state.transform.rotation * (Math.PI / 180), // Spec says radians
            offset: [state.transform.offsetX, state.transform.offsetY]
        }
    };

    const json = JSON.stringify(exportData, null, 2);
    console.log("Config Export:", json);
    navigator.clipboard.writeText(json).then(() => {
        const btn = document.getElementById('btn-copy');
        const oldText = btn.textContent;
        btn.textContent = "Copied to Clipboard!";
        setTimeout(() => btn.textContent = oldText, 2000);
    });
});

document.getElementById('btn-reset').addEventListener('click', () => {
   // Implementation optional for now
   console.log("Reset clicked");
});


// --- Loop ---
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Init
loadCatalog();
animate();
