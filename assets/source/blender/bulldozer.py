import bpy
import math
import os
import random

# --- Configuration ---
OUTPUT_PATH = path_l = os.path.join(os.getcwd(), "assets", "bulldozer_components.glb")

# --- Helper Functions ---
def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()

def tag_contract(obj, damp_id):
    obj["damp_id"] = damp_id
    print(f"   [CONTRACT] Tagged Object '{obj.name}' as '{damp_id}'")

def tag_material_contract(mat, damp_id):
    mat["damp_id"] = damp_id
    print(f"   [CONTRACT] Tagged Material '{mat.name}' as '{damp_id}'")

def create_placeholder_material(name):
    return bpy.data.materials.new(name=name)

def apply_transforms(obj):
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

def create_track_link(name, material):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0))
    link = bpy.context.object
    link.name = name
    link.scale = (0.8, 0.3, 0.05)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0.05))
    grouser = bpy.context.object
    grouser.scale = (0.8, 0.05, 0.1)
    grouser.select_set(True); link.select_set(True); bpy.context.view_layer.objects.active = link; bpy.ops.object.join()
    link.data.materials.append(material)
    apply_transforms(link)
    return link

def create_track_path(name, radius=1.0, length=4.0):
    vertices = []
    for i in range(8): # Top
        vertices.append((0, -length/2 + (i/7)*length, radius))
    for i in range(16): # Front
        a = (i/15)*math.pi
        vertices.append((0, length/2 + math.sin(a)*radius, math.cos(a)*radius))
    for i in range(8): # Bottom
        vertices.append((0, length/2 - (i/7)*length, -radius))
    for i in range(16): # Back
        a = math.pi + (i/15)*math.pi
        vertices.append((0, -length/2 + math.sin(a)*radius, math.cos(a)*radius))
    mesh = bpy.data.meshes.new(name + "_Mesh")
    mesh.from_pydata(vertices, [], [])
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.edge_face_add(); bpy.ops.object.mode_set(mode='OBJECT')
    return obj

def create_idler_wheel(name, radius, width):
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=width, location=(0,0,0), rotation=(0, math.pi/2, 0))
    return bpy.context.object

def generate_texture(name, color):
    width, height = 512, 512
    img = bpy.data.images.new(name, width=width, height=height)
    pixels = list(color) * (width * height)
    img.pixels = pixels
    img.file_format = 'PNG'
    path = os.path.join(os.getcwd(), "assets", "textures", f"{name}.png")
    img.filepath_raw = path
    img.save()
    print(f"Generated {path}")

# --- Execution ---
clear_scene()
os.makedirs(os.path.join(os.getcwd(), "assets", "textures"), exist_ok=True)

# 1. Materials
chassis_mat = create_placeholder_material("chassis_mat")
tag_material_contract(chassis_mat, "chassis")
track_mat = create_placeholder_material("track_mat")
tag_material_contract(track_mat, "track_link")
cabin_mat = create_placeholder_material("cabin_mat")
tag_material_contract(cabin_mat, "cabin")

# 2. Body
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 1.0))
body = bpy.context.object
body.name = "Bulldozer_Body"
body.scale = (2.5, 4.0, 1.5)
apply_transforms(body) # BAKE SCALE
body.data.materials.append(chassis_mat)
tag_contract(body, "chassis")

# 3. Wheels
wheel_radius, wheel_width = 0.9, 0.5
track_x, track_l = 1.5, 4.0
pos = [(track_x, track_l/2, 0), (track_x, -track_l/2, 0), (-track_x, track_l/2, 0), (-track_x, -track_l/2, 0)]
for i, p in enumerate(pos):
    w = create_idler_wheel(f"Wheel_{i}", wheel_radius, wheel_width)
    w.location = p
    w.data.materials.append(chassis_mat)
    apply_transforms(w)
    w.parent = body
    tag_contract(w, "wheel")

# 4. Cabin
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -1.0, 2.35))
cabin = bpy.context.object
cabin.name = "Cabin"
cabin.scale = (2.0, 2.0, 1.2)
apply_transforms(cabin)
cabin.data.materials.append(cabin_mat)
cabin.parent = body
tag_contract(cabin, "cabin")

# 5. UVs
for o in [body, cabin]:
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.uv.smart_project(angle_limit=66.0); bpy.ops.object.mode_set(mode='OBJECT')

# 6. Assets
tag_contract(create_track_link("Asset_TrackLink", track_mat), "track_link")
tag_contract(create_track_path("Asset_TrackPath_L", 1.0, 4.0), "path_l")
tag_contract(create_track_path("Asset_TrackPath_R", 1.0, 4.0), "path_r")

# 7. Export
bpy.ops.export_scene.gltf(filepath=OUTPUT_PATH, export_format='GLB', use_selection=False, export_extras=True)
print(f"Exported to {OUTPUT_PATH}")