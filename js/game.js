import { engine, runner, Runner, Events, Body } from './physics.js';
import { initThree, updateGraphics, scene, camera, renderer } from './graphics.js';
import { createMap } from './entities/map.js';
import { createBulldozer, getBulldozer } from './entities/bulldozer.js';
import { createCollector } from './entities/collector.js';
import { initGems, collectGem } from './entities/gem.js';
import { updateUI, setupShop } from './ui.js';
import { initInput } from './input.js';
import { initConsole } from './console.js';
// Expose updateUI
window.updateUI = updateUI;
import { state } from './state.js'; // Import state to expose it

initConsole();

// Conveyor belt logic
Events.on(engine, 'collisionActive', event => {
    const pairs = event.pairs;

    for (let i = 0; i < pairs.length; i++) {
        const bodyA = pairs[i].bodyA;
        const bodyB = pairs[i].bodyB;

        // Identify gem and conveyor
        let gem = null;
        let conveyor = null;

        if (bodyA.label === 'gem') gem = bodyA;
        if (bodyB.label === 'gem') gem = bodyB;

        if (bodyA.label && bodyA.label.startsWith('conveyor_')) conveyor = bodyA;
        if (bodyB.label && bodyB.label.startsWith('conveyor_')) conveyor = bodyB;

        if (gem && conveyor) {
            // Apply force towards the collector center (0, 400)
            const collectorPos = { x: 0, y: 400 };

            // Calculate vector towards collector
            const dx = collectorPos.x - gem.position.x;
            const dy = collectorPos.y - gem.position.y;
            const dist = Math.sqrt(dx*dx + dy*dy);

            if (dist > 0) {
                // Normalize and scale force
                const forceMagnitude = 0.0005 * gem.mass; // Tune this
                const force = {
                    x: (dx / dist) * forceMagnitude,
                    y: (dy / dist) * forceMagnitude
                };
                Body.applyForce(gem, gem.position, force);
            }
        }
    }
});


// Collision handling
Events.on(engine, 'collisionStart', event => {
    const pairs = event.pairs;

    for (let i = 0; i < pairs.length; i++) {
        const bodyA = pairs[i].bodyA;
        const bodyB = pairs[i].bodyB;

        const labelA = bodyA.label || (bodyA.parent && bodyA.parent.label);
        const labelB = bodyB.label || (bodyB.parent && bodyB.parent.label);

        // Check for collector
        let gemBody = null;
        let collectorBody = null;

        // Determine if one is gem and one is collector
        if (labelA === 'gem') gemBody = bodyA; // Gem is simple body
        if (labelB === 'gem') gemBody = bodyB;

        if (labelA === 'collector') collectorBody = bodyA;
        if (labelB === 'collector') collectorBody = bodyB;

        if (gemBody && collectorBody) {
            collectGem(gemBody);
        }
    }
});

// Start
initThree();
createMap();
createBulldozer();
createCollector();
initGems();

setupShop(); // Expose global functions
updateUI();
initInput(); // Start input listener loop
window.state = state; // Expose state

Runner.run(runner, engine);

function animate() {
    requestAnimationFrame(animate);
    const dozer = getBulldozer();
    updateGraphics(dozer);
    window.bulldozer = dozer; // Expose for debugging/verification
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
