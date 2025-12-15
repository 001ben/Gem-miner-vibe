import { engine, runner, Runner, Events, Body, Matter } from './physics.js';
import { initThree, updateGraphics, scene, camera, renderer, bodyMeshMap } from './graphics.js';
import { createMap } from './entities/map.js';
import { createBulldozer, getBulldozer, enforceBulldozerRigidity } from './entities/bulldozer.js';
import { createCollector } from './entities/collector.js';
import { initGems, collectGem } from './entities/gem.js';
import { updateUI, setupShop, showNotification } from './ui.js';
import { createShopPads, checkShopCollisions } from './entities/shop.js';
import { initInput } from './input.js';
import { initConsole } from './console.js';
// Expose updateUI and showNotification
window.updateUI = updateUI;
window.showNotification = showNotification;
import { state } from './state.js'; // Import state to expose it

initConsole();

// Force dozer rigidity before physics update
Events.on(engine, 'beforeUpdate', () => {
    enforceBulldozerRigidity();
    checkShopCollisions(getBulldozer());
});

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

                // Use Force/Acceleration instead of straight velocity to allow physics interactions (like pushing back on dozer) to happen naturally.
                // Vector towards collector
                const targetSpeed = 3;
                const nx = dx / dist;
                const ny = dy / dist;

                const targetVx = nx * targetSpeed;
                const targetVy = ny * targetSpeed;

                // Acceleration: Apply force proportional to the difference between current and target velocity
                // Use a very high gain (0.5) to ensure rapid acceleration (time constant ~2 frames)
                // This makes the belt feel responsive while still allowing external forces (like dozer) to interact.
                const forceFactor = 0.5 * gem.mass;

                const fx = (targetVx - gem.velocity.x) * forceFactor;
                const fy = (targetVy - gem.velocity.y) * forceFactor;

                // Directly modify velocity (acceleration) because Body.applyForce can be inconsistent if forces are cleared or fighting constraints.
                // This mimics applying a strong force that overcomes friction immediately.
                Body.setVelocity(gem, {
                    x: gem.velocity.x + (fx / gem.mass),
                    y: gem.velocity.y + (fy / gem.mass)
                });
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
createShopPads(); // Shop Pads
initGems();

setupShop(); // Expose global functions (though we removed buttons, we might still want setupShop for version?)
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
    window.bodyMeshMap = bodyMeshMap; // Expose mesh map for verification
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
