import bpy
import math
import os

# Output path
# We assume the script is run from the repo root, so we target public/assets
OUTPUT_PATH = os.path.join(os.getcwd(), "public", "assets", "bulldozer_blender.glb")

# Clear Scene
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

def create_material(name, color):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs['Base Color'].default_value = color
    bsdf.inputs['Roughness'].default_value = 0.7
    return mat

# Materials
mat_yellow = create_material("YellowPaint", (1.0, 0.6, 0.0, 1.0)) # RGB + Alpha
mat_black = create_material("RubberTracks", (0.1, 0.1, 0.1, 1.0))
mat_grey = create_material("GreyMetal", (0.5, 0.5, 0.6, 1.0))

# 1. Body (Chassis)
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 2.5, 0))
body = bpy.context.object
body.name = "Body"
# Dimensions: width 12, length 16, height 5
body.scale = (12, 16, 5)
body.data.materials.append(mat_yellow)

# 2. Tracks
# Left
bpy.ops.mesh.primitive_cube_add(size=1, location=(-7.5, 0, -2.5))
track_l = bpy.context.object
track_l.name = "Track_L"
track_l.scale = (3, 18, 4)
track_l.data.materials.append(mat_black)

# Right
bpy.ops.mesh.primitive_cube_add(size=1, location=(7.5, 0, -2.5))
track_r = bpy.context.object
track_r.name = "Track_R"
track_r.scale = (3, 18, 4)
track_r.data.materials.append(mat_black)

# 3. Cabin
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 5.5))
cabin = bpy.context.object
cabin.name = "Cabin"
cabin.scale = (8, 8, 6)
cabin.data.materials.append(mat_grey)

# 4. Join components for easier UV unwrapping (optional, but good for single draw call)
# For this example, we keep them separate but select all for UVs
bpy.ops.object.select_all(action='SELECT')

# 5. Smart UV Project
# This is the "Killer Feature" vs OpenSCAD
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=66.0, island_margin=0.02)
bpy.ops.object.mode_set(mode='OBJECT')

# 6. Export
# Ensure directory exists
os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)

bpy.ops.export_scene.gltf(
    filepath=OUTPUT_PATH,
    export_format='GLB',
    use_selection=True
)

print(f"Exported to {OUTPUT_PATH}")
