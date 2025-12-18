import { state, costs } from '../state.js';
import { Bodies, Composite, Body, world, CATEGORIES } from '../physics.js';
import { createBulldozer } from './bulldozer.js';
import { createCollector } from './collector.js';
import { createMap } from './map.js';
import { showNotification, updateUI } from '../ui.js';
import { spawnParticles, spawnFloatingText } from '../graphics.js';
import { rebuildBulldozerRenderer } from '../game.js';

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
    createPad(-900, 0, 'Upgrade Engine', 'dozer', () => costs.dozer);

    // Pad 2: Upgrade Plow
    createPad(-900, 200, 'Upgrade Plow', 'plow', () => costs.plow);

    // Pad 3: Upgrade Collector
    createPad(-900, 400, 'Upgrade Collector', 'collector', () => costs.collector);

    // Pad 4: Unlock Area
    createPad(-900, -200, 'Unlock Gate', 'area', () => {
        if (state.areaLevel >= 3) return null; // Max level
        return costs.area;
    });

    createShopBarrier();
}

function createShopBarrier() {
    // A barrier around the shop area (Left side) to block Gems but allow Dozer.
    // The pads are at x = -900.
    // Fence separating the shop area from the main game area (x > -600).

    // Vertical barrier at x = -600
    const barrier = Bodies.rectangle(-600, 100, 20, 1000, {
        isStatic: true,
        label: 'shop_barrier',
        collisionFilter: {
            category: CATEGORIES.SHOP_BARRIER,
            // Collides with GEM only.
            mask: CATEGORIES.GEM
        },
        render: { visible: false } // We can make it invisible or give it a visual
    });

    Composite.add(world, barrier);
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

    // Feedback: "I think only the centre point of the body of the Dozer should actually be used for purchasing"
    // So we check if bulldozer.position is inside a pad's bounds.

    const dozerPos = bulldozer.position; // This is the center of the compound body (chassis)

    // Check against each pad
    // Pads are AABBs (unrotated).

    for (const pad of shopPads) {
        const halfW = pad.width / 2;
        const halfH = pad.height / 2;

        if (dozerPos.x >= pad.x - halfW && dozerPos.x <= pad.x + halfW &&
            dozerPos.y >= pad.y - halfH && dozerPos.y <= pad.y + halfH) {

            handleShopInteraction(pad);
            break; // Handle one at a time
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
            rebuildBulldozerRenderer();
            spawnFloatingText("Engine Up!", { x: pad.x, y: pad.y }, '#f39c12');
            showNotification(`Engine Upgraded to Level ${state.dozerLevel}!`);
        } else if (pad.type === 'plow') {
            state.plowLevel++;
            costs.plow = Math.floor(costs.plow * 1.5);
            createBulldozer();
            spawnFloatingText("Plow Up!", { x: pad.x, y: pad.y }, '#d35400');
            showNotification(`Plow Upgraded to Level ${state.plowLevel}!`);
        } else if (pad.type === 'collector') {
            state.collectorLevel++;
            costs.collector = Math.floor(costs.collector * 1.5);
            createCollector();
            spawnFloatingText("Collector Up!", { x: pad.x, y: pad.y }, '#00ff00');
            showNotification(`Collector Upgraded to Level ${state.collectorLevel}!`);
        } else if (pad.type === 'area') {
            state.areaLevel++;
            if (state.areaLevel === 2) costs.area = 2000;
            else costs.area = 999999;
            createMap();
            spawnFloatingText("Area Unlocked!", { x: pad.x, y: pad.y }, '#e74c3c');
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
