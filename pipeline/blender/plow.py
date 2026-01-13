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
    # Profile definition (Y, Z) pairs for the blade curve
    # Y is forward, Z is up.
    # Blade is concave, so Y should be negative in the middle?
    # Or if Y=0 is the mounting point, the blade curves forward.
    # Let's say the back of the blade is at Y=0.

    # Vertices for the profile (Y, Z)
    profile = [
        (0.2, 1.5),   # Top lip
        (0.0, 1.4),   # Top back
        (-0.1, 0.8),  # Middle back (deepest point of curve)
        (0.0, 0.2),   # Bottom back
        (0.3, 0.0),   # Cutting edge tip (The "Parky" thing)
        (0.0, 0.0),   # Bottom flat
    ]

    # We need to extrude this profile along X from -width/2 to width/2
    verts = []
    faces = []

    n_profile = len(profile)

    # Left side (x = -width/2)
    for y, z in profile:
        verts.append((-width/2, y, z))

    # Right side (x = width/2)
    for y, z in profile:
        verts.append((width/2, y, z))

    # Create faces connecting left and right
    # This creates the "ribbon" of the blade
    for i in range(n_profile - 1):
        # Indices:
        # Left: i, i+1
        # Right: i + n_profile, i + n_profile + 1

        # Face: (L_i, R_i, R_i+1, L_i+1)
        faces.append((i, i + n_profile, i + n_profile + 1, i + 1))

    # Close the sides? Maybe not needed for a segment if they tile perfectly.
    # But for a solid look, let's close the ends?
    # Actually, if we instance them side-by-side, internal faces are wasteful/z-fighting.
    # But the user might want "individual" segments.
    # Let's leave ends open for tiling, or maybe close them?
    # User said "bucket segment... repeatable".
    # If I repeat them, I don't want side faces.

    # However, to give it thickness, I should probably make it a closed volume (solid).
    # My profile above is just a line.
    # Let's make a solid profile.

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

        # Indices:
        # Left ring: 0 to n_pts-1
        # Right ring: n_pts to 2*n_pts-1

        l1 = i
        l2 = next_i
        r1 = i + n_pts
        r2 = next_i + n_pts

        # Quad face connecting left and right
        # Order to ensure normals face out?
        # If profile is CCW:
        faces.append((l1, r1, r2, l2))

    # End caps (Left and Right sides)
    # We might want to omit these if we want perfect seamless tiling without Z-fighting.
    # But if the segment is used alone, it needs caps.
    # Let's add caps. If they Z-fight on tiling, we can adjust later or the shader handles it.
    # Actually, usually tiled meshes omit caps.
    # Let's omit caps for now to be safe for tiling.

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
# Create a single segment centered at origin
segment = create_plow_segment("Plow_Segment", width=1.0, material=plow_mat)

# 3. Contract Tags
tag_contract(segment, "plow_segment")

# 4. Export
bpy.ops.export_scene.gltf(
    filepath=OUTPUT_PATH,
    export_format='GLB',
    use_selection=False,
    export_extras=True
)
print(f"Exported to {OUTPUT_PATH}")
