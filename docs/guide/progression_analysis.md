# Progression Analysis (Current State)

!!! info "Metadata"
    -   **Date:** 2024-05-23
    -   **Version:** 1.3
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

## 2. Upgrade Costs

All upgrades follow a simple exponential growth curve: `NewCost = floor(OldCost * 1.5)`.

| Upgrade | Base Cost | Growth | Cost @ Lvl 5 | Cost @ Lvl 10 |
| :--- | :--- | :--- | :--- | :--- |
| **Engine** | 100 | x1.5 | 506 | 3,844 |
| **Plow** | 100 | x1.5 | 506 | 3,844 |
| **Collector** | 150 | x1.5 | 759 | 5,766 |

## 3. Entity Scaling Verification

Measured values from `verification/measure_scaling.py` (running simulated physics):

| Level | Mass | Width | Height | Max Speed (px/f) | Accel (Dist 5s) |
|-------|------|-------|--------|------------------|-----------------|
| 1 | 9.52 | 114.00 | 82.00 | 2.9180 | 858.88 |
| 2 | 12.18 | 87.00 | 138.00 | 2.8509 | 839.13 |
| 3 | 17.91 | 120.83 | 206.47 | 2.4227 | 713.10 |
| 4 | 21.95 | 129.81 | 234.92 | 2.4722 | 727.64 |
| 5 | 26.43 | 138.79 | 263.37 | 2.5657 | 755.16 |
| 6 | 31.40 | 147.77 | 291.81 | 2.6999 | 794.68 |
| 7 | 36.86 | 156.76 | 320.26 | 2.8745 | 846.07 |
| 8 | 42.85 | 165.74 | 348.71 | 3.0910 | 909.80 |
| 9 | 49.38 | 174.72 | 377.16 | 3.3527 | 986.80 |
| 10 | 56.48 | 183.70 | 405.60 | 3.6641 | 1078.45 |
| 20 | 163.55 | 273.53 | 690.08 | 11.7851 | 3468.74 |

**Observations:**
-   **Power Fantasy Gap:** There is a regression in performance at Level 3. Max speed drops from 2.92 to 2.42.
-   **Cause:** This corresponds to the introduction of "Wings" on the plow (Level 3+) or a jump in mass/dimensions that outweighs the engine power increase.
-   **Recovery:** Speed doesn't surpass Level 1 again until Level 8 (3.09 px/f). This confirms the "sluggish" feeling in the early-mid game.

### Formulae
-   **Density:** `0.002 + Level * 0.0001`
-   **Power:** `0.012 * 1.25^Level`
-   **Volume:** Quadratic growth.

## 4. Analysis
-   **Total Money Cap:** ~$49,000 (Soft Cap ~Lvl 12).
-   **Pacing:** Exponential costs.
-   **Physics Imbalance:** Verified. The bulldozer effectively gets slower/heavier relative to its engine power for the first ~7 levels of upgrades.
