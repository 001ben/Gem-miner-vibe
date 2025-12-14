import { state, costs } from '../state.js';
import { Bodies, Composite, Body, world, CATEGORIES } from '../physics.js';
import { removeBodyMesh, spawnParticles, spawnCoinDrop } from '../graphics.js';
import { updateUI, showNotification } from '../ui.js';
import { createMap } from './map.js';

const gems = [];
const gemColors = {
    '#00FFFF': 0x00FFFF, // Cyan
    '#FF00FF': 0xFF00FF, // Magenta
    '#FFFF00': 0xFFFF00, // Yellow
    '#00FF00': 0x00FF00  // Green
};

export function initGems() {
    // Clear existing
    for (const g of gems) {
         removeBodyMesh(g.id);
         Composite.remove(world, g);
    }
    gems.length = 0;

    // Reset progress tracking
    state.zoneProgress[1] = { total: 0, collected: 0 };
    state.zoneProgress[2] = { total: 0, collected: 0 };
    state.zoneProgress[3] = { total: 0, collected: 0 };

    spawnZoneGems(1, 300, -500, 500, -500, 500, 10, 25, ['#00FFFF', '#FF00FF']);
    spawnZoneGems(2, 300, -500, 500, -1700, -700, 30, 60, ['#FFFF00']);
    spawnZoneGems(3, 300, -500, 500, -2900, -1900, 70, 120, ['#00FF00']);
}

function spawnZoneGems(zoneId, count, xMin, xMax, yMin, yMax, valMin, valMax, colors) {
    state.zoneProgress[zoneId].total += count;
    for(let i=0; i<count; i++) {
        const x = xMin + Math.random() * (xMax - xMin);
        const y = yMin + Math.random() * (yMax - yMin);

        const colorStr = colors[Math.floor(Math.random() * colors.length)];
        const colorVal = gemColors[colorStr];
        const radius = 10 + Math.random() * 8 + (valMin/10);

        const gem = Bodies.circle(x, y, radius, {
            restitution: 0.5,
            friction: 0.0,
            frictionAir: 0.02,
            label: 'gem',
            collisionFilter: {
                category: CATEGORIES.GEM,
                // Collides with everything: Default, Dozer, Gem, Conveyor, Wall, Shop Barrier
                mask: CATEGORIES.DEFAULT | CATEGORIES.DOZER | CATEGORIES.GEM | CATEGORIES.CONVEYOR | CATEGORIES.WALL | CATEGORIES.SHOP_BARRIER
            }
        });

        gem.renderColor = colorVal;
        gem.value = Math.floor(valMin + Math.random() * (valMax - valMin));
        gem.zoneId = zoneId;
        gems.push(gem);
        Composite.add(world, gem);
    }
}

export function collectGem(gem) {
    // Fix: rely on gem properties or array check, but array check is safer if we maintain it correctly.
    // Also check if already processed.
    if (gem.isCollected) return;

    gem.isCollected = true;
    state.money += gem.value;

    // Update Progress
    if (gem.zoneId && state.zoneProgress[gem.zoneId]) {
        state.zoneProgress[gem.zoneId].collected++;
        checkZoneUnlock(gem.zoneId);
    }

    updateUI();

    // Spawn particles
    spawnParticles({x: gem.position.x, y: gem.position.y}, gem.renderColor);

    // Spawn flying coin visual from gem position
    spawnCoinDrop(gem.value, gem.position);

    // Explicitly remove mesh to ensure visual update happens immediately
    removeBodyMesh(gem.id);

    // Remove from physics world
    Composite.remove(world, gem);

    // Remove from local array
    const index = gems.indexOf(gem);
    if (index > -1) gems.splice(index, 1);
}

function checkZoneUnlock(zoneId) {
    const p = state.zoneProgress[zoneId];
    // Unlock next zone if 50% cleared
    if (p.collected >= p.total * 0.5) {
        // If we are in zone 1, we unlock zone 2 (which means areaLevel goes from 1 to 2)
        // If we are in zone 2, we unlock zone 3 (areaLevel goes from 2 to 3)
        // Zone 3 is the last zone.

        if (state.areaLevel === zoneId) {
            // If we are at max area (3), do not increment further.
            if (state.areaLevel >= 3) {
                 // Maybe show final victory message if this was the last trigger?
                 // But we don't want to spam it.
                 // Only show if we just crossed the threshold.
                 // We can use a flag or just check if we haven't shown it.
                 if (!state.victoryShown) {
                     state.victoryShown = true;
                     showNotification("Congrats! You are the mightiest Gem Lord!");
                 }
                 return;
            }

             // Unlock next area
             state.areaLevel++;

             // Update costs for next unlock if any
             if (state.areaLevel === 2) costs.area = 2000;
             else costs.area = 999999; // Maxed out basically

             createMap(); // Removes gate
             showNotification(`Area ${state.areaLevel} Unlocked!`);
        }
    }
}
