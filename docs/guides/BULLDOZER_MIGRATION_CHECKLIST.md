# Phase 1: Bulldozer Migration Checklist

This document tracks the active migration of the Bulldozer entity to the Domain-Driven architecture.

## Step 1: Directory Setup
- [x] Create `src/domains/bulldozer/`
- [x] Create `src/domains/bulldozer/pipeline/`

## Step 2: File Relocation & Renaming
- [x] **Geometry**: Move `pipeline/blender/bulldozer.py` -> `src/domains/bulldozer/pipeline/generator.py`
- [x] **Config**: Move `assets/configs/bulldozer_mapping.json` -> `src/domains/bulldozer/config.json`
- [x] **Logic**: Move `src/entities/bulldozer.js` -> `src/domains/bulldozer/logic.js`
- [x] **View**: Move `src/entities/bulldozer_render.js` -> `src/domains/bulldozer/view.js`
- [x] **Texture**: Create `src/domains/bulldozer/pipeline/texture.py` (extracted from `pipeline/textures/generate_textures.py`)

## Step 3: Refactoring Imports
- [x] Update `src/core/game.js` to import from `src/domains/bulldozer/logic.js`
- [x] Update `src/core/game.js` to import from `src/domains/bulldozer/view.js`
- [x] Update `src/core/input.js` to import from `src/domains/bulldozer/logic.js`
- [x] Update `Taskfile.yml` to point to the new generator scripts

## Step 4: Verification
- [x] Run `task build:assets` to ensure Python scripts still run
- [x] Run `task dev` to ensure the game still loads
