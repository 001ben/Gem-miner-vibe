# Plan: Documentation Rewrite

!!! info ":material-clock-time-four-outline: Metadata"

    - **Status:** Completed
    - **Date:** 2025-05-19
    - **Author:** Jules (AI Agent)

!!! abstract ":material-text-box-search-outline: Context"

    The project documentation was fragmented, out of date, and lacked a clear structure. The goal of this task was to perform a "Full Rewrite" to consolidate information, establish a clear hierarchy, and implement a maintainable roadmap structure. Additionally, we aimed to "uplift" the visual presentation using `mkdocs-material` features like admonitions and tabs.

!!! quote ":material-clipboard-list-outline: Plan"

    1. **Consolidate and Clean Up**: Remove duplicate files and archive old plans.
    1. **Restructure**: Organize `docs/` into logical subdirectories (`architecture`, `troubleshooting`, `history`).
    1. **Update Content**: Rewrite key architectural docs (`DAMP.md`) to reflect the current "Explicit Contract" state.
    1. **Enhance**: Add `mkdocs-material` plugins and formatting.
    1. **Tooling**: Add a pre-commit script to enforce documentation formatting.

!!! example ":material-console: Execution Log"

    - [x] **Restructuring**: Moved files to `docs/architecture`, `docs/guide`, etc.
    - [x] **Roadmap**: Created `docs/planning/roadmap.md` and archived old plans.
    - [x] **Rewrite**: Completely rewrote `DAMP_MAINTAINABILITY.md` to remove outdated "Proposed" logic.
    - [x] **Uplift**: Updated `mkdocs.yml` with `awesome-pages`, `admonition`, and `pymdownx.emoji`.
    - [x] **Tooling**: Implemented `pipeline/scripts/format_docs.py` using `uvx` and `mdformat` (resolving dependency conflicts by removing `mdformat-admon`).
    - [x] **Verification**: Validated build via `task docs:build`.

!!! success ":material-robot: AI Summary"

    The documentation ecosystem has been successfully migrated to a structured, maintainable format.

    **Key Achievements:**

    - **Architecture**: The "Four Pillars" structure (Src, Pipeline, Tools, Assets) is now formally documented.
    - **Pipeline**: The "Explicit Contract" model (using `damp_id`) is codified as the source of truth, replacing old speculative docs.
    - **Visuals**: Documentation now uses consistent admonitions, tabs for commands, and icons for navigation.
    - **Workflow**: A new `task docs:format` command ensures consistency going forward.

    **Next Steps for Future Agents:**

    - Refer to `docs/living/architecture/DAMP.md` for architectural decisions.
    - Use `docs/planning/roadmap.md` to track future work.
    - Ensure all new docs pass `task docs:lint`.
