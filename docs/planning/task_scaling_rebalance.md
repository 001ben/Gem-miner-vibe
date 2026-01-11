# Task: Scaling Rebalance & Progression Tuning

!!! info ":material-clock-time-four-outline: Metadata"
    *   **Status:** Proposed
    *   **Type:** Rebalance / Feature
    *   **Dependencies:** `docs/guide/progression_analysis.md`

!!! abstract ":material-text-box-search-outline: Context"
    Refine the game's progression curve to ensure a satisfying "Power Fantasy" loop while maintaining challenge. Resolve the conflict between manual and automatic area unlocking.

!!! quote ":material-clipboard-list-outline: Plan"
    1.  **Resolve Unlock Logic**
        *   Remove the "Auto Unlock" feature from `gem.js`. Making area unlocks a deliberate Purchase Decision creates a stronger short-term goal for the player ("I need 500 gold to open the gate").
        *   Keep the Zone Progress notification but change the reward to a large "Bonus Cash" drop or simply a "Zone Clear" badge.

    2.  **Tune Economy (Inflation)**
        *   Current Total: ~$50k.
        *   Target Total: ~$100k.
        *   Action: Increase Gem Values in Zone 3 (Make them "Big Ticket" items, 100-200 value).
        *   This supports a few more high-level upgrades (Levels 12-15).

    3.  **Adjust Upgrade Curves**
        *   **Engine:** The linear speed increase is good, but maybe start slightly faster? Base `0.0025`.
        *   **Plow:** Increase width scaling slightly. `+8` per level instead of `+5`. Players love seeing the plow get massive.
        *   **Collector:**
            *   Level 1 is very weak (small circle).
            *   Make Level 1 slightly larger.
            *   Ensure Belts visual scaling matches physics scaling (currently procedural).

    4.  **Cost Curve Smoothing**
        *   The `x1.5` curve is harsh.
        *   Proposal: Change to `Cost = Base * (1.3 ^ (Level - 1))`.
        *   Comparison (Base 100):
            *   Lvl 5: x1.5 -> 506 | x1.3 -> 285
            *   Lvl 10: x1.5 -> 3844 | x1.3 -> 1060
            *   Lvl 15: x1.5 -> 29k | x1.3 -> 3900
        *   This allows players to reach higher levels (15-20) where the visual upgrades (massive plow, complex belts) are most satisfying.

    5.  **Visual Feedback**
        *   Ensure the "Next Upgrade Cost" is clearly visible *before* purchase (currently displayed on the pad?).
        *   Add a visual indicator when an upgrade is affordable (e.g., Pad glows green).

!!! example ":material-console: Execution Log"
    - [ ] Remove auto-unlock from `src/entities/gem.js`.
    - [ ] Update `src/entities/shop.js` to ensure Gate Unlock costs are balanced (500, 2500?).
    - [ ] Update `src/core/state.js` costs logic to use `1.3` multiplier.
    - [ ] Tweak `src/entities/bulldozer.js` stats.
