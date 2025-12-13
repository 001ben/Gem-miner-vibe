import { state } from '../state.js';
import { Bodies, Composite, world } from '../physics.js';
import { removeBodyMesh, spawnParticles } from '../graphics.js';
import { updateUI } from '../ui.js';

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

    spawnZoneGems(300, -500, 500, -500, 500, 10, 25, ['#00FFFF', '#FF00FF']);
    spawnZoneGems(300, -500, 500, -1700, -700, 30, 60, ['#FFFF00']);
    spawnZoneGems(300, -500, 500, -2900, -1900, 70, 120, ['#00FF00']);
}

function spawnZoneGems(count, xMin, xMax, yMin, yMax, valMin, valMax, colors) {
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
            label: 'gem'
        });

        gem.renderColor = colorVal;
        gem.value = Math.floor(valMin + Math.random() * (valMax - valMin));
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
    updateUI();

    // Spawn particles
    spawnParticles({x: gem.position.x, y: gem.position.y}, gem.renderColor);

    // Explicitly remove mesh to ensure visual update happens immediately
    removeBodyMesh(gem.id);

    // Remove from physics world
    Composite.remove(world, gem);

    // Remove from local array
    const index = gems.indexOf(gem);
    if (index > -1) gems.splice(index, 1);
}
