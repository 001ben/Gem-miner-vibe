import { engine, runner, Runner, Events } from './physics.js';
import { initThree, updateGraphics, scene, camera, renderer } from './graphics.js';
import { createMap } from './entities/map.js';
import { createBulldozer, getBulldozer } from './entities/bulldozer.js';
import { createCollector } from './entities/collector.js';
import { initGems, collectGem } from './entities/gem.js';
import { updateUI, setupShop } from './ui.js';
import { initInput } from './input.js';
import { initConsole } from './console.js';

initConsole();

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

Runner.run(runner, engine);

function animate() {
    requestAnimationFrame(animate);
    updateGraphics(getBulldozer());
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
