!!! info ":material-clock-time-four-outline: Metadata"
    - **Status:** In Progress
    - **Date:** 2024-05-23
    - **Author:** Jules
    - **Tags:** Asset, Design, Plow, DAMP

!!! abstract ":material-text-box-search-outline: Context"
    The bulldozer requires a modular plow asset that can scale horizontally as the player upgrades their plow level. The design needs to support a core repeatable segment, optional teeth for digging, and "wings" (side caps) to funnel collected gems.

!!! quote ":material-clipboard-list-outline: Design Specification"
    ## Core Philosophy
    The plow is a tool of accumulation. It should look sturdy, industrial, and capable of pushing massive amounts of material.

    ## Components
    1.  **Plow Segment (`Plow_Segment`)**
        -   **Role:** The main blade body.
        -   **Dimensions:** 1.0 meter width (standard unit).
        -   **Shape:** Concave profile to "catch" material. Includes a "Parky" cutting edge at the bottom.
        -   **Behavior:** Instanced N times based on plow width upgrade.

    2.  **Plow Teeth (`Plow_Tooth`)**
        -   **Role:** Aggressive digging implements.
        -   **Shape:** Angled wedge, pointing forward and down.
        -   **Material:** Dark, rough metal (contrasting with the yellow blade).
        -   **Behavior:** Optional upgrade. Instanced 1 per segment.

    3.  **Plow Wings (`Plow_Wing_L` / `Plow_Wing_R`)**
        -   **Role:** Funneling. Increases effective capture area.
        -   **Shape:** Curved "horn" design. Extends forward and flares OUTWARD.
        -   **Behavior:** Optional upgrade. Attached to the outermost ends of the segment array.

    ## Visual Reference (Procedural)
    -   **Blade:** Yellow/Industrial Paint (Roughness 0.2, Metalness 0.7).
    -   **Teeth:** Unpainted Steel/Iron (Roughness 0.9, Metalness 0.1, Dark Grey).

!!! example ":material-console: Execution Log"
    - [x] Create basic `Plow_Segment` geometry in Blender API.
    - [x] Integrate into DAMP pipeline (`plow.py`, `Taskfile.yml`).
    - [x] Implement `BulldozerRenderer` support for instanced segments.
    - [x] Add Viewer UI for segment count configuration.
    - [x] **Refinement:** Add `Plow_Tooth` with forward-down angle.
    - [x] **Refinement:** Add `Plow_Wing` with curved funnel shape.
    - [x] **Refinement:** Reduce wing curvature and fix normals (solid horn look).
    - [x] **Refinement:** Flip wing curvature to flare OUT (funnel).
    - [ ] Verify final look in Viewer.
