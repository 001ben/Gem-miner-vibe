# Task: Scaling Rebalance & Progression Tuning

!!! info ":material-clock-time-four-outline: Metadata"
    -   **Status:** In Progress
    -   **Type:** Rebalance / Feature
    -   **Dependencies:** `docs/living/guide/progression_analysis.md`

!!! abstract ":material-text-box-search-outline: Context"
    Refine the game's progression curve to ensure a satisfying "Power Fantasy" loop while maintaining challenge. Resolve the conflict between manual and automatic area unlocking.

!!! quote ":material-clipboard-list-outline: Plan"
    1.  **Resolve Unlock Logic**
        -   Remove the "Auto Unlock" feature from `gem.js`.
        -   Keep the Zone Progress notification but change the reward to a large "Bonus Cash" drop.
    2.  **Tune Economy (Inflation)**
        -   Increase Gem Values in Zone 3 (100-200 value).
    3.  **Refactor Physics Scaling (Engine)**
        -   Make Density scaling linear.
        -   Switch to "Power Rating" based Force calculation: `Force = 0.012 * 1.25^Level`. This provides a stronger acceleration curve than the previous 1.2x.
    4.  **Adjust Upgrade Curves (Plow & Collector)**
        -   **Plow:** Increase width scaling to `+8` per level. Wings scale with level.
        -   **Collector:** Ensure Belts visual scaling matches physics scaling.
    5.  **Cost Curve Smoothing**
        -   Change to `Cost = Base * (1.3 ^ (Level - 1))`.

!!! example ":material-console: Execution Log"
    -   [x] **Physics Fix**: Refactor density to linear, Force to Power-based model.
    -   [x] **Unlock Logic**: Remove auto-unlock and update Shop logic.
    -   [x] **Economy**: Tune Zone 3 gem values.
    -   [x] **Upgrades**: Adjust plow width/wings and smoothing cost curves.
    -   [x] **Re-tuning**: Increased engine power scaling to 1.25x to overcome quadratic mass growth.
