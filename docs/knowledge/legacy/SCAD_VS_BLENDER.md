# Asset Pipeline: OpenSCAD vs. Blender

We originally explored two different pipelines for generating 3D game assets. We have decided to standardize on the **Blender** pipeline. This document summarizes the differences, benefits, and reasons for this decision.

## 1. The OpenSCAD Pipeline ("Programmer's CAD")

**Approach:**

- Define geometry using Constructive Solid Geometry (CSG) in `.scad` files.
- Compile to STL -> OBJ -> GLTF using a chain of tools (`openscad`, `obj2gltf`).
- Procedural textures generated at runtime in the client.

**Code Snippet (`bulldozer_body.scad`):**

```scad
// Parametric definition
body_width = 12;
body_length = 16;
body_height = 5;

// CSG Operations
translate([-body_width/2, -body_length/2, 4/2])
    cube([body_width, body_length, body_height]);
```

**Pros:**

- **Parametric:** Easy to adjust dimensions via variables.
- **Git-Friendly:** Source files are pure text.
- **Precise:** Exact mathematical alignment.

**Cons:**

- **Limited Export:** OpenSCAD exports raw geometry (STL) without UVs, Materials, or scene hierarchy.
- **Rendering Issues:** The generated meshes often have bad normals or topology for game engines.
- **No Animations:** Cannot export armatures, keyframes, or separate parts easily without splitting into many files.
- **Material Complexity:** Requires custom "Triplanar Mapping" shaders in the client because the model lacks UV coordinates.

______________________________________________________________________

## 2. The Blender Pipeline ("Game-Ready Assets")

**Approach:**

- Use Python scripting inside Blender (`bpy`) to generate geometry programmatically.
- Export directly to `.glb` (GLTF binary) which supports hierarchy, materials, and animations.
- Use standard Three.js loaders in the client.

**Code Snippet (`bulldozer.py`):**

```python
import bpy

# Create Mesh
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 1.0))
body = bpy.context.object
body.name = "Bulldozer_Body"
body.scale = (2.5, 4.0, 1.5)

# Assign Material
mat = bpy.data.materials.new(name="YellowPaint")
body.data.materials.append(mat)

# Export
bpy.ops.export_scene.gltf(filepath="bulldozer.glb", export_format='GLB')
```

**Pros:**

- **Rich Assets:** Exports a complete scene with node hierarchy, proper names, and material slots.
- **UV Unwrapping:** Can automatically project UVs (`bpy.ops.uv.smart_project`), allowing standard textures.
- **Animation Support:** Capable of baking animations and skeletal rigs.
- **Debugging:** The generated file can be opened in Blender GUI for visual inspection.
- **Standard Rendering:** Works with standard `MeshStandardMaterial` without shader hacks.

**Cons:**

- **Dependency:** Requires Blender to be installed on the build machine.
- **Complexity:** The Blender Python API is more complex than SCAD.

______________________________________________________________________

## Conclusion: Why Blender?

We chose the Blender pipeline because it produces **Game-Ready Assets**.
The OpenSCAD pipeline required too much runtime "patching" (custom shaders for triplanar mapping, manual material assignment, lack of object hierarchy). The Blender pipeline gives us a standard GLTF file that "just works" in Three.js, while still maintaining the benefits of procedural generation via Python scripts.
