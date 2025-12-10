# Potree Modernization Implementation Plan

## Overview

This plan details the complete modernization of Potree from its current state (Gulp + Rollup 1.x + Three.js r124) to a modern stack using **Bun** as the primary runtime/bundler with **Three.js r170+** and **WebGL 2.0** support.

**Key Decisions**:
- WebGL 2.0 only (no fallback to WebGL 1.0)
- Keep existing jQuery UI
- Full modernization scope

---

## Phase 1: Bun Build System Migration

**Goal**: Replace Gulp + Rollup with Bun's native capabilities

### 1.1 Initial Bun Setup

```bash
# Install Bun (if not already installed)
curl -fsSL https://bun.sh/install | bash

# Initialize Bun in project
cd /Volumes/LaCie/httpdocs/potree
bun init
```

**Files to Create**:
- `bunfig.toml` - Bun configuration
- `scripts/build.ts` - Main build script (replaces gulpfile.js)
- `scripts/dev.ts` - Development server with watch mode

### 1.2 Replace gulpfile.js Build Tasks

The current gulpfile has these tasks that need Bun equivalents:

| Gulp Task | Purpose | Bun Replacement |
|-----------|---------|-----------------|
| `workers` | Concatenate worker files | `Bun.build()` with multiple entrypoints |
| `shaders` | Convert .vs/.fs to JS module | Custom script using `Bun.file()` |
| `lazylibs` | Copy geopackage, sql.js | `fs.cp()` or Bun's file APIs |
| `build` | Copy HTML, CSS, resources | Bun file operations |
| `pack` | Rollup bundling | `Bun.build()` |
| `webserver` | Dev server on port 1234 | `Bun.serve()` |
| `watch` | File watching + rebuild | `Bun.build({ watch: true })` |

### 1.3 Create `scripts/build.ts`

```typescript
// scripts/build.ts - Main build script
import { $ } from "bun";

const BUILD_DIR = "./build/potree";

// Task definitions to replace gulpfile.js
async function buildShaders() {
  // Read shader files and generate shaders.js
  const shaderFiles = [
    "src/materials/shaders/pointcloud.vs",
    "src/materials/shaders/pointcloud.fs",
    // ... all shader files
  ];

  let output = "let Shaders = {};\n\n";
  for (const file of shaderFiles) {
    const content = await Bun.file(file).text();
    const filename = file.split("/").pop();
    output += `Shaders["${filename}"] = \`${content}\`;\n\n`;
  }
  output += "export { Shaders };";

  await Bun.write("./build/shaders/shaders.js", output);
}

async function buildWorkers() {
  // Worker concatenation - replaces gulp-concat
  const workerConfigs = {
    "LASLAZWorker": ["libs/plasio/workers/laz-perf.js", "libs/plasio/workers/laz-loader-worker.js"],
    "LASDecoderWorker": ["src/workers/LASDecoderWorker.js"],
    "EptLaszipDecoderWorker": ["libs/copc/index.js", "src/workers/EptLaszipDecoderWorker.js"],
    "EptBinaryDecoderWorker": ["libs/ept/ParseBuffer.js", "src/workers/EptBinaryDecoderWorker.js"],
    "EptZstandardDecoderWorker": [
      "src/workers/EptZstandardDecoder_preamble.js",
      "libs/zstd-codec/bundle.js",
      "libs/ept/ParseBuffer.js",
      "src/workers/EptZstandardDecoderWorker.js"
    ]
  };

  for (const [name, files] of Object.entries(workerConfigs)) {
    const contents = await Promise.all(files.map(f => Bun.file(f).text()));
    await Bun.write(`${BUILD_DIR}/workers/${name}.js`, contents.join("\n"));
  }

  // Copy WASM file
  await $`cp ./libs/copc/laz-perf.wasm ${BUILD_DIR}/workers/`;
}

async function buildMain() {
  // Main bundle - replaces Rollup
  await Bun.build({
    entrypoints: ["./src/Potree.js"],
    outdir: BUILD_DIR,
    naming: "potree.js",
    format: "esm", // or "iife" for UMD-like behavior
    minify: process.env.NODE_ENV === "production",
    sourcemap: "external",
    external: [], // Three.js will be bundled
  });

  // Worker bundles via Bun
  await Bun.build({
    entrypoints: [
      "./src/workers/BinaryDecoderWorker.js",
      "./src/modules/loader/2.0/DecoderWorker.js",
      "./src/modules/loader/2.0/DecoderWorker_brotli.js"
    ],
    outdir: `${BUILD_DIR}/workers`,
    format: "esm",
    minify: process.env.NODE_ENV === "production",
  });
}

async function copyAssets() {
  await $`cp -r resources ${BUILD_DIR}/resources`;
  await $`cp src/viewer/potree.css ${BUILD_DIR}/`;
  await $`cp src/viewer/sidebar.html ${BUILD_DIR}/`;
  await $`cp src/viewer/profile.html ${BUILD_DIR}/`;
  await $`cp LICENSE ${BUILD_DIR}/`;
  await $`cp -r libs/geopackage ${BUILD_DIR}/lazylibs/geopackage`;
  await $`cp -r libs/sql.js ${BUILD_DIR}/lazylibs/sql.js`;
}

// Main build
async function build() {
  console.log("🔨 Building Potree with Bun...");

  await $`mkdir -p ${BUILD_DIR}/workers ${BUILD_DIR}/workers/2.0 build/shaders ${BUILD_DIR}/lazylibs`;

  await Promise.all([
    buildShaders(),
    buildWorkers(),
    copyAssets(),
  ]);

  await buildMain();

  console.log("✅ Build complete!");
}

build();
```

### 1.4 Create `scripts/dev.ts`

```typescript
// scripts/dev.ts - Development server with watch
const server = Bun.serve({
  port: 1234,
  async fetch(req) {
    const url = new URL(req.url);
    const filePath = url.pathname === "/" ? "/examples/viewer.html" : url.pathname;
    const file = Bun.file(`.${filePath}`);

    if (await file.exists()) {
      return new Response(file);
    }
    return new Response("Not Found", { status: 404 });
  },
});

console.log(`🚀 Dev server running at http://localhost:${server.port}`);

// Watch for changes and rebuild
import { watch } from "fs";
watch("./src", { recursive: true }, async (event, filename) => {
  console.log(`📁 ${filename} changed, rebuilding...`);
  await import("./build.ts");
});
```

### 1.5 Update package.json

```json
{
  "name": "potree",
  "version": "2.0.0",
  "type": "module",
  "scripts": {
    "build": "bun run scripts/build.ts",
    "dev": "bun run scripts/dev.ts",
    "start": "bun run dev",
    "clean": "rm -rf build",
    "test": "bun test",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "typescript": "^5.3.0"
  },
  "dependencies": {
    "three": "^0.170.0"
  }
}
```

### 1.6 Files to Delete After Migration

- `gulpfile.js`
- `rollup.config.js`
- Remove from package.json: gulp, gulp-concat, gulp-connect, rollup, through

---

## Phase 2: Three.js Upgrade (r124 → r170+)

**Goal**: Update Three.js and fix all deprecated API usage

### 2.1 Install Modern Three.js

```bash
bun add three@latest
bun add -d @types/three
```

### 2.2 Update Import Paths

**Current** (bundled local copy):
```javascript
import * as THREE from "../../libs/three.js/build/three.module.js";
```

**New** (npm package):
```javascript
import * as THREE from "three";
```

**Files to update** (all files importing THREE):
- `src/Potree.js`
- `src/PotreeRenderer.js`
- `src/PointCloudOctree.js`
- `src/materials/PointCloudMaterial.js`
- `src/viewer/viewer.js`
- ... (70+ files total)

### 2.3 THREE.Geometry → BufferGeometry Migration

**Files requiring geometry migration**:

| File | Lines | Changes Required |
|------|-------|------------------|
| `src/AnimationPath.js` | 114, 120, 127 | Replace Geometry with BufferGeometry |
| `src/utils.js` | 78, 83-95, 105, 124, 345-353 | Multiple geometry replacements |
| `src/utils/Volume.js` | 117, 121, 232, 256, 259, 286, 289 | Box/plane frame geometries |
| `src/utils/ClipVolume.js` | 26-69, 99-101 | Box, plane, shaft frames |
| `src/utils/TransformationTool.js` | 70-98 | Box frame geometry |
| `src/utils/Profile.js` | 87-89, 256, 262 | Line geometry |
| `src/modules/OrientedImages/OrientedImages.js` | 56-64 | Line geometry |

**Migration Pattern**:

```javascript
// BEFORE (deprecated)
let geometry = new THREE.Geometry();
geometry.vertices.push(new THREE.Vector3(0, 0, 0));
geometry.vertices.push(new THREE.Vector3(1, 1, 1));
geometry.verticesNeedUpdate = true;

// AFTER (modern)
let geometry = new THREE.BufferGeometry();
const positions = new Float32Array([0, 0, 0, 1, 1, 1]);
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
// To update: geometry.attributes.position.needsUpdate = true;
```

### 2.4 THREE.Math → THREE.MathUtils

**Simple find-replace** in these files:

| File | Method Calls to Replace |
|------|------------------------|
| `src/Annotation.js:16` | `generateUUID()` |
| `src/modules/OrientedImages/OrientedImages.js` | `degToRad()`, `radToDeg()` |
| `src/modules/OrientedImages/OrientedImageControls.js` | `degToRad()` |
| `src/navigation/DeviceOrientationControls.js:71-74` | `degToRad()` |
| `src/viewer/profile.js:995,1000` | `degToRad()` |
| `src/utils/MeasuringTool.js:103` | `radToDeg()` |
| `src/modules/CameraAnimation/CameraAnimation.js:34` | `generateUUID()` |
| `src/modules/Images360/Images360.js` | `degToRad()` |

**Command**:
```bash
# Can be automated with sed/Bun script
find src -name "*.js" -exec sed -i '' 's/THREE\.Math\./THREE.MathUtils./g' {} \;
```

### 2.5 THREE.VertexColors Removal

**Files**:
- `src/arena4d/PointCloudArena4D.js:118` - Remove `vertexColors: THREE.VertexColors`
- `src/utils/Profile.js:91` - Remove from LineBasicMaterial
- `src/materials/PointCloudMaterial.js:164` - Remove `this.vertexColors = THREE.VertexColors`

**Note**: In Three.js r128+, vertex colors are automatically enabled when color attribute exists.

### 2.6 Deprecated Geometry Constructors

| File | Change |
|------|--------|
| `src/utils.js:324` | `THREE.CubeGeometry()` → `THREE.BoxGeometry()` |
| `src/utils.js:1082` | `THREE.PlaneBufferGeometry()` → `THREE.PlaneGeometry()` |
| `src/navigation/VRControls.js:458` | `THREE.PlaneBufferGeometry()` → `THREE.PlaneGeometry()` |
| `src/viewer/Scene.js:384` | `THREE.PlaneBufferGeometry()` → `THREE.PlaneGeometry()` |

### 2.7 Remove LinePieces Parameter

- `src/utils.js:356` - Remove third parameter from `new THREE.LineSegments()`

---

## Phase 3: WebGL 2.0 Shader Migration

**Goal**: Update shaders from GLSL ES 1.0 to GLSL ES 3.0 (WebGL 2.0 only, no fallback)

### 3.1 Shader Files to Update

| File | Lines | Priority |
|------|-------|----------|
| `src/materials/shaders/pointcloud.vs` | 982 | HIGH |
| `src/materials/shaders/pointcloud.fs` | ~100 | HIGH |
| `src/materials/shaders/edl.vs` | ~50 | MEDIUM |
| `src/materials/shaders/edl.fs` | ~100 | MEDIUM |
| `src/materials/shaders/normalize.vs` | ~30 | MEDIUM |
| `src/materials/shaders/normalize.fs` | ~50 | MEDIUM |
| `src/materials/shaders/blur.vs` | ~30 | LOW |
| `src/materials/shaders/blur.fs` | ~50 | LOW |
| `src/materials/shaders/pointcloud_sm.vs` | - | LOW |
| `src/materials/shaders/pointcloud_sm.fs` | - | LOW |

### 3.2 GLSL Syntax Changes

**Add version directive** (first line of each shader):
```glsl
#version 300 es
```

**Replace keywords**:
```glsl
// Vertex Shader
attribute vec3 position;  →  in vec3 position;
varying vec3 vColor;      →  out vec3 vColor;

// Fragment Shader
varying vec3 vColor;      →  in vec3 vColor;
gl_FragColor = ...;       →  out vec4 fragColor; fragColor = ...;
```

**Remove extensions**:
```glsl
// REMOVE these lines (not needed in WebGL 2.0)
#extension GL_EXT_frag_depth : enable

