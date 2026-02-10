# Task: Implement Agent Playtesting Framework

!!! info ":material-clock-time-four-outline: Metadata"

    - **Status:** :material-timer-sand: Planning
    - **Type:** Infrastructure / DevOps
    - **Dependencies:** None

!!! abstract ":material-text-box-search-outline: Context"

    Build the necessary infrastructure to allow AI agents to perform automated, measurable playtests of the Gem Miner game. This will enable regression testing for physics, mechanics, and game balance without manual human intervention.

!!! quote ":material-clipboard-list-outline: Plan"

    1. **Telemetry Interface (Data Extraction)**
        - Expose a consistent set of metrics to the `window.telemetry` object.
        - Return values: `money`, `gemCollectionCount`, `averageSpeed`, and `collisionCount`.
        - **Spatial Signals:** Add `window.telemetry.getSensors()` to return relative vectors to the 5 nearest gems and the collector (essential for non-visual AI agents).
    1. **Input Simulation API (Control)**
        - Refactor input listeners to allow programmatic triggering via `window.agentInput.set(direction, value)`.
    1. **Heuristic "Bot" Controller (Playtester)**
        - Implement a simple heuristic script (non-LLM) that uses the Spatial Signals to navigate toward gems.
        - **Visual Observation:** Add an "Auto-Play" toggle button to the UI (enabled only in non-production/preview builds) so developers can observe the AI behavior in real-time.
        - **Rationale:** Using an LLM to "play" the game frame-by-frame is too slow and expensive. A local script performs the playtest; the LLM only analyzes the *summary* report.
    1. **Signal Distillation (Noise Reduction)**
        - **Event-Based Logging:** Instead of frame-by-frame logs, record only significant events (Gem Collected, Upgrade Purchased, Collision > Force X).
        - **Delta Compression:** Only report state changes.
        - **Statistical Summary:** The final output to the LLM should be a distilled 1-page summary of histograms and averages, not a raw coordinate log.
    1. **Baseline Generation Suite**
        - Implement a script to capture "Gold Master" metrics from the current `main` branch.
    1. **Environment Automation (CI/CD)**
        - Integrate the playtesting script into GitHub Actions.

!!! example ":material-console: Execution Log"

    - [ ] **Phase 1: Telemetry & Spatial Sensors (Core)**
        - Modify `src/core/state.js` to track session-based metrics.
        - Implement "Nearest Neighbor" sensor logic for gems/collector.
        - Add `window.telemetry` exposure in `src/core/game.js`.
    - [ ] **Phase 2: Input Hook & Heuristic Bot**
        - Refactor `src/core/input.js` to allow external overrides.
        - Create `tools/playtest/simple_bot.js` to demonstrate basic navigation.
        - Add "Auto-Play" UI toggle (conditional on build environment).
    - [ ] **Phase 3: Signal Distiller & Reporting**
        - Implement the event-based logger to filter out "idle" frames.
        - Add a summary generator that outputs LLM-friendly markdown reports.
    - [ ] **Phase 4: Baseline & CI**
        - Add baseline capture scripts to `verification/`.
        - Add a `.github/workflows/playtest.yml` workflow.

!!! success ":material-check-circle-outline: Definition of Done"

    - An agent/script can navigate the bulldozer to a gem using telemetry sensors.
    - A distilled markdown report (under 2KB) is generated for a 60-second session.
    - The CI suite runs a playtest on every Pull Request and flags significant regressions.
    - Developers can toggle "Auto-Play" in PR previews to watch the bot session.
