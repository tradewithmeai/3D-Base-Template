# SIM Wall Alignment - Detailed Placement Analysis

## Coordinate System Overview

**Grid Space (Cell Coordinates):**
- Integer grid positions (x, y) represent cell indices
- Cell (x, y) occupies the square from (x, y) to (x+1, y+1) in continuous space
- Edges are placed on grid lines between cells

**World Space (Meters):**
- Continuous 3D coordinates in meters
- Conversion: worldCoord = cellCoord × cellMeters
- Three.js coordinate system: +X right, +Y up, +Z toward viewer

## 10×10 Room at Origin - Reference Layout

**Tiles:** 100 floor tiles covering (0,0) to (9,9)
**Horizontal Edges:** 20 edges at y=0 and y=10, x=[0..9] for each
**Vertical Edges:** 20 edges at x=0 and x=10, y=[0..9] for each
**Units:** cellMeters=1, wallThickness=0.2, wallHeight=3.0

**World Space Extents:**
- Floor covers: X=[0.0, 10.0], Y=[0.0, 0.1], Z=[0.0, 10.0]
- Interior space: X=[0.0, 10.0], Y=[0.1, 3.0], Z=[0.0, 10.0] (ideally)

## Horizontal Edge Placement - Top Wall (y=10)

### Edge Definition
- **Grid Coordinates:** x=[0..9], y=10
- **Edge Count:** 10 edges (one per cell width)
- **Expected Behavior:** Form continuous top boundary wall from X=0.0 to X=10.0 at Z=10.0

### Pseudocode for H-Edge Placement

```javascript
function placeHorizontalEdge(edge, cellMeters, wallHeight, wallThickness) {
  // edge = { x: number, y: number, dir: 'H' }

  // Step 1: Detect interior side
  const interiorBelow = hasTile(edge.x, edge.y - 1) && !hasTile(edge.x, edge.y);
  const interiorAbove = hasTile(edge.x, edge.y) && !hasTile(edge.x, edge.y - 1);

  // Step 2: Determine outward direction
  let outwardSignZ = 0;
  if (interiorBelow && !interiorAbove) {
    outwardSignZ = +1;  // Interior below, push wall up (positive Z)
  } else if (interiorAbove && !interiorBelow) {
    outwardSignZ = -1;  // Interior above, push wall down (negative Z)
  }
  // else: partition wall, stays centered

  // Step 3: Calculate cell-space center
  const cellCenterX = edge.x + 0.5;
  const cellCenterZ = edge.y + (outwardSignZ * wallThickness / (2 * cellMeters));

  // Step 4: Convert to world space
  const worldX = cellCenterX * cellMeters;
  const worldY = wallHeight / 2;
  const worldZ = cellCenterZ * cellMeters;

  // Step 5: Create geometry (centered at origin)
  const geometry = BoxGeometry(cellMeters, wallHeight, wallThickness);
  // Box extends ±cellMeters/2 in X, ±wallHeight/2 in Y, ±wallThickness/2 in Z

  // Step 6: Position mesh
  mesh.position.set(worldX, worldY, worldZ);

  return {
    worldCenter: { x: worldX, y: worldY, z: worldZ },
    worldExtents: {
      minX: worldX - cellMeters/2,
      maxX: worldX + cellMeters/2,
      minY: worldY - wallHeight/2,
      maxY: worldY + wallHeight/2,
      minZ: worldZ - wallThickness/2,
      maxZ: worldZ + wallThickness/2
    }
  };
}
```

### Worked Example: Top Horizontal Edge at (0, 10)

**Given:**
- edge.x = 0, edge.y = 10
- cellMeters = 1.0
- wallThickness = 0.2
- wallHeight = 3.0

**Step 1: Interior Detection**
```javascript
interiorBelow = hasTile(0, 9) && !hasTile(0, 10)
              = TRUE && TRUE
              = TRUE

interiorAbove = hasTile(0, 10) && !hasTile(0, 9)
              = FALSE && TRUE
              = FALSE
```

**Step 2: Outward Direction**
```javascript
outwardSignZ = +1  // Interior is below (at y=9), push wall outward (toward +Z)
```

**Step 3: Cell-Space Center**
```javascript
cellCenterX = 0 + 0.5 = 0.5
cellCenterZ = 10 + (1 * 0.2 / (2 * 1.0))
            = 10 + (0.2 / 2)
            = 10 + 0.1
            = 10.1
```

**Step 4: World Space Position**
```javascript
worldX = 0.5 * 1.0 = 0.5
worldY = 3.0 / 2 = 1.5
worldZ = 10.1 * 1.0 = 10.1
```

**Step 5: Box Extents**
```javascript
// BoxGeometry(1.0, 3.0, 0.2) centered at (0.5, 1.5, 10.1)

minX = 0.5 - 0.5 = 0.0
maxX = 0.5 + 0.5 = 1.0
minY = 1.5 - 1.5 = 0.0
maxY = 1.5 + 1.5 = 3.0
minZ = 10.1 - 0.1 = 10.0  ← Inner face
maxZ = 10.1 + 0.1 = 10.2  ← Outer face
```

**Result:**
- Wall center: (0.5, 1.5, 10.1)
- Inner face at: Z = 10.0 ✓
- Outer face at: Z = 10.2
- Spans horizontally: X = [0.0, 1.0]

### Complete Top Wall Series (y=10, all x)

| Edge (x,y) | Interior | Sign | cellCenterX | cellCenterZ | worldZ | minZ | maxZ |
|------------|----------|------|-------------|-------------|--------|------|------|
| (0,10) | below | +1 | 0.5 | 10.1 | 10.1 | 10.0 | 10.2 |
| (1,10) | below | +1 | 1.5 | 10.1 | 10.1 | 10.0 | 10.2 |
| (2,10) | below | +1 | 2.5 | 10.1 | 10.1 | 10.0 | 10.2 |
| (3,10) | below | +1 | 3.5 | 10.1 | 10.1 | 10.0 | 10.2 |
| (4,10) | below | +1 | 4.5 | 10.1 | 10.1 | 10.0 | 10.2 |
| (5,10) | below | +1 | 5.5 | 10.1 | 10.1 | 10.0 | 10.2 |
| (6,10) | below | +1 | 6.5 | 10.1 | 10.1 | 10.0 | 10.2 |
| (7,10) | below | +1 | 7.5 | 10.1 | 10.1 | 10.0 | 10.2 |
| (8,10) | below | +1 | 8.5 | 10.1 | 10.1 | 10.0 | 10.2 |
| (9,10) | below | +1 | 9.5 | 10.1 | 10.1 | 10.0 | 10.2 |

**Expected Continuous Wall:**
- Inner face: Z = 10.0 (aligned with room boundary)
- Outer face: Z = 10.2
- Horizontal span: X = [0.0, 10.0]

## Floor Strip Alignment

### Floor Tiles at y=9 (Top Row)

**Floor Strip Creation:**
```javascript
// For y=9 row, x=[0..9] forms one continuous strip
stripLength = 10
cellCenterX = 0 + 10/2 = 5.0
cellCenterY = 9 + 0.5 = 9.5

worldX = 5.0 * 1.0 = 5.0
worldY = 0.1 / 2 = 0.05
worldZ = 9.5 * 1.0 = 9.5

// BoxGeometry(10.0, 0.1, 1.0) centered at (5.0, 0.05, 9.5)
minX = 0.0
maxX = 10.0
minY = 0.0
maxY = 0.1
minZ = 9.0
maxZ = 10.0  ← Floor top edge aligns with grid line y=10
```

**Floor-Wall Interface:**
- Floor top surface: Z = 10.0, Y = 0.1
- Wall inner face: Z = 10.0, Y = [0.0, 3.0]
- **Gap:** Y-axis gap from 0.1 to 0.0 at wall base (acceptable, wall extends to ground)
- **Alignment:** Perfect Z-axis alignment (both at Z=10.0)

## Vertical Edge Placement - Right Wall (x=10)

### Worked Example: Right Vertical Edge at (10, 0)

