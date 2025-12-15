# Asset Pipeline & Material Challenges

## Current Architecture

Our "Programmer CAD" pipeline currently operates as follows:

1.  **Source:** Parametric geometry defined in OpenSCAD (`.scad`).
2.  **Compilation:** OpenSCAD CLI exports the geometry to **ASCII STL**.
3.  **Conversion:** A custom script (`stl2obj.js`) converts STL to OBJ.
4.  **Packaging:** `obj2gltf` converts OBJ to binary GLTF (`.glb`).

## The Color/Material Challenge

Currently, all assets appear as a single solid color (or are manually colored as a single unit in the viewer). This is due to fundamental limitations in the current format chain:

1.  **STL Limitations:** The STL format (Stereolithography) describes only the surface geometry of a three-dimensional object without any representation of color, texture, or other common CAD model attributes. When OpenSCAD exports to STL, all color information defined in the code (e.g., `color("red") cube(...)`) is discarded.
2.  **Monolithic Meshes:** The resulting GLB file contains a single mesh primitive. In Three.js (and most engines), a single mesh with a single material index can typically only support one material. To have a "yellow body" and "grey tracks", the geometry needs to be separated or support multiple material indices.

## Future Strategies for Materials

To evolve the pipeline to support multi-colored assets (e.g., a yellow bulldozer with grey tracks and blue windows), we recommend the following approaches:

### 1. Component-Based Assembly (Recommended)

Instead of exporting the entire object as one file, we split the OpenSCAD design into logical components.

*   **Workflow:**
    *   `bulldozer_body.scad` -> `bulldozer_body.glb`
    *   `bulldozer_tracks.scad` -> `bulldozer_tracks.glb`
    *   `bulldozer_cabin.scad` -> `bulldozer_cabin.glb`
*   **Implementation:**
    *   The game code loads these separate assets and groups them into a single `THREE.Group`.
    *   **Pros:** Flexible, allows easily swapping materials (e.g., "Upgrade Tracks" changes just the track material), simple pipeline changes.
    *   **Cons:** More files to manage, requires game code to assemble the parts.

### 2. Format Switching (3MF / PLY)

We could investigate formats that support color.

*   **3MF (3D Manufacturing Format):** OpenSCAD supports 3MF export, which retains color information.
    *   *Challenge:* We would need a tool to convert 3MF to GLTF. Finding a reliable command-line CLI for this in a Node.js environment is harder than the well-trodden OBJ path.
*   **PLY / OFF:** Some formats support vertex colors. If we can export to a format with vertex colors and convert that to GLTF, we get colored models.
    *   *Challenge:* Vertex colors are "baked in" and harder to change dynamically (e.g., changing team color) compared to swapping a material on a sub-mesh.

### 3. Material Indexing (Sub-meshes)

We could modify the pipeline to process multiple STLs into a single GLB with multiple primitives.

*   **Workflow:**
    *   Export `body.stl` and `tracks.stl`.
    *   Use a script (e.g., using `gltf-pipeline` or custom Three.js script) to merge them into one `.glb` file but keep them as separate primitives (or use material groups).
*   **Pros:** Single file to load (`bulldozer.glb`).
*   **Cons:** Complex build script.

## Recommendation

For our current stack, **Component-Based Assembly (#1)** is the most robust path. It aligns with the "Programmer CAD" philosophy:

1.  Define a "Master" SCAD file that imports parts for previewing.
2.  The build script is updated to generate assets for each *part*.
3.  The game entities attach specific materials to specific parts programmatically (e.g., `this.tracksMesh.material = materials.greyMetal`).
