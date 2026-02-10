# Agent Playtesting Guide

This document outlines how an AI agent can perform playtesting for the Gem Miner project to verify physics, mechanics, and game balance.

## Overview

Agent playtesting uses an automated "headless" environment or a scripted game session to simulate player behavior and collect metrics. This allows us to verify how changes (like physics tuning or gem value adjustments) affect the "vibe" and progression without requiring a human to manually play through every build.

## Playtesting Methods

### 1. Headless Physics Verification

Use the `verification/measure_scaling.py` script (and associated HTML harness) to simulate bulldozer movement and gem collection in a controlled environment.

- **Purpose:** Verifies collision boxes, pushing power, and movement curves.
- **How to run:**
    ```bash
    python3 verification/measure_scaling.py
    ```

### 2. Scripted Gameplay Simulation

By hooking into the `window.state` and `window.bulldozer` objects in the browser environment, an agent can "play" the game by simulating input commands.

- **Key Objects:**
    - `window.bulldozer`: Current position, speed, and physics properties.
    - `window.state`: Current money, upgrades, and progression.
    - `initInput()`: The input listener can be triggered via keyboard event simulations.

### 3. Metric Collection

When running a playtest, focus on the following metrics to determine if a change is successful:

- **Time to Goal:** How long it takes to collect $X$ amount of gems.
- **Movement Fluidity:** Number of collisions or "stuck" events per minute.
- **Upgrade ROI:** How much the "Time to Goal" decreases after a specific upgrade.

## Playtesting Workflow for Agents

1. **Checkout Branch:** Create a feature branch for the change.
1. **Apply Change:** Modify physics or game logic.
1. **Run Baseline:** Run the verification suite on `main` to get baseline metrics.
1. **Run Test:** Run the same suite on the feature branch.
1. **Compare & Report:** Provide a summary comparing the metrics (e.g., "Plow Level 3 is 15% faster at clearing the field, but inertia makes cornering harder").

## Future Goals

- Implement a `PlaytestRunner` class that can automate multi-minute sessions.
- Export telemetry data (JSON) from playtest sessions for long-term tracking.
