import { engine, runner, Runner, Events, Body, Matter } from './physics.js';
import { initThree, updateGraphics, scene, camera, renderer, bodyMeshMap } from './graphics.js';
import { createMap } from './entities/map.js';
import { createBulldozer, getBulldozer, enforceBulldozerRigidity } from './entities/bulldozer.js';
import { createCollector } from './entities/collector.js';
import { initGems, collectGem } from './entities/gem.js';
import { updateUI, initUI, showNotification } from './ui.js';
import { createShopPads, checkShopCollisions } from './entities/shop.js';
import { initInput } from './input.js';
import { initConsole } from './console.js';
import { BulldozerRenderer } from './entities/bulldozer_render.js';
import { initConveyorSystem } from './entities/conveyor.js';

// Expose updateUI and showNotification
window.updateUI = updateUI;
window.showNotification = showNotification;
import { state } from './state.js'; // Import state to expose it

initConsole();
initConveyorSystem();

// Force dozer rigidity before physics update
Events.on(engine, 'beforeUpdate', () => {
    enforceBulldozerRigidity();
    checkShopCollisions(getBulldozer());
});


// Start
initThree();

// Initialize custom renderers
let bulldozerRenderer = new BulldozerRenderer(scene);
loadBulldozerAssets();

function loadBulldozerAssets() {
    bulldozerRenderer.load('assets/bulldozer_components.glb').catch(err => {
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
createShopPads(); // Shop Pads
initGems();

initUI(); // Expose global functions (though we removed buttons, we might still want setupShop for version?)
updateUI();
initInput(); // Start input listener loop
window.state = state; // Expose state

Runner.run(runner, engine);

function animate() {
    requestAnimationFrame(animate);
    const dozer = getBulldozer();
    updateGraphics(dozer, bulldozerRenderer);
    window.bulldozer = dozer; // Expose for debugging/verification
    window.camera = camera; // Expose camera for verification
    window.bodyMeshMap = bodyMeshMap; // Expose mesh map for verification
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
