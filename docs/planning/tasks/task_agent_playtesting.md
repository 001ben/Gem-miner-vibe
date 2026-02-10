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
    1. **Input Simulation API (Control)**
        - Refactor input listeners to allow programmatic triggering via `window.agentInput.set(direction, value)`.
    1. **Session Recording (Reporting)**
        - Create a mechanism to export session metrics as a JSON blob for baseline comparison.

!!! example ":material-console: Execution Log"

    - [ ] **Phase 1: Telemetry (Core)**
        - Modify `src/core/state.js` to track session-based metrics.
        - Add `window.telemetry` exposure in `src/core/game.js`.
    - [ ] **Phase 2: Input Hook**
        - Refactor `src/core/input.js` to allow external overrides.
    - [ ] **Phase 3: Reporting**
        - Add a "Playtest Summary" modal/console log that appears when a session ends.

!!! success ":material-check-circle-outline: Definition of Done"

    - An agent can successfully move the bulldozer via a script.
    - A JSON report can be generated showing "Time to $1000".
