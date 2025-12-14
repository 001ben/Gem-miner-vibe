import { state, costs } from '../state.js';
import { Bodies, Composite, Body, world, CATEGORIES } from '../physics.js';
import { createBulldozer } from './bulldozer.js';
import { createCollector } from './collector.js';
import { createMap } from './map.js';
import { showNotification, updateUI } from '../ui.js';
import { spawnParticles } from '../graphics.js';

// Shop Pads
// These are sensor bodies placed on the map.
// If the bulldozer overlaps them, and stays (or enters), we trigger logic.

const shopPads = [];
const COOLDOWN_MS = 2000;
let lastPurchaseTime = 0;

export function createShopPads() {
    // Clear existing
    shopPads.forEach(p => {
        Composite.remove(world, p.body);
    });
    shopPads.length = 0;

    // Position pads.
    // Spawn is at (0, 0).
    // Let's place them to the left of spawn, in a row or grid.

    // Pad 1: Upgrade Dozer
    createPad(-300, 0, 'Upgrade Engine', 'dozer', () => costs.dozer);

    // Pad 2: Upgrade Plow
    createPad(-300, 200, 'Upgrade Plow', 'plow', () => costs.plow);

    // Pad 3: Upgrade Collector
    createPad(-300, 400, 'Upgrade Collector', 'collector', () => costs.collector);

    // Pad 4: Unlock Area
    createPad(-300, -200, 'Unlock Gate', 'area', () => {
        if (state.areaLevel >= 3) return null; // Max level
        return costs.area;
    });
}

function createPad(x, y, title, type, costFn) {
    const width = 180;
    const height = 120;

    const body = Bodies.rectangle(x, y, width, height, {
        isSensor: true,
        label: `shop_pad_${type}`,
        isStatic: true
    });

    Composite.add(world, body);

    shopPads.push({
        body,
        title,
        type,
        costFn,
        x,
        y,
        width,
        height
    });
}

export function getShopPads() {
    return shopPads;
}

export function checkShopCollisions(bulldozer) {
    if (!bulldozer) return;

    const now = Date.now();
    if (now - lastPurchaseTime < COOLDOWN_MS) return;

    // Check overlap
    // Since these are sensors, we can check collision state or manual bounds.
    // Manual bounds is easy since pads are static AABBs (mostly).

    // Or iterate physics collisions.
    // Let's use Matter.Query.

    const collisions = Matter.Query.collides(bulldozer, shopPads.map(p => p.body));

    if (collisions.length > 0) {
        // Find which pad
        const pair = collisions[0];
        const bodyA = pair.bodyA;
        const bodyB = pair.bodyB;

        // Find the pad body
        const padEntry = shopPads.find(p => p.body === bodyA || p.body === bodyB);

        if (padEntry) {
            handleShopInteraction(padEntry);
        }
    }
}

function handleShopInteraction(pad) {
    const cost = pad.costFn();
    if (cost === null) return; // Max level or invalid

    if (state.money >= cost) {
        // Buy!
        state.money -= cost;
        lastPurchaseTime = Date.now();

        // Execute Upgrade
        if (pad.type === 'dozer') {
            state.dozerLevel++;
            costs.dozer = Math.floor(costs.dozer * 1.5);
            createBulldozer();
            showNotification(`Engine Upgraded to Level ${state.dozerLevel}!`);
        } else if (pad.type === 'plow') {
            state.plowLevel++;
            costs.plow = Math.floor(costs.plow * 1.5);
            createBulldozer();
            showNotification(`Plow Upgraded to Level ${state.plowLevel}!`);
        } else if (pad.type === 'collector') {
            state.collectorLevel++;
            costs.collector = Math.floor(costs.collector * 1.5);
            createCollector();
            showNotification(`Collector Upgraded to Level ${state.collectorLevel}!`);
        } else if (pad.type === 'area') {
            state.areaLevel++;
            if (state.areaLevel === 2) costs.area = 2000;
            else costs.area = 999999;
            createMap();
            showNotification(`Area Unlocked!`);
        }

        updateUI(); // Updates text on screen (stats)

        // Visuals
        spawnParticles({ x: pad.x, y: pad.y }, 0xffd700, 'upgrade');

        // We also need to update the pad visual text (cost increased).
        // The graphics loop should pull the cost every frame or we trigger a refresh.
        // We'll let graphics loop handle it via `getShopPads`.
    } else {
        // Not enough money.
        // Optional: Show "Not enough money" notification?
        // But only show it once per entry, otherwise it spams.
        // For now, silent fail is fine, or simple feedback.
    }
}
