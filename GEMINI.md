# Gemini Session Summary: DAMP Pipeline Evolution

This document tracks the key technical findings, architectural decisions, and critical "NO" moments (course corrections) during the development of the Distributed Asset & Material Pipeline (DAMP).

## 🚀 The Core Achievement: The Explicit Contract
We successfully transitioned from an **Implicit Pipeline** (guessing mesh names like `Cube001`) to an **Explicit Contract Model**. 
- **Blender** explicitly tags materials and objects with `damp_id`.
- **JSON** defines properties using those IDs.
- **Renderer** strictly enforces the contract (ID or Magenta Error).

---

## 🛠 Key Technical Findings

### 1. Parenting > Joining
*   **Discovery**: `bpy.ops.object.join()` in Blender destroys Object-level metadata and forces Three.js to split primitives at runtime, causing race conditions.
*   **Solution**: Use **Parenting**. It preserves the logical hierarchy, keeps unique names/IDs intact, and allows for independent material tuning without complex "heuristic" code.

### 2. Material-Level Tagging
*   **Discovery**: Custom properties on Materials are more resilient than on Objects. Even if geometry is merged, Three.js preserves material slots.
*   **Impact**: Tagging materials directly (`MAT_Glass["damp_id"] = "cabin"`) eliminated 50+ lines of brittle string-matching code in the renderer.

### 3. Procedural Static Assets
*   **Discovery**: Running complex procedural noise in real-time on the GPU is expensive and hard to tune.
*   **Solution**: Bake the "vibe" into PNGs using a standalone Python script (`generate_textures.py`) during the build step.

---

## 🛑 The "NO" Wall: Critical Corrections
*Significant moments where the user rejected a path, leading to a better architecture.*

1.  **NO to Local Libs**: I initially tried to bundle Three.js locally in the viewer. 
    *   *Correction*: "We switched to unpkg." 
    *   *Lesson*: Keep the repo lean; use CDNs for standardized dependencies.
2.  **NO to "One-Size-Fits-All" Texturing**: I initially applied one texture to the whole GLB.
    *   *Correction*: "Our actual bulldozer uses different textures per component."
    *   *Lesson*: The pipeline must support granular, component-level material mapping.
3.  **NO to Manual Scaling**: I tried to fix alignment by manually setting scales/positions in JS.
    *   *Correction*: This resulted in "tiny bodies and giant tracks."
    *   *Lesson*: **Bake transforms in the source (Blender)**. Vertices should be normalized at `(1,1,1)` before export.
4.  **NO to Heuristic Fallbacks**: I added `if (name.includes("Cube"))` to handle Blender's generic names.
    *   *Correction*: "Don't use fallbacks at all. Use IDs or error."
    *   *Lesson*: Reliability comes from explicit contracts, not clever guessing.
5.  **NO to Lazy Refactoring**: I used `// ... logic here` placeholders in a file write.
    *   *Correction*: "Please don't use '... this logic' when making edit changes."
    *   *Lesson*: Always provide complete, functional source code.

---

## 🏗 Maintainability Checklist
- [x] **Modular Build**: 5-step process orchestrated by Taskfile.
- [x] **Asset Isolation**: Textures and models separated from core game logic.
- [x] **Verification**: `task build:verify` provides a raw look at the GLB "Contract" before it hits the web.
- [x] **Zero-Cache**: Dynamic import maps and server headers ensure the latest code is always live.

*Session Date: Thursday 18 December 2025*
