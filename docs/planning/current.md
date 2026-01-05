# Current Plan: Refactoring & Docs

**Date:** 2025-05-18 (Session Date)

## Overview

We are solidifying the DAMP pipeline and improving project documentation infrastructure.

## Changes

### 1. Code Maintenance

- **Consolidated `cb()` Utility**: Moved the cache-busting function from scattered files to `src/utils/graphics-utils.js`.
- **Blender Parenting**: Refactored `pipeline/blender/bulldozer.py` to use object parenting instead of mesh joining. This ensures that individual components (Wheels, Cabin) retain their `damp_id` contract tags in the exported GLB.

### 2. Documentation System

- **MkDocs**: Setting up `mkdocs` with the `material` theme for a professional documentation site.
- **Auto-Formatting**: Integrating `mdformat` to keep documentation consistent.
- **Deployment**: Ensuring docs are built and published to `dist/docs` during PR previews.

## Next Steps

- [ ] Verify the new GLB structure in the Asset Viewer.
- [ ] Verify the documentation site build.
