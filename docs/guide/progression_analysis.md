# Progression Analysis (Current State)

!!! info "Metadata"

    - **Date:** 2026-01-13
    - **Version:** 1.7 (Verified Logic & Plots)
    - **Scope:** Current values for costs, entity stats, and economy.

!!! abstract "Context"

    This document outlines the current mathematical models governing the game's progression, including upgrade costs, entity scaling, and economic availability.

## 1. Economy (Gems)

The game world is divided into three zones. Gems are the sole source of currency.

| Zone      | Gems     | Value Range | Avg Value | Zone Total (Approx) | Unlock Condition        |
| :-------- | :------- | :---------- | :-------- | :------------------ | :---------------------- |
| **1**     | 400      | 8 - 12      | 10        | $4,000              | Start                   |
| **2**     | 400      | 25 - 40     | 32.5      | $13,000             | 50% of Zone 1 Collected |
| **3**     | 400      | 60 - 100    | 80        | $32,000             | 50% of Zone 2 Collected |
| **Total** | **1200** |             |           | **~$49,000**        |                         |

## 2. Upgrade Costs

All upgrades follow a simple exponential growth curve: `NewCost = floor(OldCost * 1.5)`.

| Upgrade       | Base Cost | Growth | Cost @ Lvl 5 | Cost @ Lvl 10 |
| :------------ | :-------- | :----- | :----------- | :------------ |
| **Engine**    | 100       | x1.5   | 506          | 3,844         |
| **Plow**      | 100       | x1.5   | 506          | 3,844         |
| **Collector** | 150       | x1.5   | 759          | 5,766         |

## 3. Entity Scaling Verification

### Performance Curves

The following charts illustrate **Top Speed** (px/frame) and **Acceleration** (Distance traveled in 5s) across three progression scenarios:

1. **A: Engine Lag (Engine=1, Plow=1):** The "Control" group. The player upgrades only the Collector. Since the Collector is a static sensor body, it does not affect the bulldozer's mass or physics. This line is expected to be flat.
1. **B: Engine Focus (Plow=1):** The "Racer" build. The player upgrades only the Engine, keeping the Plow at Level 1. This minimizes mass gain while maximizing power, resulting in the highest possible speeds.
1. **C: Balanced (All Levels Equal):** The "Standard" progression. The player upgrades Engine, Plow, and Collector roughly equally. This curve represents the intended "Power Fantasy", balancing increased mass (from the Plow) with increased power.

![Progression Curves](progression_curves.png)

### Methodology

These graphs were generated empirically by `verification/measure_scaling.py`. The script uses a headless version of the game's physics engine (`verification/scaling_harness.html`) to simulate the bulldozer's movement over 300 frames (5 seconds) for each permutation of levels 1-20.

- **Speed:** Peak velocity magnitude observed during the run.
- **Acceleration:** Total distance traveled from a standstill in 5 seconds.

### Wingtip Offsets (Plow Width Scaling)

As the plow upgrades (Level 3+), "wings" are added. The table below shows the offset of the wingtip relative to the main plow edge.

| Level | Wingtip Offset (units) |
| :---- | :--------------------- |
| 1-2   | 0.00                   |
| 3     | 28.83                  |
| 5     | 36.79                  |
| 10    | 56.70                  |
| 20    | 96.53                  |

**Observations (Post-Fix):**

- **Baseline Improvement:** Starting speed is now ~5.0 px/f (vs ~2.9), making the base bulldozer feel more responsive.
- **Progression Gap:** The Level 3 "Dip" has been significantly mitigated.
- **Late Game:** Speed scales aggressively (up to ~56 px/f at Lvl 20), delivering the requested "Power Fantasy".

### Implemented Logic

`Force = (0.012 * 1.35^Level) + (Mass * 0.001)`

- **Base Power:** Increased exponent from 1.25 to 1.35.
- **Mass Compensation:** Added `Mass * 0.001` to force calculation.
