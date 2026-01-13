# The DAMP Strategy

**Distributed Asset & Material Pipeline**

!!! info ":material-shield-star: Core Philosophy"

    **Explicit > Implicit**

    We never rely on "Implicit Logic" (guessing mesh names like `Cube001`, assuming default alignments, or relying on runtime discovery).
    We rely on **Explicit Contracts** defined by `damp_id`.

## 🤝 The Explicit Contract

The pipeline relies on a strict contract between the **Provider** (Blender) and the **Consumer** (Three.js).

| Role | Responsibility | Mechanism |
| :--- | :--- | :--- |
| **Provider** (Blender) | Tag specific meshes and materials with a permanent ID. | `obj["damp_id"] = "chassis"` |
| **Artifact** (GLB) | Carry these IDs safely through the export process. | `mesh.userData.damp_id` |
| **Consumer** (Game) | Find objects solely by ID, ignoring hierarchy or names. | `findBodyPart("chassis")` |

### Why?

Traditional pipelines break when an artist (or script) changes the hierarchy.
If `Cube001` becomes `Cube001.001` after a boolean operation, code like `scene.getObjectByName("Cube001")` fails.
With DAMP, the object name is irrelevant. Only the `damp_id` matters.

---

## 🏗 Architectural Decisions

### 1. Parenting over Joining

!!! quote "Rule"
    **Never use `bpy.ops.object.join()` for logical components.**

**Rationale**: Joining meshes destroys object-level metadata. If you join a "Glass" cabin with a "Steel" body, you lose the ability to easily separate them at runtime.
**Solution**: Parent components to a main body. The renderer traverses the children and checks their `damp_id`.

### 2. Material-Level Tagging

!!! quote "Rule"
    **Tag Materials (`mat["damp_id"]`) in addition to Objects.**

**Rationale**: Three.js preserves material slots even if geometry is merged. This allows us to identify "Glass" parts even if they are part of a larger mesh.

### 3. Baked Transforms

!!! quote "Rule"
    **Bake Scale and Rotation in Blender.**

**Rationale**: Runtime rotation fixes (e.g., `mesh.rotation.x = -Math.PI/2`) often lead to "Tiny Bodies and Giant Tracks" bugs when physics and graphics desync.
**Solution**: We ensure that `(0,0,0)` rotation in Blender corresponds to `(0,0,0)` in the game engine (Z-Up to Y-Up conversion is handled during export/import).

---

## 🔄 Component Lifecycle

The standard lifecycle for an asset-based entity (like the `BulldozerRenderer`):

=== ":material-creation: Init"
    Physics body is created immediately (invisible). The game can start simulating physics before graphics are loaded.

=== ":material-download: Load"
    `BulldozerRenderer` fetches the `.glb` file asynchronously.
    It checks `catalog.json` to know which file to load.

=== ":material-cog: Setup"
    1.  **Traverse**: Iterate through all child meshes.
    2.  **Identify**: Check `userData.damp_id`.
    3.  **Extract**:
        -   `track_path`: Extract curve data for tread animation.
        -   `chassis`: Apply standard materials.
        -   `glass`: Apply transparent materials.

=== ":material-sync: Update"
    Every frame, the root Mesh position and rotation are snapped to the Physics Body.