**Given:**
- edge.x = 10, edge.y = 0
- cellMeters = 1.0
- wallThickness = 0.2
- wallHeight = 3.0

**Step 1: Interior Detection**
```javascript
interiorLeft = hasTile(9, 0) && !hasTile(10, 0)
             = TRUE && TRUE
             = TRUE

interiorRight = hasTile(10, 0) && !hasTile(9, 0)
              = FALSE && TRUE
              = FALSE
```

**Step 2: Outward Direction**
```javascript
outwardSignX = +1  // Interior is left (at x=9), push wall outward (toward +X)
```

**Step 3: Cell-Space Center**
```javascript
cellCenterX = 10 + (1 * 0.2 / (2 * 1.0))
            = 10 + 0.1
            = 10.1
cellCenterZ = 0 + 0.5 = 0.5
```

**Step 4: World Space Position**
```javascript
worldX = 10.1 * 1.0 = 10.1
worldY = 3.0 / 2 = 1.5
worldZ = 0.5 * 1.0 = 0.5
```

**Step 5: Box Extents**
```javascript
// BoxGeometry(0.2, 3.0, 1.0) centered at (10.1, 1.5, 0.5)

minX = 10.1 - 0.1 = 10.0  ← Inner face
maxX = 10.1 + 0.1 = 10.2  ← Outer face
minY = 1.5 - 1.5 = 0.0
maxY = 1.5 + 1.5 = 3.0
minZ = 0.5 - 0.5 = 0.0
maxZ = 0.5 + 0.5 = 1.0
```

**Result:**
- Wall center: (10.1, 1.5, 0.5)
- Inner face at: X = 10.0 ✓
- Outer face at: X = 10.2
- Spans vertically: Z = [0.0, 1.0]

## Centered Mode Comparison

### Top Edge at (0, 10) in Centered Mode

**Centered mode ignores interior detection:**
```javascript
cellCenterX = 0 + 0.5 = 0.5
cellCenterZ = 10  // No offset applied

worldX = 0.5
worldY = 1.5
worldZ = 10.0

// BoxGeometry(1.0, 3.0, 0.2) centered at (0.5, 1.5, 10.0)

minZ = 10.0 - 0.1 = 9.9  ← Wall extends into room
maxZ = 10.0 + 0.1 = 10.1
```

**Comparison:**
- **Flush mode:** Inner face at Z=10.0, outer face at Z=10.2
- **Centered mode:** Wall straddles grid line (Z=9.9 to Z=10.1)
- **Issue with centered:** Wall extends 0.1m into interior space

## Discrepancy Analysis

### Expected vs Actual (Flush Mode)

**Expected for top edge:**
- Inner face should align with room boundary at Z=10.0
- Calculated position should place wall outside the floor area

**Actual calculation (as shown):**
- centreZ = 10.1 → minZ = 10.0, maxZ = 10.2 ✓
- Math appears correct for flush mode

**Potential Issues:**
1. **If actual rendering shows misalignment:**
   - Check if WALL_ALIGN_MODE is correctly set to 'flush'
   - Verify hasTile() function returns correct values for boundary coords
   - Inspect actual mesh positions in Three.js scene

2. **If floor appears misaligned:**
   - Floor strip at y=9 should extend from Z=9.0 to Z=10.0
   - Check floor strip extents in trace logs
   - Verify stripLength calculation and cellCenterY positioning

3. **If there's a gap:**
   - Visual gap might be from Y-axis (floor height vs wall base)
   - Check if floorThickness and wall Y-position are correct
   - Verify wall extends all the way to Y=0.0

## Verification Checklist

- [ ] Confirm WALL_ALIGN_MODE is 'flush' (check console log)
- [ ] Verify hasTile(x, 10) returns false for all x
- [ ] Check trace logs show centreZ = 10.1 for all top edges
- [ ] Confirm floor strips at y=9 extend to Z=10.0
- [ ] Inspect actual mesh bounds in Three.js inspector
- [ ] Test with ?align=centered to compare behaviors
- [ ] Measure gap distance if visible in rendering
- [ ] Check if issue appears on all boundaries or just top edge
