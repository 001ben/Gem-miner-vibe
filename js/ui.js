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

    if (state.areaLevel >= 3) {
        btnArea.innerText = "Max Level";
        btnArea.disabled = true;
        costArea.innerText = "-";
    } else {
        btnArea.innerText = "Unlock Gate";
        costArea.innerText = costs.area;
        btnArea.disabled = state.money < costs.area;
    }

    document.getElementById('btn-upgrade-dozer').disabled = state.money < costs.dozer;
    document.getElementById('btn-upgrade-plow').disabled = state.money < costs.plow;
    document.getElementById('btn-upgrade-collector').disabled = state.money < costs.collector;

    const speedVal = Math.round(100 * (1 + state.dozerLevel * 0.1));
    const speedEl = document.getElementById('stats-speed');
    if (speedEl) speedEl.innerText = `Speed: ${speedVal}%`;
}

async function updateVersionDisplay() {
    try {
        const response = await fetch('VERSION');
        if (response.ok) {
            const version = await response.text();
            const el = document.getElementById('game-version');
            if (el) el.innerText = `v${version.trim()}`;
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
