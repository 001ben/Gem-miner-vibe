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
    """
    # Define points for a "Stadium" shape (Pill shape)
    vertices = []

    # Resolution of the curved sections
    segments = 16

    # Front Arc
    for i in range(segments):
        angle = math.pi/2 - (i / (segments-1)) * math.pi
        x = 0
        y = (length / 2) + math.sin(angle) * radius
        z = math.cos(angle) * radius
        vertices.append((x, y, z))

    # Back Arc
    for i in range(segments):
        angle = -math.pi/2 - (i / (segments-1)) * math.pi
        x = 0
        y = -(length / 2) + math.sin(angle) * radius
        z = math.cos(angle) * radius
        vertices.append((x, y, z))

    # Create Mesh from vertices
    mesh_data = bpy.data.meshes.new(name + "_Mesh")
    mesh_data.from_pydata(vertices, [], []) # Verts, Edges, Faces (we only want verts)

    # Create Object
    path_obj = bpy.data.objects.new(name, mesh_data)
    bpy.context.collection.objects.link(path_obj)

    # Convert to a continuous line loop for GLTF export logic
    # (Tricks the exporter into saving edge data)
    bpy.context.view_layer.objects.active = path_obj
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.edge_face_add() # Connect vertices
    bpy.ops.object.mode_set(mode='OBJECT')

    return path_obj

# --- Execution ---

# 1. Reset
clear_scene()

# 2. Materials
mat_yellow = create_material("YellowPaint", (1.0, 0.6, 0.0, 1.0))
mat_metal = create_material("DarkMetal", (0.2, 0.2, 0.2, 1.0))
mat_path = create_material("DebugPath", (1.0, 0.0, 0.0, 1.0)) # Red for debug

# 3. Create The Body (Static Rigid Mesh)
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 1.5))
body = bpy.context.object
body.name = "Bulldozer_Body"
body.scale = (2.5, 4.0, 1.5)
body.data.materials.append(mat_yellow)
# Smart UV for the body
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=66.0, island_margin=0.02)
bpy.ops.object.mode_set(mode='OBJECT')

# 4. Create The Assets for Instancing
# We place these slightly off-center or hide them,
# but for GLTF export we just leave them at 0,0,0 or organized positions.

# A. The Track Link (The "Atom")
# Move it aside so it doesn't clip inside the body
link = create_track_link("Asset_TrackLink", mat_metal)
link.location = (3, 0, 0)

# B. The Track Path (The "Data")
# Create one path on the left
path_l = create_track_path("Asset_TrackPath_L", radius=1.0, length=2.5)
path_l.location = (-1.5, 0, 0.5) # Position where the Left Track should be

# Create one path on the right (Optional, or reuse the Left path in code)
path_r = create_track_path("Asset_TrackPath_R", radius=1.0, length=2.5)
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
