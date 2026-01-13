# DAMP Pipeline Review & Design Commentary

## 1. Architectural Overview

The Distributed Asset & Material Pipeline (DAMP) successfully bridges the gap between **Programmatic CAD (Blender/Python)** and **Real-time Web Rendering (Three.js)**. It follows a "Source-of-Truth" model where geometry is generated on-demand, and a JSON configuration layer decouples the visual styling from the raw mesh data.

### The Flow:

1. **Geometry (`bulldozer.py`)**: Defines the "bones" and "shell" of the entity using Blender's Python API.
1. **Texture Gen (`bulldozer.py`)**: Captures procedural details into static PNGs to avoid expensive real-time procedural overhead.
1. **Orchestration (`build-assets.js`)**: Compiles raw assets into a `catalog.json` for the web runtime and ensures consistent directory structures.
1. **Configuration (`bulldozer_mapping.json`)**: Defines the "skin"—mapping textures and material physics (roughness, metalness, transparency) to specific meshes.
1. **Runtime (`bulldozer_render.js`)**: Interprets the GLB + Config to assemble the final high-fidelity entity in the game engine.

______________________________________________________________________

## 2. Design Commentary

### Strengths

- **WYSIWYG Development**: The Asset Director (Viewer) allows for real-time material tuning that can be exported directly to the game's config files.
- **Decoupled Logic**: Geometry changes in Blender don't require code changes in the game engine, provided the naming conventions remain stable.
- **Performance Optimization**: By baking procedural textures into PNGs during the build step, client-side GPU load is kept low while maintaining high visual detail.
- **Material Presets**: The "Preset" system (e.g., Glass, Track) allows for high-fidelity Three.js materials to be defined in code while still being configurable via JSON.

### Current Challenges (The "Magic" Mapping)

The most brittle part of the current design is the **Generic Mesh Mapping**.

- **Issue**: When Blender joins meshes, it creates names like `Cube001`, `Cube001_1`. The renderer has to "guess" that `Cube001_1` is a wheel based on material or generic string matches.
- **Risk**: Changes in Blender's joining order could swap these names, breaking the texture mapping in the game.

______________________________________________________________________

## 3. Technical Review & Cleanup

### `assets/source/blender/bulldozer.py`

- **Review**: Highly functional script. Current logic joins components (Cabin/Body) into a single mesh for simplicity.
- **Suggestion**: Transition to **Parenting** instead of `bpy.ops.object.join()`. Keeping components as separate objects in the GLB allows the renderer to find them directly by name without complex mapping logic.

### `js/entities/bulldozer_render.js`

- **Review**: The `applyMaterial` logic currently performs heavy string matching to "fix" generic Blender export names.
- **Cleanup**: Standardize the `cb()` (cache-busting) utility across the project to reduce code duplication.

### `viewer/src/main.js`

- **Review**: The UI "Discovery" logic is clever but can be prone to race conditions with the renderer's initial load.
- **Cleanup**: Centralize component discovery within the `BulldozerRenderer` itself.

______________________________________________________________________

## 4. Proposed Improvements (Roadmap)

### Phase 1: Explicit Component Tagging (High Priority)

Instead of matching strings like `"Cube"`, we should use **Blender Custom Properties**.

- **Blender Python**: `obj["damp_id"] = "Chassis"`
- **Three.js Runtime**: The GLTF loader preserves these in `mesh.userData.damp_id`.
- **Result**: 100% reliable mapping regardless of mesh joining or renaming.

### Phase 2: Unified Material Schema

Formalize the mapping JSON into a generic schema that supports:

- `emissive` properties for glowing lights.
- `normalMap` support for surface bump details.
- `envMapIntensity` for more realistic glass reflections.

### Phase 3: Build Pipeline Hardening

- **Schema Validation**: Validate JSON configs against a schema during the build step to catch typos before runtime.
- **Automated Thumbnails**: Integrate a headless browser step to generate preview thumbnails for the `catalog.json`.

______________________________________________________________________

## 5. Immediate Cleanup Checklist

- [ ] **Consolidate Utilities**: Move `cb()` cache-busting to a shared utility file.
- [ ] **Blender Refactor**: Update `bulldozer.py` to use parenting instead of joining for critical components.
- [ ] **Remove Legacy Artifacts**: Delete `existing_pipeline_files.txt` and unused `/verification` scripts.
- [ ] **Standardize Interfaces**: Ensure all renderers use the same `setPose(position, angle)` interface.

______________________________________________________________________

*Review Date: Thursday 18 December 2025*