// REPLACE
gl_FragDepthEXT = depth;  →  gl_FragDepth = depth;
```

### 3.3 Simplify Bit Operations

The current `isBitSet()` function in `pointcloud.vs` (lines 183-210) uses a complex workaround for WebGL 1.0's lack of bitwise operators. In WebGL 2.0:

```glsl
// BEFORE (WebGL 1.0 workaround)
bool isBitSet(int number, int index){
    int powi = 1;
    if(index == 0) powi = 1;
    else if(index == 1) powi = 2;
    // ... 8 more branches
}

// AFTER (WebGL 2.0 native)
bool isBitSet(int number, int index) {
    return (number & (1 << index)) != 0;
}
```

### 3.4 Update PointCloudMaterial.js

Add WebGL 2.0 detection and shader selection:

```javascript
// src/materials/PointCloudMaterial.js
const isWebGL2 = renderer.capabilities.isWebGL2;

if (isWebGL2) {
    this.vertexShader = Shaders['pointcloud_webgl2.vs'];
    this.fragmentShader = Shaders['pointcloud_webgl2.fs'];
} else {
    // Fallback to WebGL 1.0 shaders
    this.vertexShader = Shaders['pointcloud.vs'];
    this.fragmentShader = Shaders['pointcloud.fs'];
}
```

---

## Phase 4: Code Quality Improvements

**Goal**: Modernize JavaScript patterns and add TypeScript

### 4.1 XHR → Fetch Migration

**Files to update**:

| File | Function | Change |
|------|----------|--------|
| `src/utils.js` | `Utils.pathExists()` | Replace sync XHR with async fetch |
| `src/XHRFactory.js` | Entire file | Deprecate or convert to fetch wrapper |
| `src/loader/POCLoader.js` | `load()` | Use fetch API |
| `src/loader/BinaryLoader.js` | `load()` | Use fetch API |

**Pattern**:
```javascript
// BEFORE
let req = XHRFactory.createXMLHttpRequest();
req.open('GET', url, false); // Synchronous!
req.send(null);

// AFTER
const response = await fetch(url);
const data = await response.arrayBuffer();
```

### 4.2 Add TypeScript Declarations

Create `src/types/potree.d.ts` with type definitions for the public API:

```typescript
declare module 'potree' {
    export class Viewer {
        constructor(element: HTMLElement, options?: ViewerOptions);
        setPointBudget(budget: number): void;
        loadPointCloud(url: string, name: string): Promise<PointCloud>;
        // ...
    }

    export interface ViewerOptions {
        fov?: number;
        edlEnabled?: boolean;
        // ...
    }
}
```

### 4.3 Add tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowJs": true,
    "checkJs": true,
    "declaration": true,
    "declarationDir": "./dist/types",
    "strict": false,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "build", "libs"]
}
```

### 4.4 Add Biome for Linting/Formatting

```bash
bun add -d @biomejs/biome
```

Create `biome.json`:
```json
{
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "tab"
  }
}
```

---

## Phase 5: Testing Infrastructure

**Goal**: Add basic test suite using Bun's built-in test runner

### 5.1 Create Test Structure

```
tests/
├── unit/
│   ├── LRU.test.ts
│   ├── Utils.test.ts
│   ├── PointAttributes.test.ts
│   └── Version.test.ts
├── integration/
│   ├── loaders/
│   │   ├── POCLoader.test.ts
│   │   └── EptLoader.test.ts
│   └── materials/
│       └── PointCloudMaterial.test.ts
└── fixtures/
    └── sample-pointcloud/
```

### 5.2 Example Test File

```typescript
// tests/unit/LRU.test.ts
import { describe, expect, test } from "bun:test";
import { LRU } from "../../src/LRU.js";

describe("LRU Cache", () => {
  test("should add and retrieve items", () => {
    const lru = new LRU();
    lru.touch({ name: "test-node" });
    expect(lru.numPoints).toBe(0);
  });

  test("should evict oldest items when over budget", () => {
    // ...
  });
});
```

### 5.3 Add Test Scripts to package.json

```json
{
  "scripts": {
    "test": "bun test",
    "test:watch": "bun test --watch",
    "test:coverage": "bun test --coverage"
  }
}
```

---

## Phase 6: Performance Optimization

**Goal**: Leverage WebGL 2.0 features and modern APIs

### 6.1 Enable WebGL 2.0 Features

- **Vertex Array Objects (VAOs)** - Automatic in Three.js r170+
- **Instanced rendering** - For repeated geometry (annotations, markers)
- **Transform feedback** - For GPU-based point processing

### 6.2 Optimize Bundle Size

Current: ~2.3MB unminified
Target: <500KB minified + gzipped

```typescript
// scripts/build.ts - Production build
await Bun.build({
  entrypoints: ["./src/Potree.js"],
  outdir: "./build/potree",
  minify: true,
  sourcemap: "external",
  splitting: true, // Code splitting
  target: "browser",
});
```

### 6.3 Add Brotli Compression

```bash
bun add -d brotli
```

Add to build script:
```typescript
import { compress } from "brotli";

const bundle = await Bun.file("./build/potree/potree.js").arrayBuffer();
const compressed = compress(new Uint8Array(bundle));
await Bun.write("./build/potree/potree.js.br", compressed);
```

---

## Implementation Checklist

### Phase 1: Bun Build System
- [ ] Install Bun
- [ ] Create `scripts/build.ts`
- [ ] Create `scripts/dev.ts`
- [ ] Create `bunfig.toml`
- [ ] Update `package.json`
- [ ] Test build process
- [ ] Test dev server
- [ ] Remove gulpfile.js and rollup.config.js
- [ ] Remove old npm dependencies

### Phase 2: Three.js Upgrade
- [ ] Install three@latest
- [ ] Update all import paths (70+ files)
- [ ] Migrate THREE.Geometry → BufferGeometry (7 files)
- [ ] Replace geometry.vertices usage (10 files)
- [ ] Remove verticesNeedUpdate flags (6 files)
- [ ] Replace THREE.Math → THREE.MathUtils (9 files)
- [ ] Remove THREE.VertexColors (3 files)
- [ ] Fix deprecated geometry constructors (5 files)
- [ ] Remove libs/three.js directory
- [ ] Test rendering functionality

### Phase 3: WebGL 2.0 Shaders
- [ ] Create WebGL 2.0 shader variants
- [ ] Add #version 300 es directives
- [ ] Replace attribute/varying with in/out
- [ ] Remove EXT_frag_depth extension usage
- [ ] Implement native bitwise operations
- [ ] Add WebGL version detection
- [ ] Test on multiple browsers

### Phase 4: Code Quality
- [ ] Replace XHR with fetch (4 files)
- [ ] Add tsconfig.json
- [ ] Add TypeScript declarations
- [ ] Install and configure Biome
- [ ] Run linter and fix issues

### Phase 5: Testing
- [ ] Create test directory structure
- [ ] Write unit tests for core utilities
- [ ] Write integration tests for loaders
- [ ] Add test scripts to package.json
- [ ] Achieve >50% coverage on critical paths

### Phase 6: Performance (Optional)
- [ ] Enable code splitting
- [ ] Add Brotli compression
- [ ] Benchmark before/after
- [ ] Document performance improvements

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Bun incompatibility with specific Node.js API | Test thoroughly; keep Node.js fallback scripts |
| Three.js upgrade breaks rendering | Incremental testing; visual regression tests |
| WebGL 2.0 not supported on old browsers | Document minimum browser requirements (WebGL 2.0 required) |
| Build breaks existing deployments | Version as 2.0.0; maintain 1.x branch |

---

## Success Criteria

1. **Build**: `bun run build` completes in <10 seconds (vs current ~30+ seconds)
2. **Bundle Size**: Production bundle <1MB minified (vs current 2.3MB)
3. **Rendering**: All 77 examples render correctly
4. **Tests**: >80% of new code covered
5. **Performance**: No regression in FPS for 1M+ point clouds

---

## Files Summary

### Files to Create
- `scripts/build.ts`
- `scripts/dev.ts`
- `bunfig.toml`
- `biome.json`
- `tsconfig.json`
- `src/types/potree.d.ts`
- `tests/` directory structure
- WebGL 2.0 shader variants

### Files to Modify
- `package.json` (major rewrite)
- `src/Potree.js` (imports)
- `src/materials/PointCloudMaterial.js` (WebGL 2.0 detection)
- 70+ source files (Three.js imports and API updates)
- 11 shader files (GLSL ES 3.0 syntax)

### Files to Delete
- `gulpfile.js`
- `rollup.config.js`
- `libs/three.js/` (entire directory - use npm package)
- `.eslintrc` (replaced by Biome)