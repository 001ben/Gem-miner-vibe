# Asset Generation: The "Game Ready" Pipeline (Blender + Python)

While OpenSCAD is excellent for "Programmer CAD," it struggles with game-specific needs like UV Mapping and Topology. We have introduced a second pipeline option: **Blender Python Scripting**.

This allows you to generate assets using Python code (keeping the "Programmer" workflow) while leveraging Blender's industry-standard tools for UV unwrapping and GLTF export.

## Architecture

1. **Source:** Python scripts (`.py`) located in `pipeline/blender/`.
1. **Engine:** Blender (headless mode).
1. **Compilation:** `task build:assets` runs Blender to execute the script and export `.glb`.
1. **Result:** Game-ready assets with **UVs**, **Materials**, and **Explicit IDs**.

## How to use

1. Create a python script in `pipeline/blender/my_asset.py`.
1. Use the `bpy` library to generate geometry.
1. Run `task build:assets`.

!!! info "Tip: Headless Mode"

    The pipeline runs Blender in background mode (`-b`), so no UI window will open. If you need to debug geometry, you can open the generated GLB in a standard GLTF viewer or open Blender manually to run the script.

## Example Blender Script

```python
import bpy

# Clear existing
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

# Create Cube
bpy.ops.mesh.primitive_cube_add(size=2)
obj = bpy.context.object

# Tag for DAMP
obj["damp_id"] = "test_cube"

# Auto UV Unwrap
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project()
bpy.ops.object.mode_set(mode='OBJECT')

# Export logic is handled by the wrapper script,
# but locally you might verify with:
# bpy.ops.export_scene.gltf(filepath="my_asset.glb")
```
