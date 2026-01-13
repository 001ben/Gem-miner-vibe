# Tutorial: The Bulldozer Renderer (Legacy)

!!! warning ":material-archive: Legacy Document (May 2025)"
    This tutorial explains the legacy rendering techniques including Triplanar Mapping and procedural textures. While `BulldozerRenderer` still exists, the asset loading pipeline has evolved.

## 1. The High-Level Goal

This file is responsible for:

1. **Loading** the 3D model of the bulldozer.
1. **Painting** it (creating textures via code, so no image files are needed).
1. **Animating** the tank tracks so they look like they are rolling.
1. **Syncing** the visual position with the physics body (Matter.js).

______________________________________________________________________

## 2. Generating Textures "Procedurally"

Instead of loading JPG or PNG images (which takes time and bandwidth), this code "draws" its own textures using a virtual HTML Canvas.

**Function:** `createProceduralTexture(type)`

- **How it works:** It creates a hidden `<canvas>` element in memory, gets a 2D drawing context (`ctx`), and draws shapes.
- **The "Tracks" Texture:** It draws a dark background and then loops to draw chevron/V-shapes. This creates the tread pattern.
- **The "Body" Texture:** It draws a yellow square, then scatters random noise (dots) and rust spots to make it look like weathered metal.
- **Three.js Conversion:** Finally, `new THREE.CanvasTexture(canvas)` turns that drawing into something the 3D engine can wrap around a shape.

```javascript
// Example logic simplified:
if (type === 'tracks') {
    ctx.fillStyle = '#333';
    // Draw zig-zag lines for treads...
}
return new THREE.CanvasTexture(canvas);
```

______________________________________________________________________

## 3. The Shader Magic (Advanced)

Standard 3D models need "UV Maps" (instructions on how to wrap a 2D image around a 3D object). This file uses a clever trick called **Triplanar Mapping** to avoid needing perfect UVs.

**Function:** `enhanceMaterialWithTriplanar(...)`

- **What is a Shader?** A shader is a small program that runs on your Graphics Card (GPU) to decide the color of every single pixel.
- **The Trick:** It intercepts the standard Three.js material code (`onBeforeCompile`) and injects custom logic.
- **Triplanar Logic:** Instead of stretching a texture, it projects the texture from three directions (Top, Side, Front) and blends them together.
- **Scrolling:** For the tracks, it adds a `uTime` variable to slide the texture coordinates, making the treads look like they are moving without actually moving the geometry.

______________________________________________________________________

## 4. The Main Class: `BulldozerRenderer`

### The Constructor

When `new BulldozerRenderer(scene)` is called:

1. It creates a `THREE.Group`. Think of this as an invisible box that will hold all the bulldozer parts (body, glass, tracks).
1. It creates a `GLTFLoader`. This is the tool that knows how to read `.glb` (3D model) files.
1. It prepares empty lists (`animatedInstances`) to track things that need to move every frame.

### The `load(url)` method

This is the heavy lifter. It fetches the file and organizes the parts.

1. **Finding Parts:** It loops through every object in the 3D file:
    - If the name contains "Bulldozer_Body", it keeps it as the chassis.
    - If the name contains "Asset_TrackLink", it keeps track of track link to load.
    - If the name contains "Asset_TrackPath", it reads the mathematical points to know the *shape* of the tracks (oval-ish).
1. **Applying Materials:** It creates the shiny glass material and the rough metal material (using the procedural textures from step 2).
1. **Building Tracks (InstancedMesh):**
    - Instead of creating 50 separate 3D objects for the track links (which is slow), it uses `InstancedMesh`.
    - This tells the GPU: "Draw this one shape 50 times at these 50 different positions." It's a huge performance optimization.
    - It uses `THREE.CatmullRomCurve3` to calculate a smooth path along the points found in the file.

### The `setPose(position, angle)` method

This is the bridge between the Physics world (Matter.js) and the Visual world (Three.js).

- **Matter.js (2D)** calculates where the box *is*.
- **Three.js (3D)** needs to know where to *draw* it.
- This function copies the X/Y from physics to X/Z in 3D (since Y is "up" in 3D) and applies the rotation.

```javascript
setPose(position, angle) {
    this.group.position.set(position.x, 0, position.y); // Map 2D -> 3D
    this.group.rotation.y = -angle; // Rotate the model
}
```

### The `update(delta)` method

This runs 60 times a second (the game loop).

1. **Shader Time:** It increases the `uTime` value so the track textures keep scrolling.
1. **Track Movement:** It calculates the position of every single track link along the curve.
    - `track.curve.getPointAt(t)`: "Where is the link at 50% along the curve?"
    - `track.curve.getTangentAt(t)`: "Which way should it face?"
    - It updates the matrix (position+rotation) for all 50 track links instantly.

______________________________________________________________________

## Summary

- **`bulldozer.js`** is the "Brain" (Physics, Collision).
- **`bulldozer_render.js`** is the "Costume" (Graphics).
- It generates its own "fabric" (textures) via code.
- It uses a "Green Screen" trick (Shaders) to animate the texture scrolling.
- It listens to the "Brain" every frame via `setPose` to know where to stand.
