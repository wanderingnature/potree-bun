# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

**Current build system** (Gulp + Rollup 1.x):
```bash
npm install          # Install dependencies (runs build automatically via postinstall)
npm run build        # Build: gulp build pack
npm run start        # Dev server with watch: gulp watch (port 1234)
```

**Planned modernization** (Bun):
```bash
bun install
bun run build        # Production build
bun run dev          # Dev server on port 1234
```

## Architecture Overview

Potree is a WebGL-based point cloud renderer built on Three.js r124. The main entry point is `src/Potree.js` which re-exports all public modules.

### Core Rendering Pipeline

```
Potree.loadPointCloud() → Loader → PointCloudOctreeGeometry → PointCloudOctree → Viewer
```

1. **Loaders** (`src/loader/`): Format-specific loaders that create geometry
   - `POCLoader.js` - Potree Octree Converter format (cloud.js)
   - `EptLoader.js` - EPT and COPC formats
   - `OctreeLoader.js` - Potree 2.0 format (metadata.json)

2. **Octree Structure** (`src/PointCloudOctree.js`, `src/PointCloudOctreeGeometry.js`):
   - Hierarchical spatial data structure for LOD rendering
   - `PointCloudOctreeNode` wraps geometry nodes for scene graph
   - Visibility determination in `src/Potree_update_visibility.js`

3. **Material System** (`src/materials/`):
   - `PointCloudMaterial.js` - Core shader material (uses RawShaderMaterial)
   - Shaders in `src/materials/shaders/` (.vs/.fs files)
   - Shaders compiled to `build/shaders/shaders.js` by gulp task

4. **Viewer** (`src/viewer/viewer.js`):
   - Main application class integrating all components
   - Creates Three.js scene, camera, renderer
   - Heavy jQuery dependency for UI (sidebar.js)

### Web Workers

Point cloud decoding runs in Web Workers for performance:
- `src/workers/` - Worker source files
- Workers concatenated by gulp from multiple source files (see `gulpfile.js` workers config)
- Output to `build/potree/workers/`

### Key Dependencies

- **Three.js r124** - Bundled in `libs/three.js/` (not npm)
- **jQuery/jQuery UI** - UI components
- All Three.js imports use local path: `../../libs/three.js/build/three.module.js`

## Build Process Details

The gulp build has these key tasks:

1. **shaders**: Reads `.vs`/`.fs` files, outputs `build/shaders/shaders.js` as JS module
2. **workers**: Concatenates worker source files (defined in gulpfile.js `workers` object)
3. **pack**: Runs Rollup to bundle `src/Potree.js` → `build/potree/potree.js` (UMD format)

## Modernization Context

See `modernization_plan.md` for detailed implementation plan. Key points:
- Migrating from Gulp+Rollup to Bun
- Upgrading Three.js r124 → r170+
- WebGL 2.0 only (no WebGL 1.0 fallback)
- Shaders need GLSL ES 1.0 → 3.0 migration
- `THREE.Geometry` → `BufferGeometry` throughout
- `THREE.Math` → `THREE.MathUtils`

## File Conventions

- ES6 modules throughout (`export`/`import`)
- Classes use ES6 class syntax
- Point cloud formats detected by URL pattern in `loadPointCloud()`:
  - `ept.json` → EPT
  - `.copc.laz` → COPC
  - `cloud.js` → POC
  - `metadata.json` → Potree 2.0