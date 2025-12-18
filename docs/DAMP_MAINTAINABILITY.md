# DAMP Pipeline: Maintainability & Organization Roadmap

## 1. Core Philosophy: "Explicit > Implicit"
The primary source of bugs in the current iteration is **Implicit Logic**—guessing mesh names, assuming alignment offsets, and relying on runtime discovery to fix build-time naming genericisms. To improve maintainability, we must shift to a contract-based architecture.

### The Contract Model:
- **Blender (Provider)**: Must explicitly tag meshes with a permanent `damp_id`.
- **JSON (Contract)**: Must define properties using that `damp_id`.
- **Renderer (Consumer)**: Must only look for `damp_id`, ignoring generic names like `Cube001`.

---

## 2. Structural Improvements

### A. Centralized Resource Loader (`AssetManager.js`)
Currently, cache-busting and fetching are spread across the viewer and renderer.
- **Problem**: Inconsistent caching leads to "ghost bugs" where code is new but assets are old.
- **Solution**: Create a singleton `AssetManager` that handles:
    - Centralized `cb()` (cache-busting) strategy.
    - Global texture registry (to avoid redundant cloning vs sharing).
    - Unified error reporting for missing assets.

### B. Standardized Component Lifecycle
The "Discovery" phase in the viewer currently fights with the Renderer's internal load.
- **Current Lifecycle**: Load GLB -> Guess Materials -> UI Scans Scene -> UI Updates Materials -> (Race Condition).
- **Proposed Lifecycle**:
    1. **Initialization**: Renderer loads GLB and JSON.
    2. **Mapping**: Renderer maps meshes to config using `damp_id` custom properties.
    3. **Registration**: Renderer emits a structured `Manifest` of all tunable parts.
    4. **UI Binding**: Viewer simply iterates the `Manifest` to build controls.
- **Benefit**: Eliminate race conditions and ensure the UI always reflects the internal state of the renderer.

### C. Decoupled Assembly Logic
Alignment offsets (Vertical/Spread) are currently split between Blender scripts, hardcoded Renderer defaults, and UI state.
- **Problem**: Changing a value in one place requires manual synchronization in three others.
- **Solution**: Move **all** assembly offsets into the `config.json`. Blender should export at origin `(0,0,0)`, and the JSON should dictate where the tracks sit relative to the body.

---

## 3. Organization Checklist for Maintainability

### Data Organization:
- [ ] **Standard Schema**: Define a `damp-schema.json` to validate asset mappings.
- [ ] **Asset Namespacing**: Move generated textures from `assets/textures/` to `assets/generated/` to clearly distinguish them from hand-authored source art.

### Code Organization:
- [ ] **Base Class**: Create a `BaseEntityRenderer` that handles the boilerplate (Three.js group management, `setPose`, `destroy`, generic `applyMaterial`).
- [ ] **Shared Utilities**: Move `cb()`, `getPointsFromMesh()`, and `enhanceMaterialWithTriplanar()` into a shared `js/utils/graphics-utils.js`.

---

## 4. Debugging & Observability
Non-obvious bugs thrive in silent failures.
- **Action**: Implement a "Debug Overlay" in the Asset Director that highlights the selected mesh in the 3D scene (e.g., using a wireframe helper or a bounding box).
- **Action**: Ensure every `[WARN]` and `[ERROR]` includes the specific component name and file path that failed.

---

## 5. Phase 1: Immediate Maintenance Actions
1. **Refactor Blender Output**: Update `bulldozer.py` to add custom properties to objects: `obj["damp_id"] = "chassis"`.
2. **Standardize Utility Imports**: Replace multiple `cb()` definitions with a single imported utility.
3. **Consolidate Offset Logic**: Move the perfect offsets (`-0.53`, `0.15`) into the `bulldozer_mapping.json` under an `assembly` key.

---
*Updated: Thursday 18 December 2025*
*Focus: Long-term code health and developer ergonomics.*
