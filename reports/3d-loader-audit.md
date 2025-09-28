# 3D Loader and World Conventions Audit

**Project:** 3D Office Simulator
**Audit Date:** 2025-09-28
**Purpose:** Document 3D environment expectations for 2D→3D data mapping

## Summary

The 3D environment uses **Three.js** with a **Y-up, right-handed coordinate system**. The primary entry points are a **component factory system** and a **browser floorplan loader**. Units are in **meters** with specific defaults for wall thickness and height.

## Public Entry Points

### 1. Component Factory System (`componentFactory.js`)

**Primary API:**
```javascript
async function loadComponents() → Object
function createComponent(type, config, registry, scene) → THREE.Mesh
```

**Usage Pattern:**
```javascript
// Load component definitions
const registry = await loadComponents();

// Create component instance
const mesh = createComponent('lobbyWall', {
    position: [x, y, z],
    rotation: [rx, ry, rz]  // optional
}, registry, scene);
```

### 2. Browser Floorplan Loader (`src/runtime/loadFloorplan.browser.js`)

**Primary API:**
```javascript
async function loadFloorplan(path) → Promise<THREE.Group>
```

**Usage Pattern:**
```javascript
// Load complete scene from JSON
const floorplanGroup = await loadFloorplan('room-layout.json');
scene.add(floorplanGroup);
```

### 3. Grid Conversion Utilities (`src/lib/floorplan.js`)

**Primary APIs:**
```javascript
function gridToInstances(grid, options) → Array
function instancesToGrid(instances, options) → Array<Array<string>>
function edgeGridToInstances(grid, horizontalEdges, verticalEdges, options) → Array
```

## Coordinate System & Conventions

### Axis Orientation
- **Coordinate System:** Y-up, right-handed
- **Y-axis:** Vertical (up/down), 0 = floor level
- **X-axis:** Horizontal east-west, positive = east
- **Z-axis:** Horizontal north-south, positive = north

### Units & Scale
- **Base Unit:** Meters
- **Grid Cell Size:** 2 meters (configurable via `cellSize` parameter)
- **World Position:** `worldX = gridX * cellSize`, `worldZ = gridY * cellSize`

### Origin Systems

**Center-Based (Three.js native):**
- Origin at center of space
- Example: 40×30 lobby has bounds X(-20 to +20), Z(-15 to +15)

**Corner-Based (User-friendly):**
- Origin at southwest corner [0,0,0]
- Conversion: `centerPos = cornerPos - (dimensions/2)`
- Used by Beth the Builder system

## Wall Generation API

### Default Constants
```javascript
const WALL_HEIGHT = 8;        // meters (LOBBY_HEIGHT)
const WALL_THICKNESS = 0.1;   // meters (BoxGeometry depth)
const FLOOR_HEIGHT = 0;       // Y position
const CEILING_HEIGHT = 8;     // Y position
```

### Wall Creation Methods

**Method 1: Component Factory**
```javascript
// Creates wall from component definition
const wall = createComponent('lobbyNorthWall', {
    position: [20, 4, 30],  // [x, y, z] in meters
    rotation: [0, Math.PI, 0]  // face inward
}, registry, scene);
```

**Method 2: Procedural from Edges**
```javascript
// Creates walls from edge array
function buildWalls(edges) {
    edges.forEach(edge => {
        if (edge.dir === 'H') {
            // Horizontal wall: BoxGeometry(1, 3, 0.1)
            position = [edge.x + 0.5, 1.5, edge.y];
        } else {
            // Vertical wall: BoxGeometry(0.1, 3, 1)
            position = [edge.x, 1.5, edge.y + 0.5];
        }
    });
}
```

### Wall Material Defaults
```javascript
const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0x808080,    // Gray
    roughness: 0.7,
    metalness: 0.0
});
```

## JSON Schema Formats

### Instance Array Format
```json
{
  "instances": [
    {
      "type": "lobbyWall",
      "position": [x, y, z],
      "rotation": [rx, ry, rz],
      "name": "optional"
    }
  ]
}
```

### Component Definition Format
```json
{
  "componentType": {
    "model": "box|plane|cylinder|sphere",
    "size": [width, height, depth],
    "material": {
      "color": "#ffffff",
      "roughness": 0.7,
      "metalness": 0.0
    },
    "collision": true|false
  }
}
```

### Grid Conversion Options
```javascript
const options = {
    cellSize: 2,           // meters per grid cell
    floorHeight: 0,        // Y position for floors
    wallHeight: 4,         // Y position for walls
    gridWidth: 40,         // grid dimensions
    gridHeight: 30,
    includeReferencePole: true
};
```

## Minimal "Hello Room" Example

### JSON Input (`hello-room.json`):
```json
{
  "instances": [
    {
      "type": "referencePole",
      "position": [0, 0.5, 0]
    },
    {
      "type": "lobbyFloor",
      "position": [1, 0, 1],
      "rotation": [-1.5707963267948966, 0, 0]
    },
    {
      "type": "lobbyWall",
      "position": [0, 2, 1],
      "rotation": [0, 1.5707963267948966, 0]
    },
    {
      "type": "lobbyWall",
      "position": [1, 2, 0],
      "rotation": [0, 0, 0]
    },
    {
      "type": "lobbyWall",
      "position": [2, 2, 1],
      "rotation": [0, -1.5707963267948966, 0]
    }
  ]
}
```

### JavaScript Loader:
```javascript
// Load the room
const roomGroup = await loadFloorplan('hello-room.json');
scene.add(roomGroup);

// Result: 2×2 meter room with 3 walls and 1 opening
```

### Direct Component Creation:
```javascript
const registry = await loadComponents();

// Create floor
createComponent('lobbyFloor', {
    position: [1, 0, 1],
    rotation: [-Math.PI/2, 0, 0]
}, registry, scene);

// Create walls with gap
createComponent('lobbyWall', { position: [0, 2, 1] }, registry, scene); // West wall
createComponent('lobbyWall', { position: [1, 2, 0] }, registry, scene); // South wall
createComponent('lobbyWall', { position: [2, 2, 1] }, registry, scene); // East wall
// North wall omitted = doorway/gap
```

## Material System

### Standard Materials
- **Walls:** Gray (#808080), roughness 0.7, metalness 0.0
- **Floors:** Green (#90EE90) or brown (#8B4513)
- **Ceilings:** Light gray (#e6e6fa)

### Collision Detection
- Enabled via `collision: true` in component definitions
- Creates `mesh.userData.collider` as THREE.Box3
- Used for movement boundaries and interaction

## Technical Notes

### Rotation Values
- Floor rotation: `[-π/2, 0, 0]` (flat, facing up)
- Ceiling rotation: `[π/2, 0, 0]` (flat, facing down)
- Wall rotations: `[0, 0, 0]`, `[0, π/2, 0]`, `[0, π, 0]`, `[0, -π/2, 0]`

### Performance Considerations
- Floor strips merged for contiguous tiles
- Single material per wall type
- Geometry reuse through component system

### Browser Compatibility
- Requires WebGL support
- Three.js r128 or compatible
- Modern ES6+ features (async/await, modules)