# SIM CODE INDEX - Key Identifier Reference

## Primary Loader Implementation

### src/runtime/loadScene3dV1.browser.js

**Function Definitions:**
- `12` - Error check: THREE.js must be loaded before loadScene3dV1
- `37` - v1ToLayout: Apply originOffset to tiles in cell space
- `107` - buildFloorsV1: Floor geometry builder with cellMeters scaling
- `195` - buildWallsV1: Wall geometry builder with interior-aware alignment
- `362` - computeBounds: Calculate world bounds from originOffset tiles
- `443` - loadScene3dV1: Main async loader function

**Constants:**
- `24` - SEAM_EPS = 0.001 (small overlap to prevent seams)
- `28` - WALL_ALIGN_MODE (from URL param ?align=)
- `31` - TRACE_GEOM (from URL param ?trace=1)

**originOffset Application:**
- `37-41` - v1ToLayout: Apply offset to tiles before bounds calculation
- `69-73` - v1ToEdges: Use offset tiles for normalization
- `81-82` - Horizontal edges: Apply originOffset
- `92-93` - Vertical edges: Apply originOffset
- `203` - buildWallsV1: Reconstruct offset tiles for interior detection
- `365-366` - computeBounds: Apply offset to tiles only

**cellMeters Scaling:**
- `38` - Destructure cellMeters from units
- `151` - Floor strip width: stripLength * cellMeters + SEAM_EPS
- `153` - Floor strip depth: cellMeters + SEAM_EPS
- `170` - Floor worldX: cellCenterX * cellMeters
- `172` - Floor worldZ: cellCenterY * cellMeters
- `178-181` - Floor trace logging: Convert cell to world coords
- `218` - unitAwareEPS: SEAM_EPS * cellMeters
- `243` - H-wall geometry width: cellMeters (exact, no EPS)
- `272` - H-wall flush offset: wallThickness / (2 * cellMeters)
- `280` - H-wall worldX: centreX * cellMeters
- `282` - H-wall worldZ: centreZ * cellMeters
- `287` - H-wall trace halfLen: cellMeters / 2
- `301` - V-wall geometry depth: cellMeters (exact, no EPS)
- `322` - V-wall flush offset: wallThickness / (2 * cellMeters)
- `331` - V-wall worldX: centreX * cellMeters
- `333` - V-wall worldZ: centreZ * cellMeters
- `338` - V-wall trace halfLen: cellMeters / 2
- `363` - Bounds calculation: cellMeters from units
- `371-372` - Bounds fallback: Use cellMeters for default size
- `383-390` - World bounds: min/max coords * cellMeters

**wallThicknessMeters:**
- `195` - buildWallsV1 parameter
- `243` - H-wall BoxGeometry depth dimension
- `272` - H-wall flush offset calculation
- `288` - H-wall trace minZ/maxZ calculation
- `301` - V-wall BoxGeometry width dimension
- `322` - V-wall flush offset calculation
- `336` - V-wall trace minX/maxX calculation

**wallHeightMeters:**
- `195` - buildWallsV1 parameter
- `243` - Wall BoxGeometry height dimension
- `282` - H-wall worldY: wallHeight / 2
- `301` - V-wall BoxGeometry height dimension
- `332` - V-wall worldY: wallHeight / 2
- `363` - computeBounds: Used for Y-axis max
- `371` - Bounds fallback Y max
- `389` - World bounds max Y

**Edge Arrays:**
- `69` - v1ToEdges: destructure edges.horizontal and edges.vertical
- `80-85` - Process horizontal edges with originOffset
- `91-97` - Process vertical edges with originOffset
- `225-344` - buildWallsV1: Loop through edges array
- `232-286` - Process H edges (dir === 'H')
- `289-337` - Process V edges (dir === 'V')
- `413-414` - Parity validation: actualEdgesH and actualEdgesV counts
- `416-422` - Parity check: Compare actual vs expected edge counts

**Trace Logging:**
- `278-286` - H-wall trace: grid coords, interior side, world position, extents
- `328-337` - V-wall trace: grid coords, interior side, world position, extents
- `176-183` - Floor trace: strip details, cell center, world coords, extents

## TypeScript Reference Implementation

### src/runtime/loadScene3dV1.ts

**Type Definitions:**
- `22-56` - Scene3dV1 interface definition
- `29-33` - Parity metadata structure
- `34-38` - simLimits structure
- `40-51` - Units structure with cellMeters, wallHeightMeters, wallThicknessMeters
- `52-55` - originOffset structure

**Function Implementations:**
- `62` - v1ToLayout: Similar to browser version
- `94` - v1ToEdges: Similar to browser version
- `133` - buildFloorsV1: Floor builder with cellMeters scaling
- `212` - buildWallsV1: Simplified centered-mode walls
- `267` - computeBounds: Bounds calculation from offset tiles
- `349` - loadScene3dV1: Main loader (TypeScript types)

