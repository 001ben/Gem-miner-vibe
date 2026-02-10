# Scaling Analysis and Verification

!!! info ":material-clock-time-four-outline: Metadata"

    - **Status:** In Progress
    - **Date:** 2024-05-23
    - **Author:** Jules
    - **Task:** `app-p1x`

!!! abstract ":material-text-box-search-outline: Context"

    Users have reported that the "Power Fantasy" element of the upgrades feels lacking. The visual and physical scaling of the bulldozer might not be matching the intended design curves. We need to verify the actual runtime values for Mass, Size, Force, and Top Speed across all levels (1-20).

!!! quote ":material-clipboard-list-outline: Plan"

    1. Create a headless (visual-less) harness `verification/scaling_harness.html` that runs the actual game physics code.
    1. Mock the graphics subsystem to avoid WebGL dependencies during testing.
    1. Automate the collection of data using a Playwright script `verification/measure_scaling.py`.
    1. Update `docs/guide/progression_analysis.md` with the empirical data.

!!! example ":material-console: Execution Log"

    - [ ] Create `verification/mocks/graphics.js`
    - [ ] Create `verification/scaling_harness.html`
    - [ ] Create `verification/measure_scaling.py`
    - [ ] Run analysis
    - [ ] Update documentation
