# Progression Analysis (Current State)

!!! info "Metadata"
    -   **Date:** 2024-10-25
    -   **Version:** 1.2
    -   **Scope:** Current values for costs, entity stats, and economy.

!!! abstract "Context"
    This document outlines the current mathematical models governing the game's progression, including upgrade costs, entity scaling, and economic availability.

## 1. Economy (Gems)

The game world is divided into three zones. Gems are the sole source of currency.

| Zone | Gems | Value Range | Avg Value | Zone Total (Approx) | Unlock Condition |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | 400 | 8 - 12 | 10 | $4,000 | Start |
| **2** | 400 | 25 - 40 | 32.5 | $13,000 | 50% of Zone 1 Collected |
| **3** | 400 | 60 - 100 | 80 | $32,000 | 50% of Zone 2 Collected |
| **Total**| **1200** | | | **~$49,000** | |

-   **Victory Condition:** Collect all gems in the world.
-   **Gate Logic:** "Area Level" controls physical gates.
    -   Area Lvl 1 -> 2 (Unlocks Zone 2): Automatically happens when Zone 1 is 50% clear.
    -   Area Lvl 2 -> 3 (Unlocks Zone 3): Automatically happens when Zone 2 is 50% clear.

## 2. Upgrade Costs

All upgrades follow a simple exponential growth curve: `NewCost = floor(OldCost * 1.5)`.

| Upgrade | Base Cost | Growth | Cost @ Lvl 5 | Cost @ Lvl 10 |
| :--- | :--- | :--- | :--- | :--- |
| **Engine** | 100 | x1.5 | 506 | 3,844 |
| **Plow** | 100 | x1.5 | 506 | 3,844 |
| **Collector** | 150 | x1.5 | 759 | 5,766 |

-   **Area Unlock (Manual):**
    -   The `shop.js` code contains logic for purchasing "Unlock Gate", but `gem.js` also contains logic for *automatic* unlocking based on progress.
    -   There appears to be a dual-system (Purchase vs Auto). Currently, the "Unlock Gate" pad exists but might be redundant if auto-unlock triggers first.
    -   Manual Cost: 500 (Lvl 2), 2000 (Lvl 3).

## 3. Entity Scaling

### Bulldozer (Engine)
-   **Density:** Scales linearly (`0.002 + Level * 0.0001`) to prevent excessive mass growth.
-   **Force (Power):** Scales dynamically with level (`0.012 * 1.25^Level`), adjusted by a Load Factor based on the difference between Engine and Plow levels (+/- 10% per level difference).
-   **Volume:** Increases roughly quadratically due to dimension changes (`40 + 5*Level` body size, plus plow).
-   **Resulting Physics:**
    -   **Mass:** Grows due to volume and increasing density. Mass scales ~1.2-1.3x early on, tapering to ~1.16x later.
    -   **Max Speed:** Since Force (1.25x) scales roughly in parallel with Mass (1.16x - 1.3x), the **Power-to-Weight ratio remains relatively constant** (or decreases slightly early on).
    -   **Effect:** The bulldozer gets massive and powerful (pushing force increases drastically), but **top speed does not increase significantly**. This reinforces the "Heavy Machinery" feel rather than a racing car.

### Plow
-   **Base Width:** `45` units (Physically scaled x10 -> 450px).
-   **Growth:** `+5` units per level.
-   **Depth:** `10` units (Constant).
-   **Effect:** Level 10 plow is double the width of Level 1 (Base 45 + 45 = 90).

### Collector
-   **Base Body:** Circle, Radius `30 + (Level * 5)` (Diameter `60 + 10*Lvl`).
-   **Belts (Lvl > 1):**
    -   **Length:** `50 + (Level - 2) * 50` (Capped at 500).
    -   **Width:** `60 + floor((Level - 2) / 2) * 20`.
    -   **Top Belt:** Added at Level 4.
-   **Effect:** Significantly increases catchment area starting at Level 2.

## 4. Analysis
-   **Total Money Cap:** With ~$49,000 total in the world, the player effectively hits a "Soft Cap" on upgrades around Level 12-13 for a single item, or Level 9-10 spread across all three.
-   **Pacing:** The exponential cost curve means early upgrades are frequent, but late game upgrades become grindy.
-   **Physics Imbalance:** The Engine upgrade logic is designed to maintain consistent handling (speed/accel) as the vehicle grows massively in size. The slight discrepancies in scaling (Mass vs Force) mean the vehicle may feel slightly sluggish at certain intermediate levels if the Engine lags behind the Plow size.
-   **Redundancy:** The "Buy Area" shop pad conflicts with the "Auto Unlock" mechanic in `gem.js`.
