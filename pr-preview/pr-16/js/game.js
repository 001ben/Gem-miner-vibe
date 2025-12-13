import { engine, runner, Runner, Events, Body, Matter } from './physics.js';
import { initThree, updateGraphics, scene, camera, renderer } from './graphics.js';
import { createMap } from './entities/map.js';
import { createBulldozer, getBulldozer } from './entities/bulldozer.js';
import { createCollector } from './entities/collector.js';
import { initGems, collectGem } from './entities/gem.js';
import { updateUI, setupShop, showNotification } from './ui.js';
import { initInput } from './input.js';
import { initConsole } from './console.js';
// Expose updateUI and showNotification
window.updateUI = updateUI;
window.showNotification = showNotification;
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

        // Check labels on body or parent (compound bodies)
        const labelA = bodyA.label || (bodyA.parent && bodyA.parent.label);
        const labelB = bodyB.label || (bodyB.parent && bodyB.parent.label);

        if (labelA === 'gem') gem = bodyA;
        if (labelB === 'gem') gem = bodyB;

        // For conveyor, we explicitly named the parts "conveyor_left", etc.
        // But Matter.js might report the parent "collector_compound".
        // However, we need to know WHICH conveyor it is to animate or apply specific logic if needed?
        // Actually, for now, we just push to center.
        // Wait, if it reports parent, we can't check startsWith('conveyor_').
        // Let's check the specific part label first.

        if (bodyA.label && bodyA.label.startsWith('conveyor_')) conveyor = bodyA;
        if (bodyB.label && bodyB.label.startsWith('conveyor_')) conveyor = bodyB;

        if (gem && conveyor) {
            // Log once per gem overlap interaction
            if (!gem.hasLoggedConveyor) {
                gem.hasLoggedConveyor = true;
            }

            // Apply force towards the collector center (0, 400)
            const collectorPos = { x: 0, y: 400 };

            // Calculate vector towards collector
            const dx = collectorPos.x - gem.position.x;
            const dy = collectorPos.y - gem.position.y;
            const dist = Math.sqrt(dx*dx + dy*dy);

            if (dist > 0) {
                // Wake up gem if sleeping
                if (gem.isSleeping) Matter.Sleeping.set(gem, false);

                // Use velocity for consistent "conveyor" movement
                // Vector towards collector
                const speed = 3; // Constant speed
                const vx = (dx / dist) * speed;
                const vy = (dy / dist) * speed;

                // Blend with current velocity to avoid snapping, but dominate
                Body.setVelocity(gem, { x: vx, y: vy });
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
    window.camera = camera; // Expose camera for verification
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
