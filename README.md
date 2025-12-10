# Potree

**WebGL Point Cloud Viewer for Large Point Clouds**

Potree is a free, open-source WebGL-based point cloud renderer for the visualization of large point clouds in web browsers. It was developed at the Institute of Computer Graphics and Algorithms at TU Wien.

## Features

- Efficient rendering of large point clouds (billions of points)
- Multiple point cloud formats: LAS, LAZ, POC, EPT, COPC
- Measurement tools: distance, area, volume, angles, elevation profiles
- Annotations and clipping volumes
- 360-degree panorama integration
- VR support (WebVR/WebXR)
- Cesium integration for geospatial applications
- Camera animation paths
- GeoPackage and Shapefile support

## Requirements

- **Runtime**: [Bun](https://bun.sh) v1.0+
- **Browser**: WebGL 2.0 support required
  - Chrome 56+
  - Firefox 51+
  - Edge 79+
  - Safari 15+

## Quick Start

### Installation

```bash
# Install Bun (if not already installed)
curl -fsSL https://bun.sh/install | bash

# Clone the repository
git clone https://github.com/potree/potree.git
cd potree

# Install dependencies
bun install
```

### Development

```bash
# Start development server with hot reload
bun run dev
```

Open http://localhost:1234 in your browser.

### Build

```bash
# Production build
bun run build

# Build output is in ./build/potree/
```

## Usage

### Basic Viewer Setup

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="./build/potree/potree.css">
  <script src="./libs/jquery/jquery-3.1.1.min.js"></script>
  <script src="./libs/three.js/build/three.min.js"></script>
  <script src="./build/potree/potree.js"></script>
</head>
<body>
  <div id="potree_render_area"></div>

  <script>
    const viewer = new Potree.Viewer(document.getElementById("potree_render_area"));

    viewer.setEDLEnabled(true);
    viewer.setFOV(60);
    viewer.setPointBudget(2_000_000);

    Potree.loadPointCloud("./pointclouds/lion/cloud.js", "lion", (e) => {
      viewer.scene.addPointCloud(e.pointcloud);
      viewer.fitToScreen();
    });
  </script>
</body>
</html>
```

### Loading Point Clouds

```javascript
// POC format (Potree Octree Converter)
Potree.loadPointCloud("./pointclouds/data/cloud.js", "name", callback);

// EPT format (Entwine Point Tile)
Potree.loadPointCloud("./ept/data/ept.json", "name", callback);

// COPC format (Cloud Optimized Point Cloud)
Potree.loadPointCloud("./data/points.copc.laz", "name", callback);

// LAS/LAZ files directly
Potree.loadPointCloud("./data/points.las", "name", callback);
```

### Viewer Configuration

```javascript
// Point budget (balance quality vs. performance)
viewer.setPointBudget(1_000_000);    // 1 million points
viewer.setPointBudget(10_000_000);   // 10 million points (high-end GPU)

// Visual quality
viewer.setEDLEnabled(true);          // Eye-dome lighting
viewer.setEDLRadius(1.4);
viewer.setEDLStrength(0.4);

// Point appearance
viewer.setPointSize(1);
viewer.setMaterial("RGB");           // RGB, Elevation, Intensity, Classification

// Navigation
viewer.setNavigationMode(Potree.OrbitControls);
viewer.setNavigationMode(Potree.FirstPersonControls);
viewer.setNavigationMode(Potree.EarthControls);
```

## Examples

The `examples/` directory contains 70+ demonstrations:

| Example | Description |
|---------|-------------|
| `viewer.html` | Basic viewer with sidebar |
| `measurements.html` | Measurement tools demo |
| `classifications.html` | Point classification display |
| `elevation_profile.html` | Elevation profiling |
| `clipping_volume.html` | Clipping volumes |
| `camera_animation.html` | Camera path animation |
| `cesium_*.html` | Cesium integration |
| `vr_*.html` | VR experiences |
| `ept*.html` | EPT format loading |
| `copc.html` | COPC format loading |

## Converting Point Clouds

Use [PotreeConverter](https://github.com/potree/PotreeConverter) to convert point clouds:

```bash
# Convert LAS/LAZ to Potree format
PotreeConverter ./input.las -o ./output

# With custom options
PotreeConverter ./input.las -o ./output \
  --generate-page pageName \
  --overwrite
```

Or use [Entwine](https://entwine.io) for EPT format:

```bash
entwine build -i input.las -o output_ept
```

## Project Structure

```
potree/
├── src/
│   ├── Potree.js              # Main entry point
│   ├── viewer/                # Viewer and UI components
│   ├── materials/             # Shader materials
│   │   └── shaders/           # GLSL shaders
│   ├── loader/                # Point cloud loaders
│   ├── navigation/            # Camera controls
│   ├── utils/                 # Tools and utilities
│   ├── modules/               # Optional features
│   └── workers/               # Web Workers
├── examples/                  # Example viewers
├── libs/                      # Third-party libraries
├── resources/                 # Icons and images
├── scripts/                   # Build scripts
│   ├── build.ts               # Production build
│   └── dev.ts                 # Development server
└── build/                     # Build output
```

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start development server on port 1234 |
| `bun run build` | Build for production |
| `bun run clean` | Remove build directory |
| `bun run test` | Run test suite |
| `bun run typecheck` | Run TypeScript type checking |

## API Reference

### Potree.Viewer

```typescript
class Viewer {
  constructor(element: HTMLElement, options?: ViewerOptions);

  // Point cloud management
  scene: Scene;
  loadPointCloud(url: string, name: string, callback: Function): void;

  // Display settings
  setPointBudget(budget: number): void;
  setFOV(fov: number): void;
  setEDLEnabled(enabled: boolean): void;
  setBackground(color: string): void;

  // Navigation
  setNavigationMode(mode: NavigationMode): void;
  fitToScreen(duration?: number): void;

  // Tools
  measuringTool: MeasuringTool;
  profileTool: ProfileTool;
  volumeTool: VolumeTool;
}
```

### Potree.PointCloudOctree

```typescript
class PointCloudOctree {
  // Properties
  name: string;
  material: PointCloudMaterial;
  position: THREE.Vector3;
  scale: THREE.Vector3;
  rotation: THREE.Euler;

  // Methods
  getBoundingBox(): THREE.Box3;
  setVisibility(visible: boolean): void;
}
```

## Supported Point Cloud Formats

| Format | Extension | Description |
|--------|-----------|-------------|
| POC | `.js` | Potree Octree Converter output |
| EPT | `ept.json` | Entwine Point Tile |
| COPC | `.copc.laz` | Cloud Optimized Point Cloud |
| LAS | `.las` | LiDAR point cloud |
| LAZ | `.laz` | Compressed LAS |

## Browser Support

WebGL 2.0 is required. Tested browsers:

| Browser | Minimum Version |
|---------|-----------------|
| Chrome | 56+ |
| Firefox | 51+ |
| Edge | 79+ |
| Safari | 15+ |

## Performance Tips

1. **Point Budget**: Start with 1-2 million points, increase for high-end GPUs
2. **EDL**: Disable eye-dome lighting for better performance
3. **Attribute Loading**: Load only needed attributes (RGB, intensity, etc.)
4. **Network**: Use EPT or COPC format for streaming large datasets
5. **GPU**: Dedicated GPU recommended for datasets > 100M points

## Credits

- **Author**: Markus Schütz
- **Institution**: Institute of Computer Graphics and Algorithms, TU Wien
- **Built with**: [Three.js](https://threejs.org), [Bun](https://bun.sh)

### Publications

- Schütz, M., Krösl, K., & Wimmer, M. (2019). *Real-Time Continuous Level of Detail Rendering of Point Clouds*. IEEE VR 2019.
- Schütz, M. (2016). *Potree: Rendering Large Point Clouds in Web Browsers*. Diploma Thesis, TU Wien.

## Sponsors

- [SkyeBrowse](https://www.skyebrowse.com)

## License

BSD 2-Clause License. See [LICENSE](LICENSE) for details.

## Related Projects

- [PotreeConverter](https://github.com/potree/PotreeConverter) - Convert point clouds to Potree format
- [PotreeDesktop](https://github.com/potree/PotreeDesktop) - Desktop viewer
- [Entwine](https://entwine.io) - Point cloud indexing for EPT
- [PDAL](https://pdal.io) - Point data abstraction library
- [LAStools](https://rapidlasso.com/lastools/) - LiDAR processing tools

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Documentation

- [modernization.md](modernization.md) - Technical review and modernization opportunities
- [modernization_plan.md](modernization_plan.md) - Detailed implementation plan