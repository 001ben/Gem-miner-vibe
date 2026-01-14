import bpy
import math
import os

# --- Configuration ---
OUTPUT_PATH = os.path.join(os.getcwd(), "assets", "models", "plow.glb")

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

def create_plow_segment(name, width=1.0, material=None):
    # Revised Profile (Closed loop Y, Z)
    solid_profile = [
        # Outer surface (Blade face)
        (0.2, 1.5),   # Top Front
        (-0.1, 0.8),  # Middle (Curve in)
        (0.4, 0.0),   # Cutting Edge Tip (Pointy/Parky)

        # Bottom thickness
        (0.0, 0.0),   # Heel

        # Back surface
        (-0.3, 0.8),  # Back middle
        (0.0, 1.5),   # Back Top
    ]

    verts = []
    faces = []

    # Generate vertices for Left and Right cross-sections
    for x in [-width/2, width/2]:
        for y, z in solid_profile:
            verts.append((x, y, z))

    n_pts = len(solid_profile)

    # Side faces (lofting)
    for i in range(n_pts):
        next_i = (i + 1) % n_pts

        l1 = i
        l2 = next_i
        r1 = i + n_pts
        r2 = next_i + n_pts

        faces.append((l1, r1, r2, l2))

    mesh = bpy.data.meshes.new(name + "_Mesh")
    mesh.from_pydata(verts, [], faces)

    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)

    if material:
        obj.data.materials.append(material)

    return obj

def create_plow_wing(name, side, material=None):
    # Wing is a curved "cheek" plate on the side
    # It should roughly match the profile but flare out or close off

    # Simple Wing: A flat plate with the profile shape, slightly scaled up
    profile = [
        (0.2, 1.5), (-0.1, 0.8), (0.4, 0.0), (0.0, 0.0), (-0.3, 0.8), (0.0, 1.5)
    ]

    thickness = 0.2
    verts = []
    faces = []

    # Inner face (x=0) and Outer face (x=thickness * side)
    # Side is 1 (Right) or -1 (Left)

    for x in [0, thickness * side]:
        for y, z in profile:
            verts.append((x, y, z))

    n_pts = len(profile)

    # Faces for lofting
    for i in range(n_pts):
        next_i = (i + 1) % n_pts
        l1, l2 = i, next_i
        r1, r2 = i + n_pts, next_i + n_pts

        # If side is 1 (Right), normal order is l1, r1, r2, l2
        # If side is -1 (Left), we might need to flip, but let's check later.
        # Let's just create faces and rely on backface culling or DoubleSide.
        faces.append((l1, r1, r2, l2))

    # Cap the outer face
    # Simple fan for convex, but this is concave.
    # Just single ngon for now.
    faces.append(list(range(n_pts))) # Inner
    faces.append(list(range(n_pts, 2*n_pts))) # Outer

    mesh = bpy.data.meshes.new(name + "_Mesh")
    mesh.from_pydata(verts, [], faces)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)

    if material:
        obj.data.materials.append(material)

    return obj

def create_plow_tooth(name, material=None):
    # A distinct tooth that sticks out the bottom front
    # Wedge shape

    verts = [
        (-0.1, 0.4, 0.1), (0.1, 0.4, 0.1), # Top back
        (-0.1, 0.6, -0.2), (0.1, 0.6, -0.2), # Tip
        (-0.1, 0.0, 0.0), (0.1, 0.0, 0.0)  # Bottom back
    ]

    # Simple wedge
    verts = [
        (-0.15, 0.35, 0.05), (0.15, 0.35, 0.05), # Base Top
        (-0.15, 0.0, 0.0), (0.15, 0.0, 0.0),   # Base Bottom
        (0.0, 0.5, -0.2) # Tip
    ]

    # 0,1,2,3 base, 4 tip
    faces = [
        (0, 1, 3, 2), # Base
        (0, 1, 4), # Top Face
        (1, 3, 4), # Right Face
        (3, 2, 4), # Bottom Face
        (2, 0, 4)  # Left Face
    ]

    mesh = bpy.data.meshes.new(name + "_Mesh")
    mesh.from_pydata(verts, [], faces)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)

    if material:
        obj.data.materials.append(material)

    return obj

# --- Execution ---
print("Starting Plow Export...")
clear_scene()

# Ensure output directory exists
os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)

# 1. Materials
plow_mat = create_placeholder_material("plow_mat")
tag_material_contract(plow_mat, "plow")

# 2. Geometry
# Segment
segment = create_plow_segment("Plow_Segment", width=1.0, material=plow_mat)
tag_contract(segment, "plow_segment")

# Wings
wing_l = create_plow_wing("Plow_Wing_L", side=-1, material=plow_mat)
tag_contract(wing_l, "plow_wing")

wing_r = create_plow_wing("Plow_Wing_R", side=1, material=plow_mat)
tag_contract(wing_r, "plow_wing")

# Tooth (Single, centered)
tooth = create_plow_tooth("Plow_Tooth", material=plow_mat)
tag_contract(tooth, "plow_tooth")


# 3. Export
bpy.ops.export_scene.gltf(
    filepath=OUTPUT_PATH,
    export_format='GLB',
    use_selection=False,
    export_extras=True
)
print(f"Exported to {OUTPUT_PATH}")
