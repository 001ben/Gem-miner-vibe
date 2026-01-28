# Plow Asset Integration & Upgrades

!!! info ":material-clock-time-four-outline: Metadata"
    - **Status:** In Progress
    - **Date:** 2024-05-23
    - **Author:** Jules
    - **Tags:** Asset, Plow, Upgrades, Graphics, DAMP

!!! abstract ":material-text-box-search-outline: Context"
    A new plow asset (`plow.glb`) has been designed and merged (source files). This task focuses on integrating this asset into the game, enabling dynamic width upgrades (segment instancing), implementing wing scaling based on upgrades, and adding logic for toggleable teeth.

    **Reference:** [Plow Asset Design](plow_asset_design.md)

!!! quote ":material-clipboard-list-outline: Plan"
    1.  **Asset Loading**
        -   Update `BulldozerRenderer` to load `plow.glb` in addition to `bulldozer_components.glb`.
        -   Implement `loadPlow(url, configUrl)` to merge plow configuration into the main renderer config.
        -   Ensure `Plow_Segment`, `Plow_Tooth`, and `Plow_Wing` components are extracted from `plow.glb`.

    2.  **Plow Upgrades (Width)**
        -   Map `state.plowLevel` to `segmentCount`.
        -   **Formula:** `3 + (state.plowLevel - 1)` segments (Level 1 = 3 segments).
        -   Sync this value via `BulldozerRenderer.setPlowWidth()`.

    3.  **Wing Scaling**
        -   **Activation:** Wings appear at Level 3 (`state.plowLevel >= 3`).
        -   **Scaling Logic:** `1.0 + (state.plowLevel - 3) * 0.1` (Linear growth starting at Lvl 3).
        -   Update `BulldozerRenderer.updatePlow` to apply scaling to wing meshes (`wingL`, `wingR`).
        -   Expose `setPlowWings(enabled, scale)`.

    4.  **Teeth Logic**
        -   Implement conditional visibility for teeth.
        -   User requirement: "I don't want the teeth to always be enabled."
        -   Logic: Controlled by `state.plowTeethEnabled` flag.
        -   Expose `setPlowTeeth(enabled)`.

    5.  **Integration**
        -   Update `src/core/game.js` to trigger `loadPlow` after main assets are loaded.
        -   Update `src/core/graphics.js` inside `updateGraphics` to sync visual state with game state every frame.

!!! example ":material-bug-play-outline: Execution Log"
    - [x] Create tracking document.
    - [x] Update `BulldozerRenderer` to support separate plow loading (`loadPlow`).
    - [x] Implement wing scaling logic in renderer (`setPlowWings` with scale param).
    - [x] Hook up game state to renderer in `graphics.js` (sync level to width/wings).
    - [x] Verify code logic via Playwright verification script.
