import { state, costs } from './state.js';
import { createBulldozer } from './entities/bulldozer.js';
import { createCollector } from './entities/collector.js';
import { createMap } from './entities/map.js';

export function updateUI() {
    document.getElementById('money').innerText = state.money;
    document.getElementById('cost-dozer').innerText = costs.dozer;
    document.getElementById('cost-plow').innerText = costs.plow;
    document.getElementById('cost-collector').innerText = costs.collector;

    const btnArea = document.getElementById('btn-unlock-area');
    const costArea = document.getElementById('cost-area');

    if (btnArea && costArea) {
        if (state.areaLevel >= 3) {
            btnArea.innerText = "Max Level";
            btnArea.disabled = true;
            costArea.innerText = "-";
        } else {
            // Check if current level is cleared enough to unlock?
            // Actually, we can just let them buy it early if they want, OR wait for auto unlock.
            // But if they have enough money they can still buy it.
            btnArea.innerText = "Unlock Gate";
            costArea.innerText = costs.area;
            btnArea.disabled = state.money < costs.area;
        }
    }

    document.getElementById('btn-upgrade-dozer').disabled = state.money < costs.dozer;
    document.getElementById('btn-upgrade-plow').disabled = state.money < costs.plow;
    document.getElementById('btn-upgrade-collector').disabled = state.money < costs.collector;

    const speedVal = Math.round(100 * (1 + state.dozerLevel * 0.1));
    const speedEl = document.getElementById('stats-speed');
    if (speedEl) speedEl.innerText = `Speed: ${speedVal}%`;
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
export function setupShop() {
    updateVersionDisplay();

    window.toggleShop = function() {
        const shop = document.getElementById('shop-modal');
        shop.classList.toggle('hidden');
    }

    window.upgradeDozer = function() {
        if (state.money >= costs.dozer) {
            state.money -= costs.dozer;
            state.dozerLevel++;
            costs.dozer = Math.floor(costs.dozer * 1.5);
            createBulldozer();
            updateUI();
        }
    };

    window.upgradePlow = function() {
        if (state.money >= costs.plow) {
            state.money -= costs.plow;
            state.plowLevel++;
            costs.plow = Math.floor(costs.plow * 1.5);
            createBulldozer();
            updateUI();
        }
    };

    window.upgradeCollector = function() {
        if (state.money >= costs.collector) {
            state.money -= costs.collector;
            state.collectorLevel++;
            costs.collector = Math.floor(costs.collector * 1.5);
            createCollector();
            updateUI();
        }
    };

    window.unlockArea = function() {
        if (state.money >= costs.area && state.areaLevel < 3) {
            state.money -= costs.area;
            state.areaLevel++;

            if (state.areaLevel === 2) costs.area = 2000;
            else costs.area = 999999;

            createMap();
            updateUI();
        }
    };
}
