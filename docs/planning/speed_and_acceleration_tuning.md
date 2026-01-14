# Task: Speed & Acceleration Tuning

!!! info ":material-clock-time-four-outline: Metadata"
    -   **Status:** In Progress
    -   **Date:** 2026-01-13
    -   **Author:** Jules
    -   **Type:** Rebalance

!!! abstract ":material-text-box-search-outline: Context"
    The current movement physics are too aggressive. The bulldozer starts too fast at level 1, scales to uncontrollable speeds at high levels, and accelerates/stops almost instantly. We need to introduce more "weight" (inertia) and smooth out the progression curve.
    **Update:** The initial inertia fix (low friction) caused "drift/slippery" turning. We need to implement lateral friction to ensure snappy turns while keeping forward momentum.

!!! quote ":material-clipboard-list-outline: Plan"
    1.  **Adjust Physics Parameters**
        -   Lower `frictionAir` in `src/entities/bulldozer.js` to increase coasting (time to stop).
        -   Refactor Force calculation in `src/core/input.js` to align with the new friction and desired speed curve.
        -   Reduce the exponent for power scaling to prevent late-game uncontrollability.
    2.  **Fix Turning Drift**
        -   Implement "Lateral Friction" in `src/core/input.js` to dampen sideways velocity.
    3.  **Verify Scaling**
        -   Use `verification/measure_scaling.py` to generate new progression curves.
        -   Ensure Level 1 speed is manageable (~3-4 px/f) and Level 20 is fast but not broken (~25-30 px/f).

!!! example ":material-console: Execution Log"
    -   [ ] **Archive Old Plan**: Moved `task_scaling_rebalance.md` to archive.
    -   [ ] **Physics Tuning**: Adjusted `frictionAir` and Power formula.
    -   [ ] **Verification**: Generated new `progression_curves.png` and updated analysis doc.
