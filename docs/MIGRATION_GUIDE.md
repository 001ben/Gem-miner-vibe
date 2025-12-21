# DAMP File Migration Guide

## 1. Executive Summary
This document serves as the execution plan for transitioning the project from a **Horizontal (Layered)** structure to a **Vertical Slice (Domain-Driven)** architecture. The target state is defined in `docs/LAYER_ACTIVITY_GUIDE.md`.

## 2. Target Architecture Checklist
For each entity (e.g., Bulldozer, Map, Shop), we will create a folder in `src/domains/{entity}/` containing:

- [ ] **Geometry**: `pipeline/generator.py` (formerly `pipeline/blender/*.py`)
- [ ] **Texture**: `pipeline/texture.py` (extracted from `pipeline/textures/*.py`)
- [ ] **Config**: `config.json` (formerly `assets/configs/*.json`)
- [ ] **Logic**: `logic.js` (formerly `src/entities/*.js`)
- [ ] **View**: `view.js` (formerly `src/entities/*_render.js`)

## 3. Migration Plan: Phase 1 (Bulldozer Pilot)

### Step 1: Directory Setup
- [ ] Create `src/domains/bulldozer/`
- [ ] Create `src/domains/bulldozer/pipeline/`

### Step 2: File Relocation & Renaming
- [ ] **Move** `pipeline/blender/bulldozer.py` -> `src/domains/bulldozer/pipeline/generator.py`
- [ ] **Move** `assets/configs/bulldozer_mapping.json` -> `src/domains/bulldozer/config.json`
- [ ] **Move** `src/entities/bulldozer.js` -> `src/domains/bulldozer/logic.js`
- [ ] **Move** `src/entities/bulldozer_render.js` -> `src/domains/bulldozer/view.js`
- [ ] **Extract** texture logic from `pipeline/textures/generate_textures.py` -> `src/domains/bulldozer/pipeline/texture.py`

### Step 3: Refactoring Imports
- [ ] Update `src/core/game.js` to import from `src/domains/bulldozer/logic.js`.
- [ ] Update `src/core/game.js` to import from `src/domains/bulldozer/view.js`.
- [ ] Update `Taskfile.yml` to point to the new generator scripts.

### Step 4: Verification
- [ ] Run `task build:assets` to ensure Python scripts still run.
- [ ] Run `task dev` to ensure the game still loads.

## 4. Migration Plan: Phase 2 (Standardization)
Once the Bulldozer pilot is successful, repeat the process for:

- [ ] **Collector** (`src/domains/collector/`)
- [ ] **Conveyor** (`src/domains/conveyor/`)
- [ ] **Gem** (`src/domains/gem/`)
- [ ] **Map** (`src/domains/map/`)
- [ ] **Shop** (`src/domains/shop/`)

## 5. Cleanup
After all domains are migrated:
- [ ] Delete `src/entities/`
- [ ] Delete `pipeline/blender/`
- [ ] Delete `pipeline/textures/`
- [ ] Delete `assets/configs/`
