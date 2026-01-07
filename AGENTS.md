# Agent Behavioral Instructions

## Project Management Workflow
**CRITICAL:** Strict project management enforcement is active for this repository. You must follow this workflow for every task.

### 1. Initialization Phase (Before Coding)
Before starting any new work, you must "clean up" the previous context:
*   **Check Active Plans:** Look in `docs/planning/` for any existing `.md` files that are not in `archive/` (excluding `roadmap.md`).
*   **Archive:** If a plan exists and the work is finished, move it to `docs/planning/archive/`.
*   **Update Status:** Edit the moved file to set `Status: Completed` in its metadata block.

### 2. Planning Phase
You must create a dedicated task document for your current assignment:
*   **Create File:** Create a new file in `docs/planning/<topic_snake_case>.md`.
*   **Structure:** You must use the established Admonition format:
    *   `!!! info ":material-clock-time-four-outline: Metadata"`: Status, Date, Author.
    *   `!!! abstract ":material-text-box-search-outline: Context"`: Why are we doing this?
    *   `!!! quote ":material-clipboard-list-outline: Plan"`: High-level steps.
    *   `!!! example ":material-console: Execution Log"`: A checklist of actionable steps (`- [ ] Step`).
*   **Update Roadmap:** Edit `docs/planning/roadmap.md`:
    *   Link the new task under "Active Work".
    *   Ensure archived tasks are linked properly (e.g., move to a History section or just ensure the link points to `archive/`).

### 3. Execution Phase
*   **Live Updates:** As you complete steps in your internal plan, you should ideally keep the execution log in the task document updated, or at least ensure it is fully checked off (`- [x]`) before the final submit.

### 4. Completion Phase
*   **Final Review:** Before calling `submit`, verify that `docs/planning/roadmap.md` is accurate and your task document in `docs/planning/` reflects the final state of the work.

## General Guidelines
*   **Documentation First:** Do not write code until the Plan matches the Task Document.
*   **Explicit Contracts:** Respect the architectural contracts (e.g., `damp_id` in assets).
*   **Verification:** Always verify changes (visual or logical) before marking them as complete.
