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
    # "Curved Horn" Wing Design
    # Extends forward (Y+) and curves inward (X towards 0) to funnel gems

    # Key points for the curve
    # Base: Matches plow side profile roughly
    # Tip: Forward and Inward

    # Profile at base (attached to plow)
    base_profile = [
        (0.2, 1.5), (-0.1, 0.8), (0.4, 0.0), (0.0, 0.0), (-0.3, 0.8), (0.0, 1.5)
    ]

    verts = []
    faces = []

    # Generate sections along the "horn" length
    # Let's say 5 sections
    sections = 5
    length = 0.8 # Forward length
    inward_curve = 0.5 # How much it curves in

    for i in range(sections + 1):
        t = i / sections
        y_offset = t * length

        # Curve inward: x offset depends on side
        # side=1 (Right) -> x moves negative (left)
        # side=-1 (Left) -> x moves positive (right)
        x_offset = -t * t * inward_curve * side

        # Scale down towards tip
        scale = 1.0 - (t * 0.6)

        for py, pz in base_profile:
            # Transform profile point
            px = 0 # Local x relative to wing base line

            # Apply scale/offset
            final_x = px + x_offset
            final_y = py + y_offset
            final_z = pz * scale

            verts.append((final_x, final_y, final_z))

    n_profile = len(base_profile)

    # Skinning
    for i in range(sections):
        offset = i * n_profile
        next_offset = (i + 1) * n_profile

        for j in range(n_profile):
            next_j = (j + 1) % n_profile

            # Quads connecting sections
            v1 = offset + j
            v2 = next_offset + j
            v3 = next_offset + next_j
            v4 = offset + next_j

            # Winding order check
            if side == 1:
                 faces.append((v1, v2, v3, v4)) # Normal
            else:
                 faces.append((v4, v3, v2, v1)) # Flipped for other side

    # Caps
    # Base cap (connecting to plow) - might not need if flush
    # Tip cap
    tip_start = sections * n_profile
    faces.append([tip_start + j for j in range(n_profile)])

    mesh = bpy.data.meshes.new(name + "_Mesh")
    mesh.from_pydata(verts, [], faces)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)

    if material:
        obj.data.materials.append(material)

    return obj

def create_plow_tooth(name, material=None):
    # Angled Tooth
    # Rotated forward around X to dig in

    # Simple wedge, but points down/forward
    # Tip at (0, 0.6, -0.4) (Forward and Down)

    verts = [
        (-0.15, 0.0, 0.1), (0.15, 0.0, 0.1),   # Top Back (Attachment)
        (-0.15, -0.1, -0.1), (0.15, -0.1, -0.1), # Bottom Back
        (0.0, 0.7, -0.3) # Sharp Tip (Forward Y+, Down Z-)
    ]

    # Indices: 0,1 TopBack; 2,3 BtmBack; 4 Tip

    faces = [
        (0, 1, 4), # Top
        (1, 3, 4), # Right
        (3, 2, 4), # Bottom
        (2, 0, 4), # Left
        (2, 3, 1, 0) # Back
    ]

    mesh = bpy.data.meshes.new(name + "_Mesh")
    mesh.from_pydata(verts, [], faces)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)

    # Rotate slightly to "dig"
    # Actually, the geometry above is already angled (Tip z is -0.3)

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
