# Project Structure

*Last Updated: 2025-05-19*

The project follows a "Modern Standard" structure to separate source code, build pipelines, and developer tools.

## Directory Layout

- **`src/`**: Main Game Source Code.
    - `core/`: Engine logic (Game loop, Graphics, Physics, UI).
    - `entities/`: Game Objects (Bulldozer, Gems, Map).
    - `utils/`: Shared utilities (Math, Graphics).
- **`pipeline/`**: The Asset Factory ("Source of Truth").
    - `blender/`: Python scripts for geometry generation.
    - `textures/`: Python scripts for procedural texture generation.
    - `scripts/`: Node.js build and verification scripts.
- **`tools/`**: Developer Tools.
    - `viewer/`: The DAMP Asset Director (Web App).
    - `physics-playground/`: Isolated physics testing environment.
- **`assets/`**: Source configuration for assets.
    - `configs/`: JSON configuration files for the pipeline.
- **`docs/`**: Project Documentation.
- **`dist/`**: (Generated) Build artifacts, including compiled assets and the playable game.

## Key Workflows

### Setup
Ensure you have `uv` and `go-task` installed (handled by `.julesrc` in dev container).

### Commands

| Command | Description |
| :--- | :--- |
| `task dev` | Starts the main game server locally. |
| `task damp:viewer` | Starts the Asset Viewer tool. |
| `task build:assets` | Runs the full Blender pipeline to generate GLBs and textures. |
| `task build:dist` | Creates a production build in `dist/`. |
| `task docs:build` | Builds this documentation site. |
