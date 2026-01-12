import { engine, runner, Runner, Events, Body, Matter } from './physics.js';
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
});

// Start
initThree();

// Initialize custom renderers
let bulldozerRenderer = new BulldozerRenderer(scene);
loadBulldozerAssets();

function loadBulldozerAssets() {
    bulldozerRenderer.load('assets/models/bulldozer_components.glb', 'assets/configs/bulldozer_mapping.json').catch(err => {
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

function animate(currentTime = performance.now()) {
    const frameStartTime = performance.now();
    requestAnimationFrame(animate);
    
    const frameTime = currentTime - lastTime;
    lastTime = currentTime;
    
    // Cap frameTime to prevent spiral of death on lag spikes
    accumulator += Math.min(frameTime, 100); 

    // Consume accumulator in fixed chunks
    while (accumulator >= timeStep) {
        Matter.Engine.update(engine, timeStep);
        accumulator -= timeStep;
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

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});