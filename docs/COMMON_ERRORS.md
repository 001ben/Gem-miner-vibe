# Common Errors & Troubleshooting

## Asset Viewer

### `Failed to load resource: <SCRIPT> unknown source`

**Symptoms:**
- The asset viewer loads the UI but the 3D scene is empty.
- The console (or on-screen log) shows "Failed to load resource" pointing to the main module script.
- "Three.js imported successfully" is NOT logged.

**Cause:**
This error occurs when the browser cannot resolve one of the JavaScript modules imported by the viewer. Common reasons include:
1.  **Incorrect Server Root:** The web server was started from the `verification/` directory instead of the repository root. This makes `../js/` and `../node_modules/` inaccessible (404).
2.  **Missing Dependencies:** `npm install` has not been run, so `node_modules` is missing or incomplete.
3.  **Deployment Path Issues:** In a deployed environment (e.g., GitHub Pages), the relative paths to `js/` or `node_modules/` might be incorrect if the build script didn't rewrite them properly.

**Solution:**
1.  **Local Development:**
    -   Use the Taskfile commands to start the viewer from the correct root:
        ```bash
        # New React Viewer
        task damp:viewer
        
        # Legacy Viewer
        task viewer
        ```
2.  **Deployment:**
    -   Check the `pr-preview.yml` workflow to ensure it copies source files to the `dist/` folder and rewrites paths (`sed`) in `index.html`.

### `Failed to load resource: ... bulldozer_components.glb` (404)

**Cause:**
The 3D assets have not been built locally.

**Solution:**
Run the asset build task:
```bash
task build:assets
```
Note: The asset viewer handles this gracefully by logging a warning, but the model will not appear.

## Graphics Glitches

### "Fan-like" Vertical Tracks
**Cause:**
The track link mesh orientation in the GLB does not match the animation logic (Three.js `lookAt` expects Z-forward).
**Solution:**
Use the "Track Adj" controls in the Asset Viewer to set **Z-Rotation to 270**.

### Flickering / Vanishing Tracks
**Cause:**
Gimbal lock when the track tangent aligns with the World Y-axis.
**Solution:**
Ensure the "Up" vector in the Asset Viewer is set to **X (Axle)**.
