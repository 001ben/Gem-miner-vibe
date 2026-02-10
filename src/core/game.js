import { engine, runner, Runner, Events, Body, Matter, Vector } from './physics.js';
import { initThree, updateGraphics, scene, camera, renderer, bodyMeshMap } from './graphics.js';
import * as THREE from 'three'; 
import { createMap } from '../entities/map.js';
import { createBulldozer, getBulldozer } from '../entities/bulldozer.js';
import { createCollector } from '../entities/collector.js';
import { initGems, collectGem } from '../entities/gem.js';
import { updateUI, initUI, showNotification, updateSpeedometer } from './ui.js';
import { createShopPads, checkShopCollisions } from '../entities/shop.js';
import { initInput } from './input.js';
import { initConsole } from './console.js';
import { BulldozerRenderer } from '../entities/bulldozer_render.js';
import { initConveyorSystem } from '../entities/conveyor.js';
import { state } from './state.js';

// Expose updateUI and showNotification
window.updateUI = updateUI;
window.showNotification = showNotification;

initConsole();
initConveyorSystem();

let lastAfterUpdateTime = 0;

// Check collisions
Events.on(engine, 'afterUpdate', () => {
    checkShopCollisions(getBulldozer());
    
    // Telemetry updates
    const dozer = getBulldozer();
    if (dozer) {
        if (state.session.lastPosition.x !== 0 || state.session.lastPosition.y !== 0) {
            const dist = Vector.magnitude(Vector.sub(dozer.position, state.session.lastPosition));
            state.session.distanceTraveled += dist;
        }
        state.session.lastPosition.x = dozer.position.x;
        state.session.lastPosition.y = dozer.position.y;
    }
});

Events.on(engine, 'collisionStart', (event) => {
    event.pairs.forEach(pair => {
        if (pair.bodyA.label === 'bulldozer' || pair.bodyB.label === 'bulldozer') {
            state.session.collisionCount++;
        }
    });
});

// Start
initThree();

// Initialize custom renderers
let bulldozerRenderer = new BulldozerRenderer(scene);
loadBulldozerAssets();

function loadBulldozerAssets() {
    bulldozerRenderer.load('assets/models/bulldozer_components.glb', 'assets/configs/bulldozer_mapping.json')
    .then(() => {
        return bulldozerRenderer.loadPlow('assets/models/plow.glb', 'assets/configs/plow_mapping.json');
    })
    .catch(err => {
        const msg = (err && err.message) ? err.message : err;
        console.warn('Failed to load bulldozer assets:', msg);
    });
}

export function rebuildBulldozerRenderer() {
    if (bulldozerRenderer) {
        bulldozerRenderer.destroy();
    }
    bulldozerRenderer = new BulldozerRenderer(scene);
    loadBulldozerAssets();
}

createMap();
createBulldozer();
createCollector();
createShopPads(); 
initGems();

initUI(); 
updateUI();
initInput(); 
window.state = state; 

// Performance Monitoring
let frameCount = 0;
let lastFpsTime = performance.now();
const fpsEl = document.getElementById('fps-counter');

// Debug Position Button
document.getElementById('btn-debug-pos')?.addEventListener('click', () => {
    const dozer = getBulldozer();
    if (!dozer) return;

    const plowPart = dozer.parts.find(p => p.label === 'plow');
    if (!plowPart) {
        console.log("Plow part not found in physics body.");
        return;
    }

    console.log("=== PLOW DEBUG ===");
    const pMin = plowPart.bounds.min;
    const pMax = plowPart.bounds.max;
    console.log(`Physics Box: [${pMin.x.toFixed(1)}, ${pMin.y.toFixed(1)}] to [${pMax.x.toFixed(1)}, ${pMax.y.toFixed(1)}]`);
    console.log(`Physics Pos: x=${plowPart.position.x.toFixed(1)}, y=${plowPart.position.y.toFixed(1)}, angle=${plowPart.angle.toFixed(2)}`);
    
    plowPart.vertices.forEach((v, i) => {
        console.log(` - V${i}: x=${v.x.toFixed(1)}, y=${v.y.toFixed(1)}`);
    });

    const plowMesh = bodyMeshMap.get(plowPart.id);
    if (plowMesh) {
        const box = new THREE.Box3().setFromObject(plowMesh);
        console.log(`Visual Box:  [${box.min.x.toFixed(1)}, ${box.min.z.toFixed(1)}] to [${box.max.x.toFixed(1)}, ${box.max.z.toFixed(1)}]`);
        console.log(`Visual Pos:  x=${plowMesh.position.x.toFixed(1)}, z=${plowMesh.position.z.toFixed(1)}`);
        
        const dX = Math.abs(plowMesh.position.x - plowPart.position.x);
        const dY = Math.abs(plowMesh.position.z - plowPart.position.y);
        console.log(`DELTA Center: x=${dX.toFixed(2)}, y=${dY.toFixed(2)}`);
    } else {
        console.log("Visual Plow Mesh not found in bodyMeshMap.");
    }
    console.log("==================");
});

// Fixed Timestep Configuration
const timeStep = 1000 / 60; // 16.66ms
let accumulator = 0;
let lastTime = performance.now();
const frameInterval = 1000 / 60; // 60 FPS cap
let lastFrameTime = 0;

function animate(currentTime = performance.now()) {
    requestAnimationFrame(animate);
    
    // FPS Capping
    const deltaTime = currentTime - lastFrameTime;
    if (deltaTime < frameInterval) {
        return;
    }
    // Adjust lastFrameTime to handle drift
    lastFrameTime = currentTime - (deltaTime % frameInterval);

    const frameTime = currentTime - lastTime;
    lastTime = currentTime;
    
    // Cap frameTime to prevent spiral of death on lag spikes
    accumulator += Math.min(frameTime, 100); 

    // Consume accumulator in fixed chunks
    while (accumulator >= timeStep) {
        Matter.Engine.update(engine, timeStep);
        accumulator -= timeStep;
        state.session.frameCounter++;
    }

    const alpha = accumulator / timeStep;
    const dozer = getBulldozer();
    
    updateGraphics(dozer, bulldozerRenderer, alpha);

    if (dozer) {
        updateSpeedometer(dozer.speed);
    }
    
    // FPS Calculation
    frameCount++;
    const now = performance.now();
    if (now - lastFpsTime >= 1000) {
        if (fpsEl) {
            fpsEl.innerText = `FPS: ${frameCount}`;
            fpsEl.style.color = frameCount < 30 ? '#ff0000' : (frameCount < 55 ? '#ffff00' : '#00ff00');
        }
        frameCount = 0;
        lastFpsTime = now;
    }

    window.bulldozer = dozer; 
    window.camera = camera; 
    window.bodyMeshMap = bodyMeshMap; 
}
animate();

// Telemetry API
window.telemetry = {
    getMetrics: () => {
        const now = Date.now();
        const durationSeconds = (now - state.session.startTime) / 1000;
        return {
            money: state.money,
            gemCollectionCount: state.session.gemCollectionCount,
            collisionCount: state.session.collisionCount,
            distanceTraveled: Math.floor(state.session.distanceTraveled),
            averageSpeed: durationSeconds > 0 ? (state.session.distanceTraveled / durationSeconds).toFixed(2) : 0,
            durationSeconds: Math.floor(durationSeconds),
            frameCounter: state.session.frameCounter,
            collectionLog: state.session.collectionLog
        };
    },
    getSensors: () => {
        const dozer = getBulldozer();
        if (!dozer) return null;

        // Get all gems
        const gems = Matter.Composite.allBodies(engine.world).filter(b => b.label === 'gem');
        
        // Fix: Collector is a compound body, look for parts or the compound label
        const allBodies = Matter.Composite.allBodies(engine.world);
        const collector = allBodies.find(b => b.label === 'collector') || 
                          allBodies.find(b => b.label === 'collector_compound');

        const sensors = {
            nearestGems: gems
                .map(g => {
                    const diff = Vector.sub(g.position, dozer.position);
                    return {
                        distance: Vector.magnitude(diff),
                        vector: { x: diff.x, y: diff.y },
                        value: g.value
                    };
                })
                .sort((a, b) => a.distance - b.distance)
                .slice(0, 5),
            collector: null
        };

        if (collector) {
            const diff = Vector.sub(collector.position, dozer.position);
            sensors.collector = {
                distance: Vector.magnitude(diff),
                vector: { x: diff.x, y: diff.y }
            };
        }

        return sensors;
    }
};

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});