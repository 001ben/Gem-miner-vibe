import { state, costs } from '../core/state.js';
import { Bodies, Composite, Body, world, CATEGORIES } from '../core/physics.js';
import { removeBodyMesh, spawnParticles, spawnCoinDrop } from '../core/graphics.js';
import { updateUI, showNotification } from '../core/ui.js';
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

    spawnZoneGems(1, 400, -500, 500, -500, 500, 8, 12, ['#00FFFF', '#FF00FF']);
    spawnZoneGems(2, 400, -500, 500, -1700, -700, 25, 40, ['#FFFF00']);
    // Inflation Adjustment: Zone 3 Gems are now "Big Ticket" items (100-200)
    spawnZoneGems(3, 400, -500, 500, -2900, -1900, 100, 200, ['#00FF00']);
}

function spawnZoneGems(zoneId, count, xMin, xMax, yMin, yMax, valMin, valMax, colors) {
    state.zoneProgress[zoneId].total += count;
    for(let i=0; i<count; i++) {
        const x = xMin + Math.random() * (xMax - xMin);
        const y = yMin + Math.random() * (yMax - yMin);

        const colorStr = colors[Math.floor(Math.random() * colors.length)];
        const colorVal = gemColors[colorStr];
        const radius = 8 + Math.random() * 4; // Consistent size around 8-12

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

                    gem.gemColorHex = colorStr; // e.g. '#00FFFF'

                    gem.value = Math.floor(valMin + Math.random() * (valMax - valMin));

                    gem.zoneId = zoneId;

                    gems.push(gem);

                    Composite.add(world, gem);  }
}

export function collectGem(gem) {
  // Fix: rely on gem properties or array check, but array check is safer if we maintain it correctly.
  // Also check if already processed.
  if (gem.isCollected) return;

  gem.isCollected = true;
  state.money += gem.value;
  state.session.gemCollectionCount++;

  // Update Progress
  if (gem.zoneId && state.zoneProgress[gem.zoneId]) {
    state.zoneProgress[gem.zoneId].collected++;
    checkZoneUnlock(gem.zoneId);
  }

  updateUI();

  // Spawn particles
  spawnParticles({ x: gem.position.x, y: gem.position.y }, gem.renderColor);

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
  // Bonus Reward if 50% cleared (but NO auto-unlock)
  if (!p.bonusAwarded && p.collected >= p.total * 0.5) {
    p.bonusAwarded = true;
    const bonus = 500 * zoneId; // 500, 1000, 1500
    state.money += bonus;
    showNotification(`Zone ${zoneId} Cleared! Bonus: $${bonus}`);
    spawnCoinDrop(bonus, { x: 0, y: 0 }); // Spawn from center or player? Player is better but we don't have ref here easily.
    updateUI();
  }

  // Check for Victory (Global gem count)
  // We check if there are ANY gems left in the world.
  const remainingGems = Composite.allBodies(world).filter(b => b.label === 'gem').length;
  if (remainingGems === 0) {
    if (!state.victoryShown) {
      state.victoryShown = true;
      showNotification("Congrats! You are the mightiest Gem Lord!");
    }
  }
}
