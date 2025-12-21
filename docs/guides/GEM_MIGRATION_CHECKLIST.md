# Phase 2: Gem Migration Checklist

This document tracks the active migration of the Gem entity to the Domain-Driven architecture.

## Step 1: Directory Setup
- [x] Create `src/domains/gem/`
- [ ] Create `src/domains/gem/pipeline/` (Skipped: No procedural assets yet)

## Step 2: File Creation & Relocation
- [ ] **Config**: Create `src/domains/gem/config.json` (Skipped: Keeping in code for now)
- [x] **Logic**: Move `src/entities/gem.js` -> `src/domains/gem/logic.js`
- [x] **View**: Create `src/domains/gem/view.js` by extracting InstancedMesh logic from `src/core/graphics.js`.
- [ ] **Geometry**: (Skipped: No procedural assets yet)

## Step 3: Refactoring Graphics Core
- [x] **Extract**: Move `gemInstancedMeshes` and the update loop from `src/core/graphics.js` to `src/domains/gem/view.js`.
- [x] **Interface**: Expose an `updateGems(delta)` or `syncGems()` function in `view.js` called by the main loop.

## Step 4: Refactoring Imports
- [x] Update `src/core/game.js` to import from `src/domains/gem/logic.js`
- [x] Update `src/entities/collector.js` (and others) to point to the new location.

## Step 5: Verification
- [x] Run `task dev` to ensure gems spawn and render correctly.
- [x] Verify performance (Instancing still working).
