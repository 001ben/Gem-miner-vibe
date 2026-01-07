import { state } from '../core/state.js';
import { Bodies, Body, Composite, world, CATEGORIES } from '../core/physics.js';
import { removeBodyMesh } from '../core/graphics.js';

let collector;

export function createCollector() {
    if (collector) {
         // If it's a compound body, we need to remove meshes for all parts
         if (collector.parts && collector.parts.length > 1) {
             collector.parts.forEach(p => removeBodyMesh(p.id));
         } else {
             removeBodyMesh(collector.id);
         }
         Composite.remove(world, collector);
    }

    const size = 60 + (state.collectorLevel * 10); // Less size increase, focusing on belts
    const collectorY = 400;

    const base = Bodies.circle(0, collectorY, size/2, {
        isSensor: true,
        label: 'collector',
        collisionFilter: {
            category: CATEGORIES.CONVEYOR,
            // Collector itself interacts with Gems.
            mask: CATEGORIES.GEM
        }
    });

    let parts = [base];

    // Add conveyor belts
    // "Upgrade it by adding some conveyor belts"
    // Let's add belts extending out.
    // Level 1: Just the collector (or maybe short belts?)
    // Level >= 2: Longer belts or more belts.
    // The user said "upgrade it by adding some conveyor belts", implying they appear on upgrade.
    // So if collectorLevel > 1.

    if (state.collectorLevel > 1) {
        // Linear increase in length to avoid clipping through walls
        let beltLength = 50 + (state.collectorLevel - 2) * 50;

        // Cap length to prevent hitting walls (Map width is 1200 => -600 to 600)
        // Collector is at 0. Max extent ~500.
        if (beltLength > 500) beltLength = 500;

        // Start thicker (60) and intersperse thickness upgrades (every 2 levels +20)
        const beltWidth = 60 + (Math.floor((state.collectorLevel - 2) / 2) * 20);

        // Left Belt
        // Position: Extending left from the collector.
        // Center X = - (size/2 + beltLength/2)
        // Center Y = collectorY
        const leftBelt = Bodies.rectangle(-(size/2 + beltLength/2), collectorY, beltLength, beltWidth, {
            isSensor: true,
            label: 'conveyor_left',
            collisionFilter: {
                category: CATEGORIES.CONVEYOR,
                mask: CATEGORIES.GEM
            }
        });

        // Right Belt
        const rightBelt = Bodies.rectangle((size/2 + beltLength/2), collectorY, beltLength, beltWidth, {
            isSensor: true,
            label: 'conveyor_right',
            collisionFilter: {
                category: CATEGORIES.CONVEYOR,
                mask: CATEGORIES.GEM
            }
        });

        parts.push(leftBelt, rightBelt);

        // Maybe add top belts too for higher levels?
        if (state.collectorLevel >= 4) {
             // Angled belts? Or just a top one.
             const topBelt = Bodies.rectangle(0, collectorY - (size/2 + beltLength/2), beltWidth, beltLength, {
                isSensor: true,
                label: 'conveyor_top',
                collisionFilter: {
                    category: CATEGORIES.CONVEYOR,
                    mask: CATEGORIES.GEM
                }
             });
             parts.push(topBelt);
        }
    }

    collector = Body.create({
        parts: parts,
        isStatic: true,
        label: 'collector_compound'
    });

    Composite.add(world, collector);
}
