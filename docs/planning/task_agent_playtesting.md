# Task: Implement Agent Playtesting Framework

This task involves building the necessary infrastructure to allow AI agents to perform automated, measurable playtests of the Gem Miner game.

## Status: :material-timer-sand: Planning

## Required Infrastructure

### 1. Telemetry Interface
We need to expose a consistent set of metrics to the `window` object so that an agent (via Playwright or simple browser scripting) can scrape them.
- **`window.telemetry.getMetrics()`**: Should return:
    - `money`: Current balance.
    - `gemCollectionCount`: Total gems collected in session.
    - `averageSpeed`: Average speed over the last 10 seconds.
    - `collisionCount`: Total number of physical collisions.

### 2. Input Simulation API
Currently, inputs are tied to keyboard listeners. We need a way to programmatically trigger inputs without actual key events.
- **`window.agentInput.set(direction, value)`**: e.g., `set('up', true)`.

### 3. Session Recording
A way to export the session metrics as a JSON blob at the end of a run for comparison against a baseline.

## Implementation Steps

1.  **[ ] Phase 1: Telemetry (Core)**
    - Modify `src/core/state.js` to track session-based metrics.
    - Add `window.telemetry` exposure in `src/core/game.js`.
2.  **[ ] Phase 2: Input Hook**
    - Refactor `src/core/input.js` to allow external overrides.
3.  **[ ] Phase 3: Reporting**
    - Add a "Playtest Summary" modal/console log that appears when a session ends.

## Definition of Done
- An agent can successfully move the bulldozer via a script.
- A JSON report can be generated showing "Time to $1000".
