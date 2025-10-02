# 3D-Base-Template Simulator Rules

## Global Simulator Rules

The 3D-Base-Template simulator enforces these rules at the engine level, not in the loader. The loader's responsibility is purely to parse scene.3d.v1 files and pass data to the engine builders.

### Coordinate System & Axes
- **File Format**: XY coordinates in scene.3d.v1.json files
- **World Mapping**: File XY → World XZ (Three.js Y-up convention)
- **Origin**: South-west corner at (0,0,0) in world space
- **Required**: `meta.axes` must be "Z_up_XY_ground" (enforced by loader validation)

### Units & Scaling
- **Base Unit**: Metres everywhere in the simulator
- **Cell Scaling**: `units.cellMeters` from scene file (default: 1.0)
- **World Scaling**: All coordinates multiplied by `cellMeters` value

### World Bounds
- **Source**: Derived from `meta.simLimits.maxTilesX` and `meta.simLimits.maxTilesY` (required fields)
- **World Extents**: (0..W×cellMeters, 0..H×cellMeters) in world space
- **Bounds Enforcement**: Camera/player movement clamped within these bounds

### Ground Plane & Grid
- **Ghost Ground**: Translucent plane at Y=0 spanning W×H metres
- **Grid Lines**: Rendered at Y=+0.001 to avoid z-fighting
- **Grid Spacing**: Aligned on cell boundaries scaled by `cellMeters`
- **Grouping**: All ghost visuals under `ghostGrid` group

### Floor Geometry
- **Rendering**: Thin boxes positioned above Y=0
- **Thickness**: `units.floorThicknessMeters` (default: 0.05m)
- **Positioning**: Sit above Y=0 by half thickness
- **Seam Prevention**: Small EPS overlap (0.001m) between adjacent floor segments
- **Material**: Brown color (#8B4513), receives shadows

### Wall Geometry
- **Height**: `units.wallHeightMeters` (default: 3.0m)
- **Thickness**: `units.wallThicknessMeters` (default: 0.20m)
- **Positioning**: Centred on grid edges, extending from Y=0 to wallHeight
- **Gap Prevention**: Small EPS extension (0.001m) to meet floors without gaps
- **Material**: Gray color (#808080), casts and receives shadows

### Scene Organization
- **Imported Content**: All scene meshes under `sceneV1` group
- **Ghost Visuals**: All grid/ground elements under `ghostGrid` group
- **Separation**: No mixing of imported content with demo/legacy content
- **Clearing**: Complete disposal of previous scene content before import

### Movement & Collision
- **Movement Bounds**: Free movement within world bounds (0..W×cellMeters, 0..H×cellMeters)
- **Wall Collision**: Disabled (god mode lite) - walls are non-blocking
- **Future**: Wall collision detection and god mode toggle to be implemented later

### Validation & Logging
- **Schema Validation**: Strict validation of scene.3d.v1 format
- **Missing Fields**: Detailed error reporting for invalid/incomplete scenes
- **Parity Checking**: Validate expected vs actual tile/edge counts
- **Bounds Logging**: Report world bounds and scene statistics after load

## Loader Responsibilities (Parse Only)

### Validation Only
- Validate `meta.schema === "scene.3d.v1"`
- Check required fields: `units.cellMeters`, `meta.axes`, `meta.simLimits`
- Verify axes format matches "*_XY_ground" pattern

### Data Extraction
- Read `units.cellMeters`, `meta.simLimits`, `originOffset`
- Extract `tiles.floor`, `edges.horizontal`, `edges.vertical`
- Apply `originOffset` when building world transforms

### No Policy Enforcement
- Do NOT normalise or mutate geometry data
- Do NOT enforce global simulator rules
- Do NOT provide fallback data or default values
- Hand parsed data to engine builders without modification

## Error Handling

### Invalid Scene Files
- **Missing File**: Show UI banner with import options
- **Invalid Schema**: Display structured error with missing fields
- **Failed Validation**: Stop processing, no fallback to legacy formats
- **Console Output**: Single structured [SCENE:v1:ERROR] block with diagnostics

### Required Fields for Valid Scene
- `meta.schema`: "scene.3d.v1"
- `meta.simLimits.maxTilesX`: Number
- `meta.simLimits.maxTilesY`: Number
- `units.cellMeters`: Number
- `meta.axes`: String ending in "_XY_ground"
- `tiles.floor`: Array of [x,y] coordinates
- `edges.horizontal`: Array of [x,y] coordinates
- `edges.vertical`: Array of [x,y] coordinates
- `originOffset`: Object with x,y numeric properties

## Implementation Notes

### EPS Tolerances
- **Floor Overlap**: 0.001m overlap between adjacent floor strips
- **Wall Extension**: 0.001m extension to close gaps with floors
- **Grid Offset**: Grid lines at Y=+0.001 to prevent z-fighting with ground plane

### Performance Considerations
- **Floor Strips**: Compose contiguous tiles into single geometry instances
- **Material Sharing**: Single material instances for floors and walls respectively
- **Shadow Mapping**: Enable appropriate shadow casting/receiving for realism

### Future Extensions
- **Wall Collision**: Raycasting-based collision detection system
- **God Mode**: Toggle between free movement and collision-constrained movement
- **Material Customization**: Support for textured materials via scene file
- **Dynamic Lighting**: Scene-controlled lighting configurations