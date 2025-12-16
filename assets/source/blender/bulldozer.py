import bpy
import math
import os

# --- Configuration ---
# We assume the script is run from the repo root, so we target public/assets
OUTPUT_PATH = os.path.join(os.getcwd(), "public", "assets", "bulldozer_components.glb")

# --- Helper Functions ---
def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()

def create_material(name, color, roughness=0.7):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs['Base Color'].default_value = color
    bsdf.inputs['Roughness'].default_value = roughness
    return mat

def create_track_link(name, material):
    """
    Creates a single detailed track plate (The 'Atom')
    """
    # Create the base plate (Width 0.8, Length 0.3, Thickness 0.05)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0))
    link = bpy.context.object
    link.name = name
    link.scale = (0.8, 0.3, 0.05)

    # Add a "Grouser" (the ridge that digs into dirt)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0.05))
    grouser = bpy.context.object
    grouser.scale = (0.8, 0.05, 0.1)

    # Join them into one mesh
    grouser.select_set(True)
    link.select_set(True)
    bpy.context.view_layer.objects.active = link
    bpy.ops.object.join()

    # Apply Material
    link.data.materials.append(material)

    # Reset Transforms so (0,0,0) is the pivot
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

    return link

def create_track_path(name, radius=1.0, length=4.0):
    """
    Creates a Mesh Line Loop representing the path of the tracks.
    Three.js can read these vertices to build a Curve.
    Updated to include explicit straight sections to prevent Spline Wobble.
    """
    vertices = []

    # We construct the path clockwise (or counter-clockwise) starting from Top-Back
    # Shape: Top Straight -> Front Arc -> Bottom Straight -> Back Arc

    segments_arc = 16
    segments_straight = 8 # Enough points to tell the spline "I am straight"

    # 1. Top Straight (Back to Front)
    # y goes from -L/2 to L/2
    for i in range(segments_straight):
        t = i / (segments_straight - 1)
        y = -length/2 + t * length
        z = radius
        vertices.append((0, y, z))

    # 2. Front Arc (Top to Bottom)
    # Center (0, L/2, 0). Angle 0 to Pi.
    # y = L/2 + sin(a)*R, z = cos(a)*R (Note: at a=0, z=R, y=L/2)
    for i in range(segments_arc):
        angle = (i / (segments_arc - 1)) * math.pi
        y = length/2 + math.sin(angle) * radius
        z = math.cos(angle) * radius
        vertices.append((0, y, z))

    # 3. Bottom Straight (Front to Back)
    # y goes from L/2 to -L/2
    for i in range(segments_straight):
        t = i / (segments_straight - 1)
        y = length/2 - t * length
        z = -radius
        vertices.append((0, y, z))

    # 4. Back Arc (Bottom to Top)
    # Center (0, -L/2, 0). Angle Pi to 2Pi.
    for i in range(segments_arc):
        angle = math.pi + (i / (segments_arc - 1)) * math.pi
        y = -length/2 + math.sin(angle) * radius
        z = math.cos(angle) * radius
        vertices.append((0, y, z))

    # Create Mesh from vertices
    mesh_data = bpy.data.meshes.new(name + "_Mesh")
    mesh_data.from_pydata(vertices, [], []) # Verts, Edges, Faces (we only want verts)

    # Create Object
    path_obj = bpy.data.objects.new(name, mesh_data)
    bpy.context.collection.objects.link(path_obj)

    # Convert to a continuous line loop
    bpy.context.view_layer.objects.active = path_obj
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.edge_face_add() # Connect vertices
    bpy.ops.object.mode_set(mode='OBJECT')

    return path_obj

def create_idler_wheel(name, radius, width):
    """
    Creates a simple cylinder to represent an idler wheel/sprocket.
    """
    # Cylinder default is Z-aligned. We want X-aligned (Axle).
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=width, location=(0,0,0), rotation=(0, math.pi/2, 0))
    wheel = bpy.context.object
    wheel.name = name
    return wheel

# --- Execution ---

# 1. Reset
clear_scene()

# 2. Materials
mat_yellow = create_material("YellowPaint", (1.0, 0.6, 0.0, 1.0))
mat_metal = create_material("DarkMetal", (0.2, 0.2, 0.2, 1.0))
mat_glass = create_material("Glass", (0.2, 0.4, 0.6, 0.8), roughness=0.2)
mat_path = create_material("DebugPath", (1.0, 0.0, 0.0, 1.0)) # Red for debug

# 3. Create The Body (Static Rigid Mesh)
# Fix 1: Lower Body Z from 1.5 to 1.0 to sit on tracks
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 1.0))
body = bpy.context.object
body.name = "Bulldozer_Body"
body.scale = (2.5, 4.0, 1.5)
body.data.materials.append(mat_yellow)

# Fix 3: Add Internal Organs (Idler Wheels)
# We add them to the body mesh so they are part of the main chassis
# Tracks are at x = +/- 1.5. Body width 2.5 covers +/- 1.25.
# We place wheels at x = +/- 1.5.
wheel_radius = 0.9 # Slightly less than track radius 1.0
wheel_width = 0.5
track_offset_x = 1.5
track_length = 4.0

positions = [
    (track_offset_x, track_length/2, 0),   # Front Left
    (track_offset_x, -track_length/2, 0),  # Back Left
    (-track_offset_x, track_length/2, 0),  # Front Right
    (-track_offset_x, -track_length/2, 0)  # Back Right
]

for i, pos in enumerate(positions):
    w = create_idler_wheel(f"Wheel_{i}", wheel_radius, wheel_width)
    w.location = pos
    # Join to body
    w.select_set(True)
    body.select_set(True)
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.join()

# Fix 4: Add Cabin (Finishing Touch)
# Body top is at Z=1.75. Cabin height 1.2 centered at Z=2.35.
# Located at the rear (Y=-1.0).
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -1.0, 2.35))
cabin = bpy.context.object
cabin.name = "Cabin"
cabin.scale = (2.0, 2.0, 1.2)
cabin.data.materials.append(mat_glass)

# Join Cabin to Body
cabin.select_set(True)
body.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.object.join()

# Smart UV for the body (now including wheels and cabin)
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=66.0, island_margin=0.02)
bpy.ops.object.mode_set(mode='OBJECT')

# 4. Create The Assets for Instancing

# A. The Track Link (The "Atom")
link = create_track_link("Asset_TrackLink", mat_metal)
link.location = (3, 0, 0)

# B. The Track Path (The "Data")
# Create one path on the left
path_l = create_track_path("Asset_TrackPath_L", radius=1.0, length=4.0)
path_l.location = (-1.5, 0, 0.5) # Left Track Position

# Create one path on the right
path_r = create_track_path("Asset_TrackPath_R", radius=1.0, length=4.0)
path_r.location = (1.5, 0, 0.5)

# 5. Export
os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)

bpy.ops.export_scene.gltf(
    filepath=OUTPUT_PATH,
    export_format='GLB',
    use_selection=False, # Export everything
    export_extras=True   # Useful for custom data
)

print(f"Exported Programmatic Assets to {OUTPUT_PATH}")
