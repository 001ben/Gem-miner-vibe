# Project Structure

*Last Updated: Thursday 18 December 2025*
*Base Commit: 986e814b021c576336543506215aa7c4af29b5bd*

The project follows a "Modern Standard" structure to separate source code, build pipelines, and developer tools.

## Directory Layout

- **`src/`**: Main Game Source Code.
    - `core/`: Engine logic (Game loop, Graphics, Physics, UI).
    - `entities/`: Game Objects (Bulldozer, Gems, Map).
- **`pipeline/`**: The Asset Factory ("Source of Truth").
    - `blender/`: Python scripts for geometry generation.
    - `textures/`: Python scripts for procedural texture generation.
    - `scripts/`: Node.js build and verification scripts.
- **`tools/`**: Developer Tools.
    - `viewer/`: The DAMP Asset Director (React App).
- **`assets/`**: Compiled/Distribution Assets (Output Only).
    - `models/`: Generated `.glb` files.
    - `textures/`: Generated `.png` files.
    - `configs/`: JSON configuration files.
- **`docs/`**: Project Documentation.

## Key Workflows

- **Game Logic**: Edit files in `src/`.
- **Asset Logic**: Edit files in `pipeline/`.
- **Build Assets**: Run `task build:assets`.
- **Run Game**: Run `task dev`.
- **Run Asset Director**: Run `task damp:viewer`.
