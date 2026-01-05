import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { html } from 'htm/react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { BulldozerRenderer } from 'bulldozer-render';
import { cb } from '../../../src/utils/graphics-utils.js';

// --- Components ---

const Slider = ({ label, min, max, step, value, onChange, unit = '' }) => html`
    <div className="slider-row">
        <label>${label}</label>
        <input type="range" min=${min} max=${max} step=${step} value=${value} onChange=${e => onChange(parseFloat(e.target.value))} />
        <span>${value}${unit}</span>
    </div>
`;

const ComponentAccordion = ({ name, data, textures, presets, materialPresets, onUpdate }) => {
    const [expanded, setExpanded] = useState(false);

    const update = (key, val) => {
        onUpdate(name, { ...data, [key]: val });
    };

    const updateUV = (key, val) => {
        const newUV = { ...(data.uvTransform || { scale: 1, rotation: 0, offset: [0,0] }), [key]: val };
        update('uvTransform', newUV);
    };

    const preset = (data.preset && materialPresets) ? materialPresets[data.preset] : null;
    
    // Effective values for UI (Preset -> Data -> Fallback)
    const effColor = data.color || (preset ? `#${preset.color.getHex().toString(16).padStart(6, '0')}` : '#ffffff');
    const effRoughness = data.roughness ?? (preset ? preset.roughness : 0.8);
    const effMetalness = data.metalness ?? (preset ? preset.metalness : 0.2);
    const effTransmission = data.transmission ?? (preset ? preset.transmission : 0);
    const effIOR = data.ior ?? (preset ? (preset.ior || 1.5) : 1.5);

    return html`
        <div className=${`component-item ${expanded ? 'expanded' : ''}`}>
            <div className="component-header" onClick=${() => setExpanded(!expanded)}>
                <span>${name}</span>
                <div style=${{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                    ${data.preset && html`<span className="preset-badge">${data.preset}</span>`}
                    <span className="tex-info">${data.textureId || 'None'}</span>
                </div>
            </div>
            ${expanded && html`
                <div className="component-content">
                    <label>Material Preset</label>
                    <select value=${data.preset || 'None'} onChange=${e => update('preset', e.target.value)}>
                        <option value="None">None (Standard)</option>
                        ${presets.map(p => html`<option key=${p} value=${p}>${p}</option>`)}
                    </select>

                    <label>Color</label>
                    <input type="color" value=${effColor} onChange=${e => update('color', e.target.value)} />
                    
                    <${Slider} label="Roughness" min=${0} max=${1} step=${0.01} value=${effRoughness} onChange=${v => update('roughness', v)} />
                    <${Slider} label="Metalness" min=${0} max=${1} step=${0.01} value=${effMetalness} onChange=${v => update('metalness', v)} />
                    <${Slider} label="Transmission" min=${0} max=${1} step=${0.01} value=${effTransmission} onChange=${v => update('transmission', v)} />
                    <${Slider} label="IOR" min=${1} max=${2.33} step=${0.01} value=${effIOR} onChange=${v => update('ior', v)} />

                    <label>Texture</label>
                    <select value=${data.textureId || 'None'} onChange=${e => update('textureId', e.target.value)}>
                        <option value="None">None</option>
                        ${textures.map(t => html`<option key=${t} value=${t}>${t}</option>`)}
                    </select>

                    <${Slider} label="Scale" min=${0.1} max=${20} step=${0.1} value=${data.uvTransform?.scale ?? 1.0} onChange=${v => updateUV('scale', v)} />
                    <${Slider} label="Rotation" min=${0} max=${360} step=${1} value=${Math.round((data.uvTransform?.rotation ?? 0) * (180/Math.PI))} unit="°" 
                            onChange=${v => updateUV('rotation', v * (Math.PI/180))} />
                    <${Slider} label="Offset X" min=${-2} max=${2} step=${0.01} value=${data.uvTransform?.offset?.[0] ?? 0} onChange=${v => updateUV('offset', [v, data.uvTransform?.offset?.[1] ?? 0])} />
                    <${Slider} label="Offset Y" min=${-2} max=${2} step=${0.01} value=${data.uvTransform?.offset?.[1] ?? 0} onChange=${v => updateUV('offset', [data.uvTransform?.offset?.[0] ?? 0, v])} />
                </div>
            `}
        </div>
    `;
};

const App = () => {
    const [catalog, setCatalog] = useState({ models: [], textures: [], configs: [] });
    const [presets, setPresets] = useState([]);
    const [materialPresets, setMaterialPresets] = useState(null);
    const [assetId, setAssetId] = useState('bulldozer_components.glb');
    const [configId, setConfigId] = useState('bulldozer_mapping.json');
    const [config, setConfig] = useState(null);
    const [bg, setBg] = useState('#aaccff');
    const [lightRot, setLightRot] = useState(45);
    const [animSpeed, setAnimSpeed] = useState(0.02);
    const [collapsed, setCollapsed] = useState(false);

    const sceneRef = useRef(null);
    const dirLightRef = useRef(null);
    const dozerRef = useRef(null);

    // 1. Initialize Three.js (Run once)
    useEffect(() => {
        const container = document.getElementById('canvas-container');
        if (!container) return;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(bg);
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(30, 25, 30);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(renderer.domElement);

        // Environment Map (for realistic reflections)
        const pmremGenerator = new THREE.PMREMGenerator(renderer);
        scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;

        scene.add(new THREE.AmbientLight(0xffffff, 0.5));
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.set(2048, 2048);
        dirLight.shadow.bias = -0.0005;
        dirLight.shadow.normalBias = 0.05;
        scene.add(dirLight);
        dirLightRef.current = dirLight;

        const clock = new THREE.Clock();
        const animate = () => {
            requestAnimationFrame(animate);
            if (dozerRef.current) dozerRef.current.update(clock.getDelta());
            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        window.onresize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };

        // Fetch Catalog
        fetch(cb('assets/catalog.json'))
            .then(r => r.json())
            .then(data => {
                setCatalog(data);
            });
    }, []);

    // 2. Sync Light Position
    useEffect(() => {
        if (!dirLightRef.current) return;
        const angle = lightRot * (Math.PI / 180);
        const radius = 80;
        dirLightRef.current.position.set(Math.sin(angle) * radius, 100, Math.cos(angle) * radius);
        dirLightRef.current.lookAt(0, 0, 0);
    }, [lightRot]);

    // 3. Sync Background Color
    useEffect(() => {
        if (sceneRef.current) sceneRef.current.background.set(bg);
    }, [bg]);

    // 4. Load/Reload Model and Config
    useEffect(() => {
        const load = async () => {
            if (!sceneRef.current) return;
            if (dozerRef.current) dozerRef.current.destroy();
            
            const dozer = new BulldozerRenderer(sceneRef.current);
            dozer.setScale(5.0);
            dozerRef.current = dozer;

            // Discover available presets from renderer
            setPresets(Object.keys(dozer.materialPresets));
            setMaterialPresets(dozer.materialPresets);

            let conf = { components: {} };
            if (configId !== 'None') {
                try {
                    const resp = await fetch(cb(`assets/configs/${configId}`));
                    conf = await resp.json();
                } catch(e) { console.error("Config fetch failed", e); }
            }
            
            await dozer.load(cb(`assets/${assetId}`), conf);
            
            // Auto-discover Contract IDs
            dozer.group.traverse(obj => {
                const id = obj.userData.damp_id || (obj.material?.userData?.damp_id);
                if (id && !conf.components[id]) {
                    conf.components[id] = { color: '#ffffff', roughness: 0.8, metalness: 0.2, textureId: 'None', uvTransform: { scale: 1, rotation: 0, offset: [0,0] }};
                }
            });

            setConfig(conf);
            dozer.setSpeeds(animSpeed, animSpeed);
        };
        load();
    }, [assetId, configId]);

    const onComponentUpdate = (id, data) => {
        // Clean up data if preset is 'None'
        if (data.preset === 'None') delete data.preset;

        const newConfig = { ...config, components: { ...config.components, [id]: data } };
        setConfig(newConfig);
        if (dozerRef.current) {
            dozerRef.current.config = newConfig;
            dozerRef.current.group.traverse(obj => {
                const objId = obj.userData.damp_id || (obj.material?.userData?.damp_id);
                if (objId === id) dozerRef.current.applyMaterial(obj);
            });
        }
    };

    const copyConfig = () => {
        navigator.clipboard.writeText(JSON.stringify(config, null, 2));
        alert("Config copied to clipboard!");
    };

    return html`
        <div className="director-ui-wrapper">
            <!-- Navigation -->
            <div style=${{ position: 'absolute', top: '10px', right: '50px', zIndex: 1000, pointerEvents: 'auto', background: 'rgba(0,0,0,0.6)', padding: '5px 10px', borderRadius: '20px', fontSize: '0.9rem', border: '1px solid #555' }}>
                <a href="../../" style=${{ color: '#fff', textDecoration: 'none', marginRight: '10px', fontWeight: 'bold' }}>Game</a>
                <a href="../../docs/" style=${{ color: '#fff', textDecoration: 'none', fontWeight: 'bold' }}>Docs</a>
            </div>

            <button id="ui-toggle" style=${{ right: collapsed ? '10px' : '310px' }} onClick=${() => setCollapsed(!collapsed)}>☰</button>
            <div id="ui-container" className=${collapsed ? 'collapsed' : ''}>
                <div className="panel-header">DAMP Asset Director</div>
                <div className="scroll-content">
                    <div className="control-group">
                        <label>VIEWER BACKGROUND</label>
                        <input type="color" value=${bg} onChange=${e => setBg(e.target.value)} />
                        <label>LIGHT ROTATION</label>
                        <${Slider} min=${0} max=${360} step=${1} value=${lightRot} onChange=${setLightRot} unit="°" />
                    </div>

                    <div className="control-group">
                        <label>MODEL (.glb)</label>
                        <select value=${assetId} onChange=${e => setAssetId(e.target.value)}>
                            ${catalog.models.map(m => html`<option key=${m} value=${m}>${m}</option>`)}
                        </select>
                        <label>MAPPING (.json)</label>
                        <select value=${configId} onChange=${e => setConfigId(e.target.value)}>
                            <option value="None">None</option>
                            ${catalog.configs.map(c => html`<option key=${c} value=${c}>${c}</option>`)}
                        </select>
                    </div>

                    <label>COMPONENTS</label>
                    <div id="component-list">
                        ${config && Object.keys(config.components).sort().map(id => html`
                            <${ComponentAccordion} 
                                key=${id} 
                                name=${id} 
                                data=${config.components[id]} 
                                textures=${catalog.textures}
                                presets=${presets}
                                materialPresets=${materialPresets}
                                onUpdate=${onComponentUpdate} 
                            />
                        `)}
                    </div>

                    <div className="control-group" style=${{ marginTop: '20px' }}>
                        <label>ANIMATION</label>
                        <${Slider} label="Track Speed" min=${-0.5} max=${0.5} step=${0.01} value=${animSpeed} 
                                onChange=${v => { setAnimSpeed(v); dozerRef.current?.setSpeeds(v, v); }} />
                    </div>
                </div>
                <div className="actions">
                    <button className="action-btn" onClick=${copyConfig}>Copy Config JSON</button>
                </div>
            </div>
        </div>
    `;
};

const root = createRoot(document.getElementById('ui-root'));
root.render(html`<${App} />`);
