# Blender Python API

The `pipeline/blender/` directory contains Python scripts that generate game assets.
These scripts run in a headless Blender instance via `task build:assets`.

## ⚡ Quick Start

To create a new asset, create a file `pipeline/blender/my_asset.py`.

```python
import bpy
from mathutils import Vector

# 1. Setup
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

# 2. Generate Geometry
bpy.ops.mesh.primitive_cube_add(size=2)
obj = bpy.context.object

# 3. Apply Contract (Tagging)
obj["damp_id"] = "my_cube"

# 4. Cleanup (UVs, Shading)
bpy.ops.object.shade_smooth()
```

## 📚 Best Practices

### The `damp_id`

Always tag your objects. This is how you will find them in the game code.

```python
# Good
obj["damp_id"] = "turret_barrel"

# Bad (Relying on name)
obj.name = "TurretBarrel"
```

### Parenting

Use parenting to create complex hierarchies without merging geometry.

```python
# Create Parent
bpy.ops.mesh.primitive_cube_add()
parent = bpy.context.object
parent["damp_id"] = "tank_body"

# Create Child
bpy.ops.mesh.primitive_cylinder_add()
child = bpy.context.object
child["damp_id"] = "tank_turret"

# Link
child.parent = parent
```

### Materials

You can create placeholder materials in Blender. The Game Engine will likely replace them, but they are useful for tagging.

```python
mat = bpy.data.materials.new(name="GlassMaterial")
mat["damp_id"] = "glass"  # <--- Important!
obj.data.materials.append(mat)
```

## 🛠 Debugging

Since the pipeline runs headless, debugging can be tricky.

!!! tip "Open the GLB"
    The easiest way to debug is to open the generated `.glb` file (in `dist/assets/models/`) using a tool like [gltf-viewer.donmccurdy.com](https://gltf-viewer.donmccurdy.com/) or Blender itself.

!!! tip "Run Manually"
    You can run the script inside Blender interactively:
    1. Open Blender.
    2. Go to the Scripting tab.
    3. Open your `.py` file.
    4. Click "Run Script".
