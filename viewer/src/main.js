import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { BulldozerRenderer } from 'bulldozer-render';

// --- State Management ---
const state = {
    assetId: 'bulldozer_components.glb',
    configId: 'bulldozer_mapping.json',
    config: null,
    catalog: null,
    animationSpeed: 0.2
};

// --- Scene Setup ---
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xaaccff);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(12, 10, 12);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Lighting
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(10, 20, 15);
dirLight.castShadow = true;
scene.add(dirLight);

// --- Asset Logic ---
let bulldozerRenderer = null;
const clock = new THREE.Clock();

async function loadCatalog() {
    try {
        console.log("[DEBUG] Loading catalog...");
        const cb = (u) => `${u}?cb=${Date.now()}`;
        const resp = await fetch(cb('assets/catalog.json'));
        state.catalog = await resp.json();
        console.log("[DEBUG] Catalog loaded:", state.catalog);
        renderGlobalUI();
        await reloadBulldozer();
    } catch (e) {
        console.error("Failed to load catalog:", e);
    }
}

async function reloadBulldozer() {
    console.log(`[DEBUG] reloadBulldozer: ${state.assetId} | config: ${state.configId}`);
    if (bulldozerRenderer) bulldozerRenderer.destroy();
    
    bulldozerRenderer = new BulldozerRenderer(scene);
    bulldozerRenderer.setScale(5.0); 

    try {
        const cb = (u) => `${u}?cb=${Date.now()}`;
        if (state.configId !== 'None') {
            const configPath = `assets/configs/${state.configId}`;
            console.log(`[DEBUG] Fetching config: ${configPath}`);
            const resp = await fetch(cb(configPath));
            state.config = await resp.json();
        } else {
            state.config = { components: {} };
        }

        const modelPath = `assets/${state.assetId}`;
        console.log(`[DEBUG] Loading model: ${modelPath}`);
        await bulldozerRenderer.load(cb(modelPath), state.config);
        
        discoverComponents();
        renderComponentUI();
        controls.target.set(0, 0, 0);
    } catch (e) {
        console.error("❌ Failed to load bulldozer:", e);
    }
}

function discoverComponents() {
    if (!bulldozerRenderer || !state.config) return;
    
    const foundNames = [];
    bulldozerRenderer.group.traverse(obj => {
        if (obj.isMesh || obj.isInstancedMesh) {
            const name = obj.name;
            const matName = obj.material ? obj.material.name : "";
            
            // SKIP discovery for generic names that the renderer already maps to main components
            if (name.includes("Cube") || name.includes("Wheel")) {
                if (matName.includes("Yellow") || matName.includes("Glass") || matName.includes("Metal") || matName === "") {
                    return; // Skip generic sub-mesh
                }
            }

            if (name && !state.config.components[name]) {
                console.log(`[DEBUG] Discovered component: ${name}`);
                state.config.components[name] = {
                    color: '#ffffff',
                    roughness: 0.8, metalness: 0.2,
                    textureId: 'None',
                    uvTransform: { scale: 1, rotation: 0, offset: [0, 0] }
                };
            } else if (name && state.config.components[name] && !state.config.components[name].uvTransform) {
                state.config.components[name].uvTransform = { scale: 1, rotation: 0, offset: [0, 0] };
            }
            if (name) foundNames.push(name);
        }
    });
    console.log("[DEBUG] Components identified for UI:", foundNames);
}

function renderGlobalUI() {
    const scrollContent = document.querySelector('.scroll-content');
    if (!scrollContent) return;
    scrollContent.innerHTML = '';

    // 0. Scene Controls
    const sceneGroup = document.createElement('div');
    sceneGroup.className = 'control-group';
    sceneGroup.innerHTML = `
        <label>VIEWER BACKGROUND</label>
        <div class="slider-row">
            <input type="color" id="bg-color" value="#aaccff">
        </div>
    `;
    scrollContent.appendChild(sceneGroup);
    document.getElementById('bg-color').addEventListener('input', (e) => {
        scene.background.set(e.target.value);
    });

    // 1. Asset & Config Selection
    const assetGroup = document.createElement('div');
    assetGroup.className = 'control-group';
    assetGroup.innerHTML = `
        <label>MODEL (.glb)</label>
        <select id="asset-select"></select>
        <label>MAPPING (.json)</label>
        <select id="config-select"></select>
    `;
    scrollContent.appendChild(assetGroup);

    const assetSel = document.getElementById('asset-select');
    state.catalog.models.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m; opt.textContent = m;
        if (m === state.assetId) opt.selected = true;
        assetSel.appendChild(opt);
    });
    assetSel.addEventListener('change', (e) => { state.assetId = e.target.value; reloadBulldozer(); });

    const configSel = document.getElementById('config-select');
    configSel.innerHTML = '<option value="None">None</option>';
    state.catalog.configs.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c; opt.textContent = c;
        if (c === state.configId) opt.selected = true;
        configSel.appendChild(opt);
    });
    configSel.addEventListener('change', (e) => { state.configId = e.target.value; reloadBulldozer(); });

    // Component List Container
    const compListHeader = document.createElement('label');
    compListHeader.textContent = 'COMPONENTS';
    compListHeader.style.marginTop = '15px';
    scrollContent.appendChild(compListHeader);

    const compList = document.createElement('div');
    compList.id = 'component-list';
    scrollContent.appendChild(compList);

    // Track Alignment Controls
    const alignGroup = document.createElement('div');
    alignGroup.className = 'control-group';
    alignGroup.style.marginTop = '20px';
    alignGroup.innerHTML = `
        <label>TRACK ALIGNMENT</label>
        <div class="slider-row">
            <label>Vertical</label>
            <input type="range" id="track-vert" min="-2" max="2" step="0.01" value="-0.53">
            <span id="val-track-vert">-0.53</span>
        </div>
        <div class="slider-row">
            <label>Spread</label>
            <input type="range" id="track-spread" min="-2" max="2" step="0.01" value="0.15">
            <span id="val-track-spread">0.15</span>
        </div>
    `;
    scrollContent.appendChild(alignGroup);

    document.getElementById('track-vert').addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        document.getElementById('val-track-vert').textContent = val;
        if (bulldozerRenderer) bulldozerRenderer.trackParams.verticalOffset = val;
    });

    document.getElementById('track-spread').addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        document.getElementById('val-track-spread').textContent = val;
        if (bulldozerRenderer) bulldozerRenderer.trackParams.spread = val;
    });

    // Animation Speed
    const animGroup = document.createElement('div');
    animGroup.className = 'control-group';
    animGroup.style.marginTop = '20px';
    animGroup.innerHTML = `
        <label>ANIMATION</label>
        <div class="slider-row">
            <label>Track Speed</label>
            <input type="range" id="anim-speed" min="-0.5" max="0.5" step="0.01" value="${state.animationSpeed}">
            <span id="val-anim-speed">${state.animationSpeed}</span>
        </div>
    `;
    scrollContent.appendChild(animGroup);

    document.getElementById('anim-speed').addEventListener('input', (e) => {
        state.animationSpeed = parseFloat(e.target.value);
        document.getElementById('val-anim-speed').textContent = e.target.value;
        if (bulldozerRenderer) bulldozerRenderer.setSpeeds(state.animationSpeed, state.animationSpeed);
    });
}

