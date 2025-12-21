import { state, costs } from './state.js';
import { createBulldozer } from '../domains/bulldozer/logic.js';
import { createCollector } from '../entities/collector.js';
import { createMap } from '../entities/map.js';

export function updateUI() {
    document.getElementById('money').innerText = state.money;

    // We no longer update button states since they are removed.

    // Speed increases ~33% per level relative to previous.
    // L1 = 100%. L2 = 133%.
    // Formula: 100 * Math.pow(1.333, state.dozerLevel - 1)
    const speedVal = Math.round(100 * Math.pow(1.3333, state.dozerLevel - 1));
    const speedEl = document.getElementById('stats-speed');
    if (speedEl) speedEl.innerText = `Speed: ${speedVal}%`;

    // Power increases 2.0x per level (Force).
    // L1 = 100%. L2 = 200%.
    const powerVal = Math.round(100 * Math.pow(2.0, state.dozerLevel - 1));
    const powerEl = document.getElementById('stats-power');
    if (powerEl) powerEl.innerText = `Power: ${powerVal}%`;
}

export function showNotification(message) {
    const container = document.getElementById('notification-area');
    if (!container) return;

    const el = document.createElement('div');
    el.className = 'notification';
    el.innerText = message;
    container.appendChild(el);

    // Remove after animation
    setTimeout(() => {
        if (el.parentNode) el.parentNode.removeChild(el);
    }, 4000);
}

async function updateVersionDisplay() {
    try {
        const response = await fetch('VERSION');
        if (response.ok) {
            const version = await response.text();
            const el = document.getElementById('game-version');
            // We want to preserve the timestamp if it exists in the HTML
            // content of game-version: v1.0.0 <span id="build-timestamp">...</span>
            // If we just set innerText, we wipe the span.
            // So let's check if the span exists.
            const timestampSpan = document.getElementById('build-timestamp');
            if (el) {
                el.childNodes[0].nodeValue = `v${version.trim()} `;
            }
        }
    } catch (e) {
        console.warn('Could not load version');
    }
}

// Shop Functions - Exposed via window for HTML onclick or we attach them
export function initUI() {
    updateVersionDisplay();
    // Shop logic is now handled by physical pads (js/entities/shop.js)
}
