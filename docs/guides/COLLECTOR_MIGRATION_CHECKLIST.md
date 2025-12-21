# Phase 3: Collector Migration Checklist

This document tracks the active migration of the Collector entity to the Domain-Driven architecture.

## Step 1: Directory Setup
- [x] Create `src/domains/collector/`
- [x] Create `src/domains/collector/pipeline/` (Skipped: No procedural assets yet)

## Step 2: File Relocation
- [x] **Config**: Create `src/domains/collector/config.json` (Skipped: Keeping in code for now)
- [x] **Logic**: Move `src/entities/collector.js` -> `src/domains/collector/logic.js`
- [x] **View**: Create `src/domains/collector/view.js` by extracting Collector rendering logic from `src/core/graphics.js`.

## Step 3: Refactoring Graphics Core
- [x] **Extract**: Move the `createMesh` logic for `label === 'collector'` from `src/core/graphics.js` to `src/domains/collector/view.js`.
- [x] **Interface**: Expose an `init(scene)` or `createMesh(body)` function in `view.js`.
- [x] **Update Loop**: Ensure `graphics.js` delegates Collector rendering to the new View module.

## Step 4: Refactoring Imports
- [x] Update `src/core/game.js` to import from `src/domains/collector/logic.js`
- [x] Update `src/entities/shop.js` to import from `src/domains/collector/logic.js`
- [x] Update `src/core/ui.js` to import from `src/domains/collector/logic.js`

## Step 5: Verification
- [x] Run `task dev` to ensure the Collector spawns and functions.
- [x] Verify shop upgrades for the Collector still work.
