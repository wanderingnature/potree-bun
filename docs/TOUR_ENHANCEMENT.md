# Tour System Enhancement

## Executive Summary

This document describes an enhancement to Potree that enables editors to create guided tours by combining annotations with smooth camera animations. Tours can be saved as part of a project and shared via URL, allowing viewers to experience curated walkthroughs of point cloud scenes.

---

## 1. Functional Requirements

### 1.1 User Roles

| Role | Description |
|------|-------------|
| **Editor** | Creates annotations, designs tours, exports projects |
| **Viewer** | Loads shared projects, plays tours, explores scenes |

### 1.2 Editor Workflow

```
1. Load Point Cloud
   └─> Open scene via URL (?r=scene.copc.laz) or file drop

2. Create Annotations
   └─> Place annotation markers at points of interest
   └─> Set camera view (position + target) for each annotation
   └─> Add title and description content

3. Create Tour
   └─> Select annotations to include in tour
   └─> Arrange order of stops
   └─> Configure per-stop settings:
       • Show description: auto | manual | hidden
       • Pause duration: seconds to wait at stop
   └─> Configure tour settings:
       • Transition duration: camera travel time between stops
       • Loop: repeat tour continuously
       • Curve type: centripetal | chordal | catmullrom

4. Preview & Adjust
   └─> Play tour to preview
   └─> Scrub timeline to specific positions
   └─> Adjust control points if needed

5. Export & Share
   └─> Export project as JSON file
   └─> Host JSON file at accessible URL
   └─> Share URL: viewer.html?project=https://example.com/tour.json
```

### 1.3 Viewer Workflow

```
1. Open Shared URL
   └─> Browser loads: viewer.html?project=https://example.com/tour.json

2. Project Loads Automatically
   └─> Point cloud(s) load
   └─> Annotations appear in scene
   └─> Tour(s) available in sidebar

3. Play Tour
   └─> Click play on tour
   └─> Camera smoothly animates between annotation views
   └─> Descriptions appear at each stop (if configured)
   └─> Tour completes or loops

4. Manual Exploration
   └─> Pause tour at any time
   └─> Click annotations to jump to views
   └─> Resume tour or explore freely
```

### 1.4 Feature Requirements

#### 1.4.1 Tour Creation

| Requirement | Priority | Description |
|-------------|----------|-------------|
| FR-1 | Must | Create tour from selected annotations |
| FR-2 | Must | Reorder tour stops via drag-and-drop |
| FR-3 | Must | Remove stops from tour |
| FR-4 | Should | Add current view as ad-hoc stop (no annotation) |
| FR-5 | Should | Duplicate existing tour |
| FR-6 | Could | Import/export individual tour (not full project) |

#### 1.4.2 Tour Playback

| Requirement | Priority | Description |
|-------------|----------|-------------|
| FR-10 | Must | Smooth spline-based camera path between stops |
| FR-11 | Must | Play/pause/stop controls |
| FR-12 | Must | Timeline scrubber to seek position |
| FR-13 | Should | Pause at each stop for configurable duration |
| FR-14 | Should | Auto-show annotation description at stops |
| FR-15 | Should | Next/previous stop buttons |
| FR-16 | Could | Playback speed control |
| FR-17 | Could | Audio narration support |

#### 1.4.3 Tour Configuration

| Requirement | Priority | Description |
|-------------|----------|-------------|
| FR-20 | Must | Set tour name |
| FR-21 | Must | Set transition duration (total or per-segment) |
| FR-22 | Should | Set pause duration per stop |
| FR-23 | Should | Set description display mode per stop |
| FR-24 | Should | Set curve interpolation type |
| FR-25 | Should | Enable/disable loop mode |
| FR-26 | Could | Set easing function for transitions |

#### 1.4.4 Project Sharing

| Requirement | Priority | Description |
|-------------|----------|-------------|
| FR-30 | Must | Load project from URL via ?project= parameter |
| FR-31 | Must | Tours included in project export |
| FR-32 | Should | Auto-play tour on project load (optional) |
| FR-33 | Could | Deep-link to specific tour: ?project=...&tour=uuid |

---

## 2. Technical Design

### 2.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                          Potree Viewer                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐ │
│  │ Annotations │───▶│    Tour     │───▶│  CameraAnimation    │ │
│  │             │    │             │    │  (generated)        │ │
│  │ • position  │    │ • stops[]   │    │                     │ │
│  │ • camPos    │    │ • settings  │    │ • controlPoints[]   │ │
│  │ • camTarget │    │ • play()    │    │ • play()            │ │
│  │ • title     │    │             │    │ • at(t)             │ │
│  │ • desc      │    │             │    │                     │ │
│  └─────────────┘    └─────────────┘    └─────────────────────┘ │
│         │                  │                      │             │
│         ▼                  ▼                      ▼             │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Scene                                    ││
│  │  • annotations[]                                            ││
│  │  • tours[]           ◀── NEW                                ││
│  │  • cameraAnimations[]                                       ││
│  └─────────────────────────────────────────────────────────────┘│
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              SaveProject / LoadProject                      ││
│  │  • pointclouds, measurements, volumes, annotations          ││
│  │  • tours[]           ◀── NEW                                ││
│  │  • cameraAnimations[]                                       ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Structures

#### 2.2.1 Tour Class

```javascript
// src/modules/Tour/Tour.js

import * as THREE from "three";
import { EventDispatcher } from "../../EventDispatcher.js";
import { CameraAnimation } from "../CameraAnimation/CameraAnimation.js";

/**
 * Represents a stop in the tour
 */
class TourStop {
    constructor() {
        this.annotationUuid = null;     // Reference to annotation (null for ad-hoc)
        this.position = null;           // THREE.Vector3 - camera position (for ad-hoc)
        this.target = null;             // THREE.Vector3 - camera target (for ad-hoc)
        this.title = "";                // Override title (for ad-hoc or custom)
        this.description = "";          // Override description
        this.descriptionMode = "auto";  // "auto" | "manual" | "hidden"
        this.pauseDuration = null;      // null = use tour default, number = ms
    }
}

/**
 * Tour settings
 */
class TourSettings {
    constructor() {
        this.transitionDuration = 3000;     // ms per transition
        this.defaultPauseDuration = 2000;   // ms pause at each stop
        this.curveType = "centripetal";     // spline type
        this.loop = false;                  // repeat when finished
        this.autoPlay = false;              // play on load
        this.showDescriptions = true;       // global toggle
    }
}

/**
 * Tour - Links annotations into a guided camera path
 */
export class Tour extends EventDispatcher {

    constructor(viewer) {
        super();

        this.viewer = viewer;
        this.uuid = THREE.MathUtils.generateUUID();
        this.name = "Tour";
        this.stops = [];                    // TourStop[]
        this.settings = new TourSettings();

        // Playback state
        this.isPlaying = false;
        this.isPaused = false;
        this.currentStopIndex = 0;
        this.currentT = 0;                  // 0-1 position in tour

        // Generated animation (rebuilt when stops change)
        this._animation = null;
        this._animationDirty = true;
    }

    /**
     * Add an annotation as a tour stop
     */
    addStop(annotation, options = {}) {
        const stop = new TourStop();
        stop.annotationUuid = annotation.uuid;
        stop.descriptionMode = options.descriptionMode || "auto";
        stop.pauseDuration = options.pauseDuration || null;

        this.stops.push(stop);
        this._animationDirty = true;

        this.dispatchEvent({ type: "stop_added", stop, tour: this });
        return stop;
    }

    /**
     * Add an ad-hoc stop (not linked to annotation)
     */
    addAdHocStop(position, target, options = {}) {
        const stop = new TourStop();
        stop.position = position.clone();
        stop.target = target.clone();
        stop.title = options.title || "";
        stop.description = options.description || "";
        stop.descriptionMode = options.descriptionMode || "hidden";
        stop.pauseDuration = options.pauseDuration || null;

        this.stops.push(stop);
        this._animationDirty = true;

        this.dispatchEvent({ type: "stop_added", stop, tour: this });
        return stop;
    }

    /**
     * Remove a stop from the tour
     */
    removeStop(stop) {
        const index = this.stops.indexOf(stop);
        if (index !== -1) {
            this.stops.splice(index, 1);
            this._animationDirty = true;
            this.dispatchEvent({ type: "stop_removed", stop, tour: this });
        }
    }

    /**
     * Reorder stops
     */
    moveStop(fromIndex, toIndex) {
        if (fromIndex < 0 || fromIndex >= this.stops.length) return;
        if (toIndex < 0 || toIndex >= this.stops.length) return;

        const [stop] = this.stops.splice(fromIndex, 1);
        this.stops.splice(toIndex, 0, stop);
        this._animationDirty = true;

        this.dispatchEvent({ type: "stops_reordered", tour: this });
    }

    /**
     * Find annotation by UUID
     */
    _findAnnotation(uuid) {
        let found = null;
        this.viewer.scene.annotations.traverse(a => {
            if (a.uuid === uuid) found = a;
        });
        return found;
    }

    /**
     * Get camera position/target for a stop
     */
    _getStopView(stop) {
        if (stop.annotationUuid) {
            const annotation = this._findAnnotation(stop.annotationUuid);
            if (annotation && annotation.cameraPosition && annotation.cameraTarget) {
                return {
                    position: annotation.cameraPosition.clone(),
                    target: annotation.cameraTarget.clone(),
                    annotation: annotation
                };
            }
        }

        // Ad-hoc stop or fallback
        if (stop.position && stop.target) {
            return {
                position: stop.position.clone(),
                target: stop.target.clone(),
                annotation: null
            };
        }

        return null;
    }

    /**
     * Rebuild internal CameraAnimation from stops
     */
    _rebuildAnimation() {
        if (!this._animationDirty) return this._animation;

        // Clean up old animation
        if (this._animation) {
            this._animation.setVisible(false);
            // TODO: proper disposal
        }

        const animation = new CameraAnimation(this.viewer);
        animation.name = `${this.name} (generated)`;
        animation.curveType = this.settings.curveType;
        animation.visible = false;  // Don't show control points

        // Clear default control points
        while (animation.controlPoints.length > 0) {
            animation.removeControlPoint(animation.controlPoints[0]);
        }

        // Add control points from stops
        for (const stop of this.stops) {
            const view = this._getStopView(stop);
            if (view) {
                const cp = animation.createControlPoint();
                cp.position.copy(view.position);
                cp.target.copy(view.target);
            }
        }

        // Calculate total duration
        const numTransitions = Math.max(0, this.stops.length - 1);
        animation.duration = (numTransitions * this.settings.transitionDuration) / 1000;

        this._animation = animation;
        this._animationDirty = false;

        return animation;
    }

    /**
     * Get total tour duration in milliseconds
     */
    getTotalDuration() {
        const numTransitions = Math.max(0, this.stops.length - 1);
        const transitionTime = numTransitions * this.settings.transitionDuration;

        let pauseTime = 0;
        for (const stop of this.stops) {
            const pause = stop.pauseDuration ?? this.settings.defaultPauseDuration;
            pauseTime += pause;
        }

        return transitionTime + pauseTime;
    }

    /**
     * Play the tour
     */
    play() {
        if (this.stops.length < 2) {
            console.warn("Tour needs at least 2 stops to play");
            return;
        }

        this._rebuildAnimation();

        this.isPlaying = true;
        this.isPaused = false;
        this.currentStopIndex = 0;
        this.currentT = 0;

        const startTime = performance.now();
        const totalDuration = this.getTotalDuration();

        const onUpdate = () => {
            if (!this.isPlaying) {
                this.viewer.removeEventListener("update", onUpdate);
                return;
            }

            if (this.isPaused) return;

            const elapsed = performance.now() - startTime;
            this.currentT = elapsed / totalDuration;

            if (this.currentT >= 1) {
                if (this.settings.loop) {
                    this.currentT = 0;
                    // Restart timing
                    // ... (would need to reset startTime)
                } else {
                    this.stop();
                    return;
                }
            }

            // Map currentT to animation t (excluding pause times)
            const animT = this._mapToAnimationT(this.currentT);
            const frame = this._animation.at(animT);

            this.viewer.scene.view.position.copy(frame.position);
            this.viewer.scene.view.lookAt(frame.target);

            // Check if we've arrived at a stop
            this._checkStopArrival(animT);
        };

        this.viewer.addEventListener("update", onUpdate);
        this._updateHandler = onUpdate;

        this.dispatchEvent({ type: "play", tour: this });
    }

    /**
     * Map tour progress (0-1 including pauses) to animation t (0-1 transitions only)
     */
    _mapToAnimationT(tourT) {
        // Simplified: ignores pauses for now
        // Full implementation would account for pause durations
        return Math.min(1, Math.max(0, tourT));
    }

    /**
     * Check if camera has arrived at a stop, trigger description display
     */
    _checkStopArrival(animT) {
        const numStops = this.stops.length;
        const stopInterval = 1 / (numStops - 1);
        const stopIndex = Math.floor(animT / stopInterval);

        if (stopIndex !== this.currentStopIndex && stopIndex < numStops) {
            this.currentStopIndex = stopIndex;
            const stop = this.stops[stopIndex];

            this.dispatchEvent({
                type: "stop_arrived",
                stop,
                stopIndex,
                tour: this
            });

            // Handle description display
            if (this.settings.showDescriptions && stop.descriptionMode === "auto") {
                const view = this._getStopView(stop);
                if (view && view.annotation) {
                    view.annotation.setHighlighted(true);

                    // Auto-hide after pause duration
                    const pause = stop.pauseDuration ?? this.settings.defaultPauseDuration;
                    setTimeout(() => {
                        view.annotation.setHighlighted(false);
                    }, pause);
                }
            }
        }
    }

    /**
     * Pause playback
     */
    pause() {
        this.isPaused = true;
        this.dispatchEvent({ type: "pause", tour: this });
    }

    /**
     * Resume playback
     */
    resume() {
        this.isPaused = false;
        this.dispatchEvent({ type: "resume", tour: this });
    }

    /**
     * Stop playback
     */
    stop() {
        this.isPlaying = false;
        this.isPaused = false;

        if (this._updateHandler) {
            this.viewer.removeEventListener("update", this._updateHandler);
            this._updateHandler = null;
        }

        this.dispatchEvent({ type: "stop", tour: this });
    }

    /**
     * Jump to specific stop
     */
    goToStop(index) {
        if (index < 0 || index >= this.stops.length) return;

        const stop = this.stops[index];
        const view = this._getStopView(stop);

        if (view) {
            // Use smooth transition
            this.viewer.scene.view.lookAtSmooth(
                view.position,
                view.target,
                this.settings.transitionDuration
            );

            this.currentStopIndex = index;
            this.dispatchEvent({ type: "stop_jumped", stop, stopIndex: index, tour: this });
        }
    }

    /**
     * Go to next stop
     */
    nextStop() {
        this.goToStop(this.currentStopIndex + 1);
    }

    /**
     * Go to previous stop
     */
    previousStop() {
        this.goToStop(this.currentStopIndex - 1);
    }

    /**
     * Serialize to JSON
     */
    toJSON() {
        return {
            uuid: this.uuid,
            name: this.name,
            stops: this.stops.map(stop => ({
                annotationUuid: stop.annotationUuid,
                position: stop.position ? stop.position.toArray() : null,
                target: stop.target ? stop.target.toArray() : null,
                title: stop.title,
                description: stop.description,
                descriptionMode: stop.descriptionMode,
                pauseDuration: stop.pauseDuration
            })),
            settings: {
                transitionDuration: this.settings.transitionDuration,
                defaultPauseDuration: this.settings.defaultPauseDuration,
                curveType: this.settings.curveType,
                loop: this.settings.loop,
                autoPlay: this.settings.autoPlay,
                showDescriptions: this.settings.showDescriptions
            }
        };
    }

    /**
     * Create Tour from JSON data
     */
    static fromJSON(viewer, data) {
        const tour = new Tour(viewer);

        tour.uuid = data.uuid || tour.uuid;
        tour.name = data.name || "Tour";

        // Restore settings
        if (data.settings) {
            Object.assign(tour.settings, data.settings);
        }

        // Restore stops
        for (const stopData of data.stops || []) {
            const stop = new TourStop();
            stop.annotationUuid = stopData.annotationUuid;
            stop.position = stopData.position ?
                new THREE.Vector3().fromArray(stopData.position) : null;
            stop.target = stopData.target ?
                new THREE.Vector3().fromArray(stopData.target) : null;
            stop.title = stopData.title || "";
            stop.description = stopData.description || "";
            stop.descriptionMode = stopData.descriptionMode || "auto";
            stop.pauseDuration = stopData.pauseDuration;

            tour.stops.push(stop);
        }

        tour._animationDirty = true;

        return tour;
    }
}

// Export TourStop for external use
export { TourStop, TourSettings };
```

#### 2.2.2 Tour Data Schema (JSON)

```json
{
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Historic Building Tour",
    "stops": [
        {
            "annotationUuid": "a1b2c3d4-...",
            "position": null,
            "target": null,
            "title": "",
            "description": "",
            "descriptionMode": "auto",
            "pauseDuration": null
        },
        {
            "annotationUuid": null,
            "position": [100.5, 200.3, 50.0],
            "target": [100.0, 200.0, 45.0],
            "title": "Custom Viewpoint",
            "description": "An interesting angle",
            "descriptionMode": "manual",
            "pauseDuration": 5000
        }
    ],
    "settings": {
        "transitionDuration": 3000,
        "defaultPauseDuration": 2000,
        "curveType": "centripetal",
        "loop": false,
        "autoPlay": false,
        "showDescriptions": true
    }
}
```

#### 2.2.3 Extended Project Schema

```json
{
    "type": "Potree",
    "version": 1.8,
    "settings": { ... },
    "view": { ... },
    "pointclouds": [ ... ],
    "measurements": [ ... ],
    "volumes": [ ... ],
    "annotations": [ ... ],
    "cameraAnimations": [ ... ],
    "tours": [
        {
            "uuid": "...",
            "name": "Main Tour",
            "stops": [ ... ],
            "settings": { ... }
        }
    ],
    "profiles": [ ... ]
}
```

### 2.3 Component Interactions

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│    Sidebar UI    │     │      Tour        │     │ CameraAnimation  │
│                  │     │                  │     │                  │
│ • Tour list      │────▶│ • stops[]        │────▶│ • controlPoints  │
│ • Create tour    │     │ • settings       │     │ • cameraCurve    │
│ • Edit stops     │     │ • play/pause     │     │ • targetCurve    │
│ • Play controls  │     │                  │     │                  │
└──────────────────┘     └──────────────────┘     └──────────────────┘
         │                        │                        │
         │                        │                        │
         ▼                        ▼                        ▼
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Annotations    │     │    Viewer        │     │      Scene       │
│                  │     │                  │     │                  │
│ • cameraPosition │◀────│ • scene.view     │────▶│ • tours[]        │
│ • cameraTarget   │     │ • update loop    │     │ • annotations    │
│ • title/desc     │     │ • render         │     │                  │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

### 2.4 Event Flow

```
User clicks "Play Tour"
         │
         ▼
    Tour.play()
         │
         ├──▶ _rebuildAnimation()
         │         │
         │         └──▶ Create CameraAnimation from stops
         │
         ├──▶ Register update listener
         │
         ▼
    Each frame (viewer "update" event)
         │
         ├──▶ Calculate elapsed time
         │
         ├──▶ Map to animation parameter t
         │
         ├──▶ Get camera frame from animation.at(t)
         │
         ├──▶ Update scene.view.position/target
         │
         ├──▶ Check if arrived at stop
         │         │
         │         └──▶ Dispatch "stop_arrived" event
         │                    │
         │                    └──▶ Show annotation description
         │
         └──▶ Check if tour complete
                   │
                   └──▶ Stop or loop
```

---

## 3. Implementation Plan

### 3.1 Phase 1: Foundation (Core Tour Class)

**Estimated Scope:** Core functionality, no UI

#### Task 1.1: Create Tour Module Structure
```
src/modules/Tour/
├── Tour.js           # Main Tour class
├── TourStop.js       # Stop data class
├── TourSettings.js   # Settings class
└── index.js          # Module exports
```

**Files to create:**
- `src/modules/Tour/Tour.js`
- `src/modules/Tour/TourStop.js`
- `src/modules/Tour/TourSettings.js`
- `src/modules/Tour/index.js`

#### Task 1.2: Integrate Tour into Scene
```javascript
// src/viewer/Scene.js - Add tours array and methods

this.tours = [];

addTour(tour) {
    this.tours.push(tour);
    this.dispatchEvent({ type: "tour_added", tour });
}

removeTour(tour) {
    const index = this.tours.indexOf(tour);
    if (index !== -1) {
        this.tours.splice(index, 1);
        this.dispatchEvent({ type: "tour_removed", tour });
    }
}
```

**Files to modify:**
- `src/viewer/Scene.js`

#### Task 1.3: Add Tour to SaveProject
```javascript
// src/viewer/SaveProject.js

function createTourData(tour) {
    return tour.toJSON();
}

// In saveProject():
tours: scene.tours.map(createTourData),
```

**Files to modify:**
- `src/viewer/SaveProject.js`

#### Task 1.4: Add Tour to LoadProject
```javascript
// src/viewer/LoadProject.js

import { Tour } from "../modules/Tour/Tour.js";

function loadTour(viewer, data) {
    const duplicate = viewer.scene.tours.find(t => t.uuid === data.uuid);
    if (duplicate) return;

    const tour = Tour.fromJSON(viewer, data);
    viewer.scene.addTour(tour);
}

// In loadProject():
for (const tourData of data.tours || []) {
    loadTour(viewer, tourData);
}
```

**Files to modify:**
- `src/viewer/LoadProject.js`

#### Task 1.5: Export Tour from Potree.js
```javascript
// src/Potree.js

export { Tour, TourStop, TourSettings } from "./modules/Tour/index.js";
```

**Files to modify:**
- `src/Potree.js`

### 3.2 Phase 2: URL Loading

**Estimated Scope:** Enable project loading via URL parameter

#### Task 2.1: Add ?project= Parameter Support
```javascript
// index.html (or viewer entry point)

var project = getQueryParam('project');
if (project) {
    viewer.loadProject(project).then(() => {
        console.log("Project loaded from URL");

        // Optional: auto-play first tour
        var autoplay = getQueryParam('autoplay');
        if (autoplay === 'true' && viewer.scene.tours.length > 0) {
            viewer.scene.tours[0].play();
        }
    });
}
```

**Files to modify:**
- `index.html`

#### Task 2.2: Add ?tour= Parameter for Deep Linking
```javascript
// After project loads:
var tourId = getQueryParam('tour');
if (tourId) {
    const tour = viewer.scene.tours.find(t => t.uuid === tourId || t.name === tourId);
    if (tour) {
        tour.play();
    }
}
```

**Files to modify:**
- `index.html`

### 3.3 Phase 3: Basic UI

**Estimated Scope:** Minimal UI for tour creation and playback

#### Task 3.1: Add Tours to Sidebar Scene Tree
```javascript
// src/viewer/sidebar.js

// In initScene(), add tour event handlers:
let onTourAdded = (e) => {
    const tour = e.tour;
    const tourIcon = `${Potree.resourcePath}/icons/tour.svg`;
    createNode(otherID, "tour", tourIcon, tour);
};

this.viewer.scene.addEventListener("tour_added", onTourAdded);
```

**Files to modify:**
- `src/viewer/sidebar.js`

#### Task 3.2: Create Tour Properties Panel
```javascript
// src/viewer/PropertyPanels/TourPanel.js

export class TourPanel {
    constructor(container, viewer) {
        this.container = container;
        this.viewer = viewer;
        this.tour = null;
    }

    setTour(tour) {
        this.tour = tour;
        this.update();
    }

    update() {
        // Render:
        // - Tour name (editable)
        // - Stop list (reorderable)
        // - Settings controls
        // - Play/Pause/Stop buttons
        // - Timeline scrubber
    }
}
```

**Files to create:**
- `src/viewer/PropertyPanels/TourPanel.js`

**Files to modify:**
- `src/viewer/PropertyPanels/PropertiesPanel.js`

#### Task 3.3: Add Tour Creation Button
```javascript
// src/viewer/sidebar.js - In initToolbar() or initNavigation()

elNavigation.append(this.createToolIcon(
    Potree.resourcePath + "/icons/tour.svg",
    "[title]tt.create_tour",
    () => {
        const tour = new Potree.Tour(this.viewer);
        tour.name = "New Tour";
        this.viewer.scene.addTour(tour);

        // Open properties panel for editing
    }
));
```

**Files to modify:**
- `src/viewer/sidebar.js`

#### Task 3.4: Create Tour Icon
```xml
<!-- build/potree/resources/icons/tour.svg -->
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
    <circle cx="12" cy="9" r="2.5"/>
    <path d="M17 17l4 4M17 21l4-4" stroke-width="2"/>
</svg>
```

**Files to create:**
- `build/potree/resources/icons/tour.svg`

### 3.4 Phase 4: Enhanced UI

**Estimated Scope:** Full editing capabilities

#### Task 4.1: Stop Reordering (Drag & Drop)
- Use jQuery UI sortable on stop list
- Update tour.moveStop() on drop

#### Task 4.2: Add Annotation to Tour
- Context menu on annotation: "Add to Tour"
- Or drag annotation onto tour in tree

#### Task 4.3: Per-Stop Settings
- Expand stop item to show settings
- Description mode dropdown
- Pause duration input

