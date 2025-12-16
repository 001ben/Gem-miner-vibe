# Asset Generation: The "Game Ready" Pipeline (Blender + Python)

While OpenSCAD is excellent for "Programmer CAD," it struggles with game-specific needs like UV Mapping and Topology. We have introduced a second pipeline option: **Blender Python Scripting**.

This allows you to generate assets using Python code (keeping the "Programmer" workflow) while leveraging Blender's industry-standard tools for UV unwrapping and GLTF export.

## Architecture

1.  **Source:** Python scripts (`.py`) located in `assets/source/blender/`.
2.  **Engine:** Blender (headless mode).
3.  **Compilation:** `scripts/build-blender-assets.js` runs Blender to execute the script and export `.glb`.
4.  **Result:** Game-ready assets with **UVs** and **Materials**.

## Comparison

| Feature | OpenSCAD Pipeline | Blender Pipeline |
| :--- | :--- | :--- |
| **Geometry** | CSG (Boolean Volumes) | Mesh (Verts/Faces) |
| **UV Mapping** | None (Requires Triplanar Shader) | **Automatic (Smart UV Project)** |
| **Materials** | Solid Colors Only (mostly) | Full PBR Support |
| **Complexity** | Simple text file | Requires Blender installed |

## How to use

1.  Create a python script in `assets/source/blender/my_asset.py`.
2.  Use the `bpy` library to generate geometry.
3.  Run `npm run build:blender`.

## Selecting the Right Model

*   **Use OpenSCAD** for simple mechanical parts (brackets, gears) where texture direction doesn't matter.
*   **Use Blender** for the main vehicle body, characters, or anything that needs a "Texture" (Dirt, Rust, Logos).

## Example Blender Script

```python
import bpy

# Clear existing
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

# Create Cube
bpy.ops.mesh.primitive_cube_add(size=2)
obj = bpy.context.object

# Auto UV Unwrap
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project()
bpy.ops.object.mode_set(mode='OBJECT')

# Export
bpy.ops.export_scene.gltf(filepath="my_asset.glb")
```