**Trace Flag:**
- `23-27` - TRACE_GEOM flag from URL param ?trace=1

**Trace Logging:**
- `209-215` - Floor strip trace logging
- `247-253` - H-wall trace logging (centered mode only)
- `267-272` - V-wall trace logging (centered mode only)

## Main Application Integration

### index.html

**Loader Script:**
- `290` - Import loadScene3dV1.browser.js

**Scene Management:**
- `357` - clearSceneForImport: Remove previous scene geometry
- `785` - clearSceneForImport call before import
- `794` - loadScene3dV1 call with sceneData
- `862-865` - Clear and load sequence (repeated)
- `951-957` - Clear and load sequence (third instance)

**Environment Setup:**
- `462` - setupSimEnvironment: Configure bounds with cellMeters
- `469` - Max bounds vector with cellMeters scaling
- `471-473` - Bounds center with cellMeters
- `479-480` - Grid dimensions with cellMeters
- `491-493` - Camera position with cellMeters
- `507-509` - Grid line X positions with cellMeters
- `514-516` - Grid line Z positions with cellMeters
- `788` - setupSimEnvironment call with cellMeters from scene

**Visual Debug Overlay:**
- `582-583` - Extract originOffset and cellMeters from sceneData
- `593-594` - Floor marker worldX/worldZ with originOffset and cellMeters
- `618-619` - H-edge marker worldX/worldZ with originOffset
- `622-623` - H-edge line endpoints with cellMeters halfLen
- `633-634` - V-edge marker worldX/worldZ with originOffset
- `637-638` - V-edge line endpoints with cellMeters halfLen

**Validation:**
- `703` - Check required field: units.cellMeters
- `708` - Check required field: originOffset
- `2962-2966` - Fast-fail validation: cellMeters must be > 0
- `3001-3008` - Apply originOffset translation for imported geometry
- `3261-3263` - Default units: cellMeters=1.0, wallHeightMeters=3.0, wallThicknessMeters=0.2

## Supporting Modules

### src/runtime/ghostGrid.ts
- `15` - buildGhostGrid: cellMeters parameter
- `18` - Function signature with cellMeters
- `32` - Grid X line worldX: x * cellMeters
- `34` - Grid X line endpoint: gridH * cellMeters
- `39` - Grid Z line worldZ: y * cellMeters
- `41` - Grid Z line endpoint: gridW * cellMeters

### src/runtime/walls.ts
- `14` - buildWalls: Edge-based wall builder function
- `33-34` - H-edge BoxGeometry (1, 3, 0.1)
- `38-39` - V-edge BoxGeometry (0.1, 3, 1)

### src/runtime/loadFloorplan.ts
- `10` - Import buildWalls from walls.js
- `23` - Call buildWalls with edges array

### src/runtime/importScene3D.js
- `58` - Scale calculation: 1 / (units.cellMeters || 1.0)
- `150` - wallHeightUnits: wallHeightMeters * scale
- `151` - wallThicknessUnits: wallThicknessMeters * scale
- `225-226` - Second instance of height/thickness scaling

## Test Files

### test-v1-loader.html
- `20` - Import loadScene3dV1.browser.js
- `62` - Call loadScene3dV1 with scene path

### test-import-enhancements.html
- `71-72` - Test case: Invalid cellMeters validation
- `101-103` - Valid test units: cellMeters=1, wallHeightMeters=3, wallThicknessMeters=0.2
- `113` - originOffset in test JSON
- `129` - Test 2 units: cellMeters=1
- `133` - Test 2 originOffset
- `148-170` - Test 3: Invalid cellMeters (≤0) fast-fail validation
- `183-185` - Test 4 units with all metrics
- `200` - Test 4 originOffset

## Summary Statistics

**Total Occurrences by Identifier:**
- `cellMeters`: 50+ occurrences across all files
- `originOffset`: 20+ occurrences (primarily in loaders)
- `wallThicknessMeters`: 15+ occurrences
- `wallHeightMeters`: 15+ occurrences
- `buildWalls` / `buildWallsV1`: 10 occurrences
- `edgesH` / `edgesV`: 8 occurrences (parity checking)
- `SEAM_EPS`: 5 occurrences (constant definition and usage)
- `loadScene3dV1`: 8 occurrences (calls and definitions)
- `clearSceneForImport`: 5 occurrences

**Critical Code Paths:**
1. **Load Flow:** loadScene3dV1 → v1ToLayout → v1ToEdges → buildFloorsV1 + buildWallsV1
2. **Coordinate Conversion:** originOffset (cell space) → normalization → cellMeters (world space)
3. **Wall Placement:** edge coords → interior detection → flush offset → world position
4. **Bounds Calculation:** offset tiles → min/max → cellMeters scaling → Three.js bounds
5. **Scene Integration:** clearSceneForImport → setupSimEnvironment → loadScene3dV1 → add to scene