#### Task 4.4: Tour Settings Panel
- Transition duration slider
- Default pause duration slider
- Curve type dropdown
- Loop checkbox
- Auto-play checkbox

#### Task 4.5: Playback Controls
- Play/Pause toggle button
- Stop button
- Previous/Next stop buttons
- Timeline slider with stop markers
- Current stop indicator

### 3.5 Phase 5: Polish & Edge Cases

#### Task 5.1: Handle Missing Annotations
- When loading tour, validate all annotation UUIDs exist
- Mark invalid stops, allow user to fix or remove

#### Task 5.2: Handle Annotation Deletion
- When annotation deleted, remove from all tours or mark invalid
- Prompt user before deleting annotation used in tours

#### Task 5.3: Tour Preview Mode
- Show camera path visualization (like CameraAnimation)
- Show stop markers on path

#### Task 5.4: Keyboard Shortcuts
- Space: Play/Pause
- Escape: Stop
- Left/Right arrows: Previous/Next stop

#### Task 5.5: Mobile Support
- Touch-friendly controls
- Swipe for next/previous

---

## 4. File Change Summary

### New Files

| File | Description |
|------|-------------|
| `src/modules/Tour/Tour.js` | Main Tour class |
| `src/modules/Tour/TourStop.js` | Stop data class |
| `src/modules/Tour/TourSettings.js` | Settings class |
| `src/modules/Tour/index.js` | Module exports |
| `src/viewer/PropertyPanels/TourPanel.js` | Tour editing UI |
| `build/potree/resources/icons/tour.svg` | Tour icon |
| `docs/TOUR_ENHANCEMENT.md` | This document |

### Modified Files

| File | Changes |
|------|---------|
| `src/Potree.js` | Export Tour classes |
| `src/viewer/Scene.js` | Add tours array, addTour/removeTour methods |
| `src/viewer/SaveProject.js` | Serialize tours |
| `src/viewer/LoadProject.js` | Deserialize tours |
| `src/viewer/sidebar.js` | Tour creation button, tree integration |
| `src/viewer/PropertyPanels/PropertiesPanel.js` | TourPanel integration |
| `index.html` | ?project= and ?tour= URL parameters |

---

## 5. Testing Plan

### 5.1 Unit Tests

| Test | Description |
|------|-------------|
| Tour creation | Create tour, verify uuid and default settings |
| Add annotation stop | Add stop, verify annotationUuid stored |
| Add ad-hoc stop | Add stop with position/target, verify data |
| Remove stop | Remove stop, verify removed from array |
| Reorder stops | Move stop, verify new order |
| Serialize/deserialize | toJSON → fromJSON round-trip |

### 5.2 Integration Tests

| Test | Description |
|------|-------------|
| SaveProject with tours | Save project, verify tours in JSON |
| LoadProject with tours | Load project, verify tours restored |
| URL loading | Load via ?project=, verify scene loaded |
| Tour playback | Play tour, verify camera moves through stops |

### 5.3 Manual Tests

| Test | Description |
|------|-------------|
| Create tour from annotations | Full editor workflow |
| Share via URL | Export, host, load via URL |
| Play tour on load | ?project=...&autoplay=true |
| Edge case: empty tour | Try to play tour with 0-1 stops |
| Edge case: deleted annotation | Delete annotation used in tour |

---

## 6. Future Enhancements

### 6.1 Audio Narration
- Add `audioUrl` to TourStop
- Play audio at each stop
- Sync with pause duration

### 6.2 Branching Tours
- Allow user choices at stops
- "Go to stop A or stop B"
- Non-linear narratives

### 6.3 Tour Templates
- Save tour structure without annotation references
- Apply template to different scenes

### 6.4 Tour Analytics
- Track which stops users view
- Time spent at each stop
- Completion rate

### 6.5 Collaborative Editing
- Multiple editors working on same tour
- Real-time sync via WebSocket

---

## 7. Glossary

| Term | Definition |
|------|------------|
| **Annotation** | A marker in the scene with title, description, and optional camera view |
| **Tour** | An ordered sequence of stops that creates a guided camera path |
| **Stop** | A point in the tour, either linked to an annotation or ad-hoc |
| **Ad-hoc Stop** | A tour stop with custom position/target, not linked to an annotation |
| **Control Point** | A point in CameraAnimation that defines camera position and target |
| **Project** | A JSON file containing all scene data (pointclouds, annotations, tours, etc.) |
