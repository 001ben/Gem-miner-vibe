# Phase 1: Bulldozer Migration Checklist

This document tracks the active migration of the Bulldozer entity to the Domain-Driven architecture.

## Step 1: Directory Setup
- [ ] Create `src/domains/bulldozer/`
- [ ] Create `src/domains/bulldozer/pipeline/`

## Step 2: File Relocation & Renaming
- [ ] **Geometry**: Move `pipeline/blender/bulldozer.py` -> `src/domains/bulldozer/pipeline/generator.py`
- [ ] **Config**: Move `assets/configs/bulldozer_mapping.json` -> `src/domains/bulldozer/config.json`
- [ ] **Logic**: Move `src/entities/bulldozer.js` -> `src/domains/bulldozer/logic.js`
- [ ] **View**: Move `src/entities/bulldozer_render.js` -> `src/domains/bulldozer/view.js`
- [ ] **Texture**: Create `src/domains/bulldozer/pipeline/texture.py` (extracted from `pipeline/textures/generate_textures.py`)

## Step 3: Refactoring Imports
- [ ] Update `src/core/game.js` to import from `src/domains/bulldozer/logic.js`
- [ ] Update `src/core/game.js` to import from `src/domains/bulldozer/view.js`
- [ ] Update `src/core/input.js` to import from `src/domains/bulldozer/logic.js`
- [ ] Update `Taskfile.yml` to point to the new generator scripts

## Step 4: Verification
- [ ] Run `task build:assets` to ensure Python scripts still run
- [ ] Run `task dev` to ensure the game still loads
