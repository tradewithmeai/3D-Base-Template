# SIM AUDIT - Geometry Trace System

## Snapshot Information
- **Branch:** v1-sim-audit-prep
- **Base Commit:** 439d540cf1660f40ae5fdf7560d207f07c9ccb71
- **Tag:** v1-sim-audit-<to be generated>
- **Date:** 2025-10-07

## File Map

### Runtime Build Path

**V1 Loader (Main Entry Point):**
- `src/runtime/loadScene3dV1.browser.js` - Browser-compatible IIFE loader (active in production)
- `src/runtime/loadScene3dV1.ts` - TypeScript version (reference implementation)

**Geometry Builders:**
- **Floors:** `buildFloorsV1()` in `loadScene3dV1.browser.js:107-189`
  - Processes layout cells in row-major order
  - Creates horizontal strips of contiguous floor tiles
  - Applies strip-based optimization

- **Walls:** `buildWallsV1()` in `loadScene3dV1.browser.js:184-346`
  - Processes edges array (H and V)
  - Supports two alignment modes: 'flush' (interior-aware) and 'centered'
  - Uses tile lookup for interior detection

**Ghost Grid:**
- `buildGhostGrid()` in `src/runtime/ghostGrid.ts`
- Visual debugging grid overlay

**Scene Clearing:**
- `clearSceneForImport()` in `index.html` - Removes previous scene geometry before import

**Camera Framing:**
- Camera positioning based on scene bounds computed in `computeBounds()` at `loadScene3dV1.browser.js:348-380`

### Constants & Configuration

**Unit Scaling:**
- `cellMeters` - Grid cell size in meters (typically 1.0)
- `wallHeightMeters` - Wall height (typically 3.0)
- `wallThicknessMeters` - Wall thickness (typically 0.2)
- `floorThicknessMeters` - Floor thickness (typically 0.1)

**Seam Prevention:**
- `SEAM_EPS = 0.001` - Small overlap to prevent visual gaps (defined at line 24)
- Currently NOT applied to walls in current implementation
- Note: EPS was removed from wall geometry to eliminate potential overlap issues

**Grid Offset:**
- `GRID_OFFSET_Y = 0.001` - Prevents z-fighting between grid and floors (defined at line 25)

## Wall Placement Formulas

### Horizontal Edges (H)

**Geometry:** `BoxGeometry(cellMeters, wallHeight, wallThickness)`
- Width along X-axis = cellMeters (exact)
- Height along Y-axis = wallHeight
- Depth along Z-axis = wallThickness

**Centered Mode (`?align=centered` or default in TypeScript version):**
```
cellCenterX = edge.x + 0.5
cellCenterY = edge.y
worldX = cellCenterX * cellMeters
worldY = wallHeight / 2
worldZ = cellCenterY * cellMeters
```

**Flush Mode (Interior-Aware, default in .browser.js):**
```
1. Detect interior side:
   - interiorBelow = hasTile(edge.x, edge.y - 1) && !hasTile(edge.x, edge.y)
   - interiorAbove = hasTile(edge.x, edge.y) && !hasTile(edge.x, edge.y - 1)

2. Set outward sign:
   - If interiorBelow: outwardSignZ = +1 (push wall toward +Z)
   - If interiorAbove: outwardSignZ = -1 (push wall toward -Z)
   - If neither/both: outwardSignZ = 0 (centered, partition wall)

3. Calculate position:
   cellCenterX = edge.x + 0.5
   cellCenterZ = edge.y + (outwardSignZ * wallThickness / (2 * cellMeters))
   worldX = cellCenterX * cellMeters
   worldY = wallHeight / 2
   worldZ = cellCenterZ * cellMeters
```

**Box Extents (in world space):**
```
minZ = worldZ - wallThickness/2
maxZ = worldZ + wallThickness/2
```

### Vertical Edges (V)

**Geometry:** `BoxGeometry(wallThickness, wallHeight, cellMeters)`
- Width along X-axis = wallThickness
- Height along Y-axis = wallHeight
- Depth along Z-axis = cellMeters (exact)

**Centered Mode:**
```
cellCenterX = edge.x
cellCenterY = edge.y + 0.5
worldX = cellCenterX * cellMeters
worldY = wallHeight / 2
worldZ = cellCenterY * cellMeters
```

**Flush Mode (Interior-Aware):**
```
1. Detect interior side:
   - interiorLeft = hasTile(edge.x - 1, edge.y) && !hasTile(edge.x, edge.y)
   - interiorRight = hasTile(edge.x, edge.y) && !hasTile(edge.x - 1, edge.y)

2. Set outward sign:
   - If interiorLeft: outwardSignX = +1 (push wall toward +X)
   - If interiorRight: outwardSignX = -1 (push wall toward -X)
   - If neither/both: outwardSignX = 0 (centered, partition wall)

3. Calculate position:
   cellCenterX = edge.x + (outwardSignX * wallThickness / (2 * cellMeters))
   cellCenterZ = edge.y + 0.5
   worldX = cellCenterX * cellMeters
   worldY = wallHeight / 2
   worldZ = cellCenterZ * cellMeters
```

**Box Extents (in world space):**
```
minX = worldX - wallThickness/2
maxX = worldX + wallThickness/2
```

## originOffset Application

**Order of Operations:**
1. Editor exports scene with grid coordinates (x, y) from its internal coordinate system
2. `originOffset` is stored in JSON as separate field: `{ x: offsetX, y: offsetY }`
3. V1 loader applies offset **in cell space** before normalization:
   ```javascript
   offsetTiles = tiles.floor.map(([x, y]) => [x + originOffset.x, y + originOffset.y])
   offsetEdgesH = edges.horizontal.map(([x, y]) => [x + originOffset.x, y + originOffset.y])
   offsetEdgesV = edges.vertical.map(([x, y]) => [x + originOffset.x, y + originOffset.y])
   ```
4. Normalization finds min/max and shifts to start at (0,0) in layout space
5. `cellMeters` scaling applied during geometry creation (world space = cell space × cellMeters)

**Critical Note:** originOffset is applied **before** normalization, so the final world coordinates are independent of originOffset value. It's a pre-processing step that affects intermediate calculations only.

## SEAM_EPS Application

**Current Status:** SEAM_EPS is **NOT** applied to wall geometry in the current implementation.

**Historical Context:**
- Previously used to extend geometry slightly to prevent gaps
- Removed because it could cause overlapping geometry issues
- Floor strips still use exact cell-based dimensions without EPS overlap

**Where EPS is NOT Applied:**
- Wall BoxGeometry dimensions (exact cellMeters length)
- Wall positioning (no EPS offset)
- Floor BoxGeometry dimensions (exact cell-based dimensions)

**Where EPS IS Applied:**
- `GRID_OFFSET_Y` for ghost grid (prevents z-fighting with floors)

## Conditional Paths

### Wall Alignment Mode
**Toggle:** URL parameter `?align=centered` or `?align=flush`
- **Default (.browser.js):** `flush` mode (interior-aware alignment)
- **Default (.ts):** `centered` mode (simple center-of-edge positioning)

**Flush Mode:**
- Walls are pushed outward from interior space
- Inner face of wall aligns flush with grid line
- Requires tile lookup to determine interior side
- Partition walls (no clear interior) are centered

**Centered Mode:**
- Wall center aligns with grid line
- No interior detection required
- Simpler calculation
- May result in walls extending into room interior

### Current Default
- Browser implementation (.browser.js): **flush** mode
- TypeScript implementation (.ts): **centered** mode (simpler reference)

## Known Toggles

### URL Parameters
- `?trace=1` - Enable geometry trace logging (newly added)
- `?align=centered` - Use centered wall alignment mode
- `?align=flush` - Use flush (interior-aware) wall alignment mode (default)

### Keyboard Controls (when available)
- `P` - Toggle parity display
- `C` - Cycle camera views
- `G` - Toggle ghost grid visibility

## Suspected Causes of Top-Edge Misalignment

### 1. Thickness-Centered Placement
**Issue:** In flush mode, walls are offset by `wallThickness / (2 * cellMeters)` from the grid line.
- For a 10×10 room, top edge at y=10 should have interior at y=9
- Wall should be pushed toward +Z (outward from interior)
- **Expected inner face:** Z = 10.0
- **With offset:** centreZ = 10 + (1 * 0.2 / 2) = 10.1, so minZ = 10.0, maxZ = 10.2
- **Question:** Is the interior detection correct for boundary edges?

### 2. Interior Detection Logic for Boundary Edges
**Issue:** For top edge at y=10:
- `interiorBelow = hasTile(x, 9) && !hasTile(x, 10)`
- Since there are no tiles at y=10, this should be TRUE
- Should push wall outward with outwardSignZ = +1
- **Verification needed:** Does `hasTile(x, 10)` return false for boundary coordinates?

### 3. Box Geometry Origin
**Issue:** Three.js BoxGeometry is centered at origin
- Position vector places the **center** of the box
- Half-extents are geometry dimensions / 2
- **Verify:** Are we accounting for the center-based positioning correctly?

### 4. Floor Box Extents
**Issue:** Floor strips may extend to different boundaries than expected
- Floor at y=9 spans from Z=9.0 to Z=10.0 (assuming 1m cells)
- Floor thickness extends from Y=-0.05 to Y=+0.05
- **Verify:** Are floor strip extents calculated correctly?

### 5. Inconsistent Unit Scaling
**Issue:** Mix of cell space and world space in calculations
- Some offsets applied in cell space (before * cellMeters)
- Some offsets applied in world space (after * cellMeters)
- **Verify:** Is the offset `wallThickness / (2 * cellMeters)` dimensionally correct?

### 6. originOffset Application Order
**Issue:** originOffset is applied before normalization
- Should not affect final world coordinates
- Could affect intermediate boundary detection
- **Verify:** Does the normalization correctly preserve edge relationships?

### 7. Rounding or Floating-Point Precision
**Issue:** JavaScript number precision could cause slight misalignments
- Especially with division operations
- Could accumulate over multiple calculations
- **Check trace logs** for unexpected decimal places

## Recommendations for Investigation

1. **Run trace on 10×10 scene** - Capture all top-edge (y=10) wall calculations
2. **Compare with floor extents** - Verify floor strips end where walls begin
3. **Check interior detection** - Confirm hasTile() returns false for y=10
4. **Verify dimensional analysis** - Ensure all offsets are in correct units
5. **Test with ?align=centered** - Does centered mode show the same misalignment?
6. **Measure actual geometry** - Use Three.js inspector to check final mesh bounds
7. **Compare TypeScript vs Browser** - Are both implementations producing identical results?
