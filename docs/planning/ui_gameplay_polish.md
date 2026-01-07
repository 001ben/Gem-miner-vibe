# Plan: UI & Gameplay Polish

!!! info ":material-clock-time-four-outline: Metadata"

    - **Status:** Completed
    - **Date:** 2026-01-07
    - **Author:** Jules (AI Agent)

!!! abstract ":material-text-box-search-outline: Context"

    The project required several refinements to improve visual polish and fix gameplay bugs. Specifically:
    1.  **Money Mat**: The physical "mat" and 3D coin piles were causing visual clutter and were deemed unnecessary.
    2.  **Coin Animation**: A more engaging visual feedback for currency collection was requested, specifically animating "flying coins" to the UI counter.
    3.  **Collector Upgrade**: The collector logic scaled exponentially, causing the entity to extend infinitely and clip through map walls at high levels.

!!! quote ":material-clipboard-list-outline: Plan"

    1.  **Remove Money Mat**: Delete `createCoinPile`, `updateCoinPile`, and related groups from `src/core/graphics.js`.
    2.  **UI Animation**: Implement `spawnCoinDrop` using DOM elements (`.flying-coin`) and the Web Animations API to animate coins from world-space to the `#money` UI element.
    3.  **Collector Fix**: Refactor `src/entities/collector.js` to use linear scaling (`50 + (level-2)*50`) and cap the length at 500 units.
    4.  **Verification**: Add a Playwright script to verify the visual changes.

!!! example ":material-console: Execution Log"

    - [x] **Cleanup**: Removed `coinPileGroup` and related logic from `src/core/graphics.js`.
    - [x] **Animation**: Implemented DOM-based flying coin animation in `spawnCoinDrop`.
    - [x] **Styling**: Added `.flying-coin` class to `style.css`.
    - [x] **Fix**: Updated `src/entities/collector.js` to cap belt length and use linear growth.
    - [x] **Verification**: Verified via `verification/verify_changes.py` (flying coins detected).

!!! success ":material-robot: AI Summary"

    The tasks were successfully completed. The removal of the 3D money pile reduces scene complexity, while the new flying coin animation provides clear, satisfying feedback for the player. The collector upgrade logic is now robust against map boundary clipping.
