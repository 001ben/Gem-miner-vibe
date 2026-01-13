# Graphics System Design & Analysis

## Current Implementation

The current graphics implementation relies on a "Programmer Art" approach where 3D visuals are generated procedurally at runtime using Three.js primitives (`BoxGeometry`, `TorusGeometry`, `IcosahedronGeometry`).

### Architecture

- **State Synchronization:** The `updateGraphics()` loop iterates through all Matter.js physics bodies every frame.
- **1:1 Mapping:** Each physics body part (including compound body parts) creates and manages its own independent Three.js mesh.
- **Procedural Generation:** Visuals like the Bulldozer, Plow, and Collector are constructed by combining simple geometric shapes in code. Texture atlases or external models are not used.

## Deviation from Standard Practices

Industry-standard web game development (using engines like Three.js, Babylon, or PlayCanvas) typically follows different patterns:

1. **Asset-Based Workflow:**

    - **Standard:** Artists create models in tools like Blender/Maya/3ds Max and export them as `GLTF`/`GLB` files. These assets contain optimized geometry, UV maps, materials, and animations.
    - **Current:** Geometry is hard-coded. Adjusting the "look" (e.g., curving a plow) requires complex trigonometric math and geometry manipulation in code rather than moving vertices in an editor.

1. **Scene Graph Hierarchy:**

    - **Standard:** A single visual root object represents a game entity (e.g., a Tank). Physics bodies update the root's transform, and child nodes (turret, wheels) are animated relative to that root.
    - **Current:** Every physics sub-part (chassis, wheel, plow) drives its own mesh directly. This ensures tight physics matching but makes complex visual articulation (like suspension or smooth interpolation) harder to implement.

1. **Performance Optimization:**

    - **Standard:** Use **InstancedMesh** for identical objects (like Gems). This allows rendering thousands of items with a single draw call.
    - **Current:** Each Gem is a separate `Mesh` object. While Three.js handles frustum culling, the CPU overhead of updating thousands of individual scene graph nodes every frame limits the maximum gem density.

## Opportunities for Improvement

### 1. Asset Pipeline Integration

Moving to a GLTF loader workflow would immediately improve visual fidelity.

- **Action:** Create a `AssetManager` class to load `.glb` files.
- **Benefit:** "Real" modeled plows with proper curves, metallic textures, and baked ambient occlusion.

### 2. Instanced Rendering for Gems

The "Gem Fields" concept requires high object counts.

- **Action:** Replace individual `IcosahedronGeometry` meshes with a single `THREE.InstancedMesh` managed by a specialized `GemRenderer` system.
- **Benefit:** Could easily support 10,000+ gems at 60fps, allowing for massive "ocean of gems" gameplay.

### 3. Decoupled Rendering State

Currently, visuals snap to physics state.

- **Action:** Implement a state interpolation buffer. Render at screen refresh rate (e.g., 144Hz) while physics runs at fixed steps (60Hz), interpolating positions `(prev * (1-alpha) + curr * alpha)`.
- **Benefit:** Eliminates micro-stutter and provides buttery smooth motion, even if physics frames drop.

### 4. Shader Effects

- **Action:** Replace standard materials with custom ShaderMaterials for effects like "Glow" on high-value gems, "Heat distortion" behind the engine, or dynamic tracks that fade using a fragment shader time uniform instead of transparency updates.
