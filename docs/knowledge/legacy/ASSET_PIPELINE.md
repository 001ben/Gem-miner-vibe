# Asset Pipeline & Material Challenges (Legacy)

!!! warning ":material-archive: Legacy Document (May 2025)"
    This document describes the deprecated OpenSCAD pipeline. It is preserved for historical context. The current project uses the **DAMP (Blender/Python)** pipeline.

## Current Architecture

Our "Programmer CAD" pipeline currently operates as follows:

1. **Source:** Parametric geometry defined in OpenSCAD (`.scad`).
1. **Compilation:** OpenSCAD CLI exports the geometry to **ASCII STL**.
1. **Conversion:** A custom script (`stl2obj.js`) converts STL to OBJ.
1. **Packaging:** `obj2gltf` converts OBJ to binary GLTF (`.glb`).

## Implemented Strategy: Component-Based Assembly

To solve the "monolithic mesh" color limitation of STL, we have adopted a **Component-Based Assembly** strategy.

- **Workflow:**
    - Instead of one `bulldozer.scad`, we maintain separate source files:
        - `bulldozer_body.scad`
        - `bulldozer_tracks.scad`
        - `bulldozer_cabin.scad`
    - The build pipeline (`npm run build:assets`) compiles these individually into `.glb` files.
- **Runtime Assembly:**
    - The game engine (Three.js) loads these separate assets.
    - They are added to a single `THREE.Group` container.
    - **Colors/Materials:** Because each part is a distinct mesh, we can assign different materials to them programmatically (e.g., `bodyMesh.material = yellowMaterial`, `tracksMesh.material = darkMaterial`).

## Future Roadmap: Advanced Visuals & Best Practices

As we look to move beyond simple solid colors, here are the challenges and best practices for a "Programmer CAD" (Code-first) workflow vs. a traditional Artist workflow.

### 1. Textures & Surface Detail

**The Challenge:**
Standard 3D texturing relies on **UV Mapping**—unwrapping a 3D object onto a 2D plane so an image can be painted on it. OpenSCAD / CSG (Constructive Solid Geometry) tools do *not* generate UV maps automatically, and "unwrapping" a procedurally generated mesh manually defeats the purpose of an automated pipeline.

**Best Practice for Programmer CAD:**

- **Triplanar Mapping:** Instead of using UVs, use a special shader (or Three.js node material) that projects textures onto the object from the Top, Front, and Side (X, Y, Z axes). This allows you to apply "Dirt", "Rust", or "Scratches" textures to any shape without manual work.
- **Matcaps (Material Capture):** Use `THREE.MeshMatcapMaterial`. This uses a spherical reference image to fake complex lighting and reflection (e.g., chrome, shiny car paint) cheaply. It looks great and requires no UVs.
- **Decals:** For specific details (like a "Hazard Stripe" or a Logo), use a separate floating mesh or a "Decal" geometry placed slightly above the surface, rather than trying to texture the main body.

### 2. Animations

**The Challenge:**
Traditional game assets use "Skinned Meshes" (bones/skeletons) to deform geometry (e.g., a character bending their arm). OpenSCAD exports static rigid meshes. We cannot easily add "bones" to an STL file in this pipeline.

**Best Practice for Programmer CAD:**

- **Hierarchical / Rigid Body Animation:** This is what we already support with the Component-Based Assembly.
    - *Example:* To animate the plow moving up and down, we do not bend the metal. We verify the `plow.glb` is its own object, and in the game code, we change its `position.y` or `rotation.x`.
    - *Example:* To animate tracks, we don't deform the rubber. We scroll the texture on the tracks (UV offset animation) or rotate the wheels if they are separate parts.
- **Code-Driven Motion:** All animation should be driven by game state (physics, input), not pre-baked animation clips (like an `.fbx` file might have). This gives the "programmer" ultimate control.

### Summary of "Programmer Art" Stack

| Feature       | Traditional Workflow (Blender/Maya) | Our Workflow (OpenSCAD/Three.js)   |
| :------------ | :---------------------------------- | :--------------------------------- |
| **Geometry**  | Hand-modeled polygons               | Code-defined primitives (CSG)      |
| **Colors**    | Texture Maps / Vertex Paint         | Separate Parts / Runtime Materials |
| **Textures**  | Manual UV Unwrapping                | Triplanar Mapping / Matcaps        |
| **Animation** | Skeletal Rigging / Keyframes        | Hierarchical Code Manipulation     |

**Next Steps Recommendation:**

1. Stick to solid colors for now to keep the style clean (e.g., "Low Poly" aesthetic).
1. If detail is needed, explore **Triplanar Mapping** shaders to add noise/grit without needing asset changes.
1. For the plow animation, ensure the plow is a separate asset from the body so it can be moved independently in code.
