# 2D→3D Mapping Draft

**Project:** 3D Office Simulator
**Date:** 2025-09-28
**Purpose:** Define exact conversions from 2D floorplan data to 3D scene

## Into 3D

This section documents the exact coordinate conversions and axis transformations required to map 2D floorplan data into the 3D environment.

### Coordinate System Mapping

**2D Input Conventions:**
- **X-axis:** Horizontal, positive = right/east
- **Y-axis:** Vertical, positive = up/north
- **Origin:** Typically top-left or bottom-left corner
- **Units:** Grid cells, pixels, or real-world units

**3D Target Conventions:**
- **X-axis:** Horizontal east-west, positive = east
- **Y-axis:** Vertical up-down, positive = up
- **Z-axis:** Horizontal north-south, positive = north
- **Units:** Meters
- **Handedness:** Right-handed coordinate system

### Axis Flip Transformations

**Standard 2D→3D Mapping:**
```javascript
// 2D floorplan coordinates (x, y) → 3D world coordinates (x, y, z)
const world3D = {
    x: floorplan2D.x * cellSize,           // X maps to X (east-west)
    y: floorHeightY,                       // Y becomes elevation (0 for floors)
    z: floorplan2D.y * cellSize           // Y maps to Z (north-south)
};
```

**Grid Cell Conversion:**
```javascript
// Convert 2D grid position to 3D world position
function gridTo3D(gridX, gridY, options = {}) {
    const { cellSize = 2, floorHeight = 0, wallHeight = 4 } = options;

    return {
        floor: [gridX * cellSize, floorHeight, gridY * cellSize],
        wall: [gridX * cellSize, wallHeight, gridY * cellSize]
    };
}
```

### Corner-Based vs Center-Based Origins

**Corner-Based (User Input):**
- Origin at southwest corner [0,0,0]
- Natural for 2D CAD/floorplan tools
- Used by Beth the Builder system

**Center-Based (Three.js):**
- Origin at center of geometry
- Required for Three.js PlaneGeometry and BoxGeometry
- Automatic conversion: `centerPos = cornerPos - (dimensions/2)`

**Conversion Formula:**
```javascript
// Corner-based to center-based conversion
function cornerToCenter(cornerPos, dimensions) {
    return {
        x: cornerPos.x - dimensions.width / 2,
        y: cornerPos.y,  // Y unchanged
        z: cornerPos.z - dimensions.depth / 2
    };
}

// Example: 40×30 lobby with SW corner at [0,0,0]
const centerPos = cornerToCenter([20, 0, 15], { width: 40, depth: 30 });
// Result: [0, 0, 0] (center-based origin)
```

### Wall Edge Conversion

**2D Edge Definition:**
- Horizontal edges: separators between north-south adjacent cells
- Vertical edges: separators between east-west adjacent cells
- Edge position: grid intersection points

**3D Wall Generation:**
```javascript
// Convert 2D edges to 3D wall positions
function edgeTo3DWall(edge, options = {}) {
    const { cellSize = 2, wallHeight = 3, wallThickness = 0.1 } = options;

    if (edge.dir === 'H') {
        // Horizontal edge → east-west wall
        return {
            geometry: new THREE.BoxGeometry(cellSize, wallHeight, wallThickness),
            position: [edge.x * cellSize + cellSize/2, wallHeight/2, edge.y * cellSize]
        };
    } else {
        // Vertical edge → north-south wall
        return {
            geometry: new THREE.BoxGeometry(wallThickness, wallHeight, cellSize),
            position: [edge.x * cellSize, wallHeight/2, edge.y * cellSize + cellSize/2]
        };
    }
}
```

### Rotation Adjustments

**Floor Rotation:**
- 2D floors are inherently flat (no rotation needed)
- 3D floors: rotate -90° around X-axis to lie flat
- `rotation: [-Math.PI/2, 0, 0]`

**Wall Orientation:**
```javascript
// Wall rotation based on direction
const wallRotations = {
    north: [0, Math.PI, 0],        // Face south (inward)
    south: [0, 0, 0],              // Face north (inward)
    east: [0, -Math.PI/2, 0],      // Face west (inward)
    west: [0, Math.PI/2, 0]        // Face east (inward)
};
```

### Scale Factors

**Default Scale Mapping:**
- Grid cell size: 2 meters (configurable)
- Wall height: 8 meters (LOBBY_HEIGHT)
- Wall thickness: 0.1 meters
- Floor elevation: 0 meters

**Conversion Options:**
```javascript
const conversionOptions = {
    cellSize: 2,           // meters per 2D grid cell
    floorHeight: 0,        // Y elevation for floors
    wallHeight: 8,         // wall height in meters
    wallThickness: 0.1,    // wall depth in meters
    units: 'meters'        // target 3D units
};
```

### JSON Output Format

**Target Instance Structure:**
```json
{
  "instances": [
    {
      "type": "lobbyFloor",
      "position": [x, y, z],
      "rotation": [rx, ry, rz]
    },
    {
      "type": "lobbyWall",
      "position": [x, y, z],
      "rotation": [rx, ry, rz]
    }
  ]
}
```

### Complete Conversion Example

**Input 2D Grid:**
```
2D Grid (4×3):
0 1 2 3 (X)
┌─┬─┬─┬─┐
│W│F│F│W│ 0 (Y)
├─┼─┼─┼─┤
│W│F│F│W│ 1
├─┼─┼─┼─┤
│W│W│W│W│ 2
└─┴─┴─┴─┘
```

**Output 3D Positions (cellSize=2):**
```javascript
// Floors at Y=0
{ type: "lobbyFloor", position: [2, 0, 0], rotation: [-π/2, 0, 0] }  // Grid(1,0)
{ type: "lobbyFloor", position: [4, 0, 0], rotation: [-π/2, 0, 0] }  // Grid(2,0)
{ type: "lobbyFloor", position: [2, 0, 2], rotation: [-π/2, 0, 0] }  // Grid(1,1)
{ type: "lobbyFloor", position: [4, 0, 2], rotation: [-π/2, 0, 0] }  // Grid(2,1)

// Walls at Y=4 (center height)
{ type: "lobbyWall", position: [0, 4, 0], rotation: [0, π/2, 0] }    // Grid(0,0)
{ type: "lobbyWall", position: [6, 4, 0], rotation: [0, -π/2, 0] }   // Grid(3,0)
{ type: "lobbyWall", position: [0, 4, 2], rotation: [0, π/2, 0] }    // Grid(0,1)
{ type: "lobbyWall", position: [6, 4, 2], rotation: [0, -π/2, 0] }   // Grid(3,1)
// ... (bottom row walls)
```

### Validation Rules

**Geometric Constraints:**
- All positions must be non-negative in corner-based system
- Wall positions must align with grid edges
- Floor positions must align with grid centers
- Rotations must use standard increments (π/2, π, etc.)

**Consistency Checks:**
- Floor area must be enclosed by walls
- No overlapping geometries
- Wall gaps indicate doorways/openings
- Reference pole at origin [0,0.5,0] for debugging

### Implementation Notes

**Performance Optimizations:**
- Merge contiguous floor tiles into strips
- Share materials across similar components
- Use instanced rendering for repeated elements

**Error Handling:**
- Validate grid bounds before conversion
- Check for malformed edge definitions
- Provide fallback positions for invalid inputs
- Log coordinate transformation steps for debugging