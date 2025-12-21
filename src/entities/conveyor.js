import { Bodies, Composite, world, CATEGORIES } from '../core/physics.js';
import { collectGem } from '../domains/gem/logic.js';

export function initConveyorSystem() {
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

                    const targetSpeed = 3;
                    const nx = dx / dist;
                    const ny = dy / dist;

                    const targetVx = nx * targetSpeed;
                    const targetVy = ny * targetSpeed;

                    const forceFactor = 0.5 * gem.mass;

                    const fx = (targetVx - gem.velocity.x) * forceFactor;
                    const fy = (targetVy - gem.velocity.y) * forceFactor;

                    Body.setVelocity(gem, {
                        x: gem.velocity.x + (fx / gem.mass),
                        y: gem.velocity.y + (fy / gem.mass)
                    });
                }
            }
        }
    });

    // Collision handling for gems and collector
    Events.on(engine, 'collisionStart', event => {
        const pairs = event.pairs;

        for (let i = 0; i < pairs.length; i++) {
            const bodyA = pairs[i].bodyA;
            const bodyB = pairs[i].bodyB;

            const labelA = bodyA.label || (bodyA.parent && bodyA.parent.label);
            const labelB = bodyB.label || (bodyB.parent && bodyB.parent.label);

            let gemBody = null;
            let collectorBody = null;

            if (labelA === 'gem') gemBody = bodyA;
            if (labelB === 'gem') gemBody = bodyB;

            if (labelA === 'collector') collectorBody = bodyA;
            if (labelB === 'collector') collectorBody = bodyB;

            if (gemBody && collectorBody) {
                collectGem(gemBody);
            }
        }
    });
}
