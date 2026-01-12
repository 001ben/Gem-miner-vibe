# Progression Analysis (Current State)

!!! info "Metadata"
    -   **Date:** 2024-05-23
    -   **Version:** 1.5 (Tentative Implementation)
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

**Note:** Values reflect the "Tentative Fix" implemented in Version 1.5.

| Level | Mass | Width | Height | Max Speed (px/f) | Accel (Dist 5s) |
|-------|------|-------|--------|------------------|-----------------|
| 1 | 9.52 | 114.00 | 82.00 | 5.0033 | 1472.65 |
| 2 | 12.18 | 87.00 | 138.00 | 5.1772 | 1523.82 |
| 3 | 17.91 | 120.83 | 206.47 | 4.9038 | 1443.36 |
| 4 | 21.95 | 129.81 | 234.92 | 5.2152 | 1535.01 |
| 5 | 26.43 | 138.79 | 263.37 | 5.6216 | 1654.64 |
| 6 | 31.40 | 147.77 | 291.81 | 6.1363 | 1806.11 |
| 7 | 36.86 | 156.76 | 320.26 | 6.7783 | 1995.07 |
| 8 | 42.85 | 165.74 | 348.71 | 7.5732 | 2229.03 |
| 9 | 49.38 | 174.72 | 377.16 | 8.5538 | 2517.68 |
| 10 | 56.48 | 183.70 | 405.60 | 9.7623 | 2873.36 |
| 20 | 163.55 | 273.53 | 690.08 | 56.7815 | 16712.69 |

**Observations (Post-Fix):**
-   **Baseline Improvement:** Starting speed is now ~5.0 px/f (vs ~2.9), making the base bulldozer feel more responsive.
-   **Progression Gap:** The Level 3 "Dip" has been significantly mitigated (only a ~5% drop from Lvl 2, recovering by Lvl 4).
-   **Late Game:** Speed scales aggressively (up to ~56 px/f at Lvl 20), delivering the requested "Power Fantasy".

### Implemented Logic (Tentative)
`Force = (0.012 * 1.35^Level) + (Mass * 0.001)`

-   **Base Power:** Increased exponent from 1.25 to 1.35.
-   **Mass Compensation:** Added `Mass * 0.001` to force calculation.