function renderComponentUI() {
    const compList = document.getElementById('component-list');
    if (!compList) return;
    compList.innerHTML = '';

    const components = Object.keys(state.config.components).sort();
    components.forEach(name => {
        const comp = state.config.components[name];
        const item = document.createElement('div');
        item.className = 'component-item';
        
        const header = document.createElement('div');
        header.className = 'component-header';
        header.innerHTML = `
            <span>${name}</span>
            <span class="tex-info">${comp.textureId || 'None'}</span>
        `;
        item.appendChild(header);

        const content = document.createElement('div');
        content.className = 'component-content';
        
        content.innerHTML = `
            <label>Color</label>
            <input type="color" class="comp-color" value="${comp.color || '#ffffff'}">
            <div class="slider-row">
                <label>Roughness</label>
                <input type="range" class="comp-roughness" min="0" max="1" step="0.01" value="${comp.roughness ?? 0.8}">
            </div>
            <div class="slider-row">
                <label>Metalness</label>
                <input type="range" class="comp-metalness" min="0" max="1" step="0.01" value="${comp.metalness ?? 0.2}">
            </div>
            <div class="slider-row">
                <label>Transmission</label>
                <input type="range" class="comp-trans" min="0" max="1" step="0.01" value="${comp.transmission ?? 0}">
            </div>
            <div class="slider-row">
                <label>IOR</label>
                <input type="range" class="comp-ior" min="1" max="2.33" step="0.01" value="${comp.ior ?? 1.5}">
            </div>
            <label>Texture</label>
            <select class="comp-tex-select">
                <option value="None">None</option>
                ${state.catalog.textures.map(t => `<option value="${t}" ${comp.textureId === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select>
            <div class="slider-row">
                <label>Scale</label>
                <input type="range" class="comp-tex-scale" min="0.1" max="20" step="0.1" value="${comp.uvTransform?.scale ?? 1.0}">
            </div>
            <div class="slider-row">
                <label>Rotation</label>
                <input type="range" class="comp-tex-rot" min="0" max="360" step="1" value="${Math.round((comp.uvTransform?.rotation ?? 0) * (180/Math.PI))}">
            </div>
            <div class="slider-row">
                <label>Offset X</label>
                <input type="range" class="comp-tex-offx" min="-2" max="2" step="0.01" value="${comp.uvTransform?.offset[0] ?? 0}">
            </div>
            <div class="slider-row">
                <label>Offset Y</label>
                <input type="range" class="comp-tex-offy" min="-2" max="2" step="0.01" value="${comp.uvTransform?.offset[1] ?? 0}">
            </div>
        `;

        item.appendChild(content);
        compList.appendChild(item);

        header.onclick = () => {
            const isExpanded = item.classList.contains('expanded');
            document.querySelectorAll('.component-item').forEach(i => i.classList.remove('expanded'));
            if (!isExpanded) item.classList.add('expanded');
        };

        const updateComp = async () => {
            comp.color = content.querySelector('.comp-color').value;
            comp.roughness = parseFloat(content.querySelector('.comp-roughness').value);
            comp.metalness = parseFloat(content.querySelector('.comp-metalness').value);
            comp.transmission = parseFloat(content.querySelector('.comp-trans').value);
            comp.ior = parseFloat(content.querySelector('.comp-ior').value);
            comp.textureId = content.querySelector('.comp-tex-select').value;
            header.querySelector('.tex-info').textContent = comp.textureId;

            if (!comp.uvTransform) comp.uvTransform = { scale: 1, rotation: 0, offset: [0,0] };
            comp.uvTransform.scale = parseFloat(content.querySelector('.comp-tex-scale').value);
            comp.uvTransform.rotation = parseFloat(content.querySelector('.comp-tex-rot').value) * (Math.PI/180);
            comp.uvTransform.offset = [
                parseFloat(content.querySelector('.comp-tex-offx').value),
                parseFloat(content.querySelector('.comp-tex-offy').value)
            ];

            const mesh = bulldozerRenderer.group.getObjectByName(name) || 
                         (name.includes("Track") ? bulldozerRenderer.animatedInstances.find(t => t.mesh.name === name)?.mesh : null);
            if (mesh) await bulldozerRenderer.applyMaterial(mesh);
        };

        content.querySelectorAll('input, select').forEach(el => el.addEventListener('input', updateComp));
    });
}

// UI Toggles & Export
document.getElementById('ui-toggle').onclick = () => {
    const container = document.getElementById('ui-container');
    container.classList.toggle('collapsed');
    document.getElementById('ui-toggle').style.right = container.classList.contains('collapsed') ? '10px' : '310px';
};

document.getElementById('btn-copy').onclick = () => {
    navigator.clipboard.writeText(JSON.stringify(state.config, null, 2)).then(() => {
        const btn = document.getElementById('btn-copy');
        btn.textContent = "Copied!";
        setTimeout(() => btn.textContent = "Copy Config JSON", 2000);
    });
};

// --- Loop ---
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    if (bulldozerRenderer) bulldozerRenderer.update(delta);
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