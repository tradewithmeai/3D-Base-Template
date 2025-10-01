/**
 * Browser-compatible scene.3d.v1 loader (IIFE)
 * Works with global window.THREE from CDN
 * Includes the complete v1 loading logic without ES modules
 */

(function() {
    'use strict';

    // Ensure THREE.js is available
    if (typeof window.THREE === 'undefined') {
        throw new Error('THREE.js must be loaded before loadScene3dV1');
    }

    const THREE = window.THREE;

    // Flag for debug visualization
    const SCENE_DEBUG = false;

    /**
     * Build a ghost grid overlay showing the editor grid
     */
    function buildGhostGrid(gridW, gridH, cellMeters) {
        const gridGroup = new THREE.Group();
        gridGroup.name = "ghostGrid";

        const material = new THREE.LineBasicMaterial({
            color: 0x404040,
            transparent: true,
            opacity: 0.3
        });

        const points = [];

        // Vertical lines (along Z-axis)
        for (let x = 0; x <= gridW; x++) {
            const worldX = x * cellMeters;
            points.push(new THREE.Vector3(worldX, 0.001, 0));
            points.push(new THREE.Vector3(worldX, 0.001, gridH * cellMeters));
        }

        // Horizontal lines (along X-axis)
        for (let y = 0; y <= gridH; y++) {
            const worldZ = y * cellMeters;
            points.push(new THREE.Vector3(0, 0.001, worldZ));
            points.push(new THREE.Vector3(gridW * cellMeters, 0.001, worldZ));
        }

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const lines = new THREE.LineSegments(geometry, material);
        gridGroup.add(lines);

        return gridGroup;
    }

    /**
     * Convert v1 scene data to internal Layout format for existing builders
     */
    function v1ToLayout(scene) {
        const { tiles, originOffset, units } = scene;
        const { cellMeters } = units;

        // Apply originOffset to tiles in cell space, then find bounds
        const offsetTiles = tiles.floor.map(([x, y]) => [x + originOffset.x, y + originOffset.y]);

        if (offsetTiles.length === 0) {
            return { width: 1, height: 1, cells: [] };
        }

        const minX = Math.min(...offsetTiles.map(([x]) => x));
        const maxX = Math.max(...offsetTiles.map(([x]) => x));
        const minY = Math.min(...offsetTiles.map(([, y]) => y));
        const maxY = Math.max(...offsetTiles.map(([, y]) => y));

        const width = maxX - minX + 1;
        const height = maxY - minY + 1;

        // Normalize to start from (0,0) and create Layout cells
        const cells = offsetTiles.map(([x, y]) => ({
            x: x - minX,
            y: y - minY,
            kind: 'floor'
        }));

        return { width, height, cells };
    }

    /**
     * Convert v1 edges to internal Edge format for existing builders
     */
    function v1ToEdges(scene, layout) {
        const { edges, originOffset } = scene;
        const { horizontal, vertical } = edges;

        // Calculate the same normalization offset used in v1ToLayout
        const offsetTiles = scene.tiles.floor.map(([x, y]) => [x + originOffset.x, y + originOffset.y]);
        const minX = offsetTiles.length > 0 ? Math.min(...offsetTiles.map(([x]) => x)) : 0;
        const minY = offsetTiles.length > 0 ? Math.min(...offsetTiles.map(([, y]) => y)) : 0;

        const result = [];

        // Horizontal edges
        horizontal.forEach(([x, y]) => {
            const offsetX = x + originOffset.x;
            const offsetY = y + originOffset.y;
            result.push({
                x: offsetX - minX,
                y: offsetY - minY,
                dir: 'H'
            });
        });

        // Vertical edges
        vertical.forEach(([x, y]) => {
            const offsetX = x + originOffset.x;
            const offsetY = y + originOffset.y;
            result.push({
                x: offsetX - minX,
                y: offsetY - minY,
                dir: 'V'
            });
        });

        return result;
    }

    /**
     * Build floors with proper v1 scaling and positioning
     */
    function buildFloorsV1(layout, cellMeters, floorThickness) {
        const { width, height, cells } = layout;

        // Create lookup map for fast cell access
        const cellMap = new Map();
        cells.forEach(cell => {
            cellMap.set(`${cell.x},${cell.y}`, cell.kind);
        });

        // Helper to get cell kind at position
        function getCellKind(x, y) {
            if (x < 0 || x >= width || y < 0 || y >= height) {
                return 'empty';
            }
            return cellMap.get(`${x},${y}`) || 'empty';
        }

        const floorsGroup = new THREE.Group();
        floorsGroup.name = "floors";

        // Track processed tiles to avoid duplicates
        const processed = new Set();

        // Process each row to find contiguous floor strips
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const key = `${x},${y}`;

                // Skip if already processed or not a floor tile
                if (processed.has(key) || getCellKind(x, y) !== 'floor') {
                    continue;
                }

                // Find the length of contiguous floor tiles in this row
                let stripLength = 0;
                let checkX = x;
                while (checkX < width && getCellKind(checkX, y) === 'floor') {
                    processed.add(`${checkX},${y}`);
                    stripLength++;
                    checkX++;
                }

                // Create floor geometry: thin box with proper thickness
                const geometry = new THREE.BoxGeometry(
                    stripLength * cellMeters,
                    floorThickness,
                    cellMeters
                );
                const material = new THREE.MeshStandardMaterial({
                    color: 0x8B4513, // Brown color
                    roughness: 0.8,
                    metalness: 0.0,
                    transparent: true,
                    opacity: 0.9
                });

                const floor = new THREE.Mesh(geometry, material);

                // Position at strip centre in world coordinates
                // Cell centre: (x + stripLength/2 - 0.5, y + 0.5) in cell space
                const cellCenterX = x + stripLength / 2 - 0.5;
                const cellCenterY = y + 0.5;

                floor.position.set(
                    cellCenterX * cellMeters,  // World X
                    floorThickness / 2,        // World Y (bottom at 0)
                    cellCenterY * cellMeters   // World Z
                );

                floorsGroup.add(floor);
            }
        }

        return floorsGroup;
    }

    /**
     * Build walls with proper v1 scaling and positioning
     */
    function buildWallsV1(edges, cellMeters, wallHeight, wallThickness) {
        const wallsGroup = new THREE.Group();
        wallsGroup.name = "walls";

        // Single material for all walls
        const material = new THREE.MeshStandardMaterial({
            color: 0x808080, // Gray color
            roughness: 0.7,
            metalness: 0.0
        });

        // Process each edge
        edges.forEach(edge => {
            let geometry;
            let position;

            if (edge.dir === 'H') {
                // Horizontal edge: oriented along +X
                // Length = cellMeters, width = wallThickness, height = wallHeight
                geometry = new THREE.BoxGeometry(cellMeters, wallHeight, wallThickness);
                // Centre at (x+0.5, y) in cell space
                const cellCenterX = edge.x + 0.5;
                const cellCenterY = edge.y;
                position = new THREE.Vector3(
                    cellCenterX * cellMeters,
                    wallHeight / 2,
                    cellCenterY * cellMeters
                );
            } else {
                // Vertical edge: oriented along +Z
                // Length = cellMeters, width = wallThickness, height = wallHeight
                geometry = new THREE.BoxGeometry(wallThickness, wallHeight, cellMeters);
                // Centre at (x, y+0.5) in cell space
                const cellCenterX = edge.x;
                const cellCenterY = edge.y + 0.5;
                position = new THREE.Vector3(
                    cellCenterX * cellMeters,
                    wallHeight / 2,
                    cellCenterY * cellMeters
                );
            }

            const wall = new THREE.Mesh(geometry, material);
            wall.position.copy(position);

            wallsGroup.add(wall);
        });

        return wallsGroup;
    }

    /**
     * Compute world bounds from tiles (post-offset)
     * Bounds are based on tile coverage area, not wall positions
     */
    function computeBounds(scene) {
        const { tiles, originOffset, units } = scene;
        const { cellMeters, wallHeightMeters } = units;

        // Apply originOffset to tiles only (bounds based on floor coverage)
        const offsetTiles = tiles.floor.map(([x, y]) => [x + originOffset.x, y + originOffset.y]);

        if (offsetTiles.length === 0) {
            return {
                min: new THREE.Vector3(0, 0, 0),
                max: new THREE.Vector3(cellMeters, wallHeightMeters, cellMeters),
                center: new THREE.Vector3(cellMeters/2, wallHeightMeters/2, cellMeters/2)
            };
        }

        const minX = Math.min(...offsetTiles.map(([x]) => x));
        const maxX = Math.max(...offsetTiles.map(([x]) => x));
        const minY = Math.min(...offsetTiles.map(([, y]) => y));
        const maxY = Math.max(...offsetTiles.map(([, y]) => y));

        // Add +1 cell to include the far edge of the last tile
        const worldMin = new THREE.Vector3(
            minX * cellMeters,
            0,
            minY * cellMeters
        );
        const worldMax = new THREE.Vector3(
            (maxX + 1) * cellMeters,
            wallHeightMeters,
            (maxY + 1) * cellMeters
        );
        const worldCenter = new THREE.Vector3(
            (worldMin.x + worldMax.x) / 2,
            (worldMin.y + worldMax.y) / 2,
            (worldMin.z + worldMax.z) / 2
        );

        return { min: worldMin, max: worldMax, center: worldCenter };
    }

    /**
     * Validate parity and log results
     */
    function validateParity(scene) {
        const { meta, tiles, edges } = scene;

        // Compute actual counts
        const actualTiles = tiles.floor.length;
        const actualEdgesH = edges.horizontal.length;
        const actualEdgesV = edges.vertical.length;
        const actualFloorArea = actualTiles; // For cellMeters=1
        const actualEdgeLenH = actualEdgesH;
        const actualEdgeLenV = actualEdgesV;

        if (meta.parity) {
            const { tiles: expectedTiles, edgesH: expectedEdgesH, edgesV: expectedEdgesV,
                    floorArea: expectedFloorArea, edgeLenH: expectedEdgeLenH, edgeLenV: expectedEdgeLenV } = meta.parity;

            const mismatches = [];
            if (actualTiles !== expectedTiles) mismatches.push(`tiles: expected ${expectedTiles}, got ${actualTiles}`);
            if (actualEdgesH !== expectedEdgesH) mismatches.push(`edgesH: expected ${expectedEdgesH}, got ${actualEdgesH}`);
            if (actualEdgesV !== expectedEdgesV) mismatches.push(`edgesV: expected ${expectedEdgesV}, got ${actualEdgesV}`);
            if (actualFloorArea !== expectedFloorArea) mismatches.push(`floorArea: expected ${expectedFloorArea}, got ${actualFloorArea}`);
            if (actualEdgeLenH !== expectedEdgeLenH) mismatches.push(`edgeLenH: expected ${expectedEdgeLenH}, got ${actualEdgeLenH}`);
            if (actualEdgeLenV !== expectedEdgeLenV) mismatches.push(`edgeLenV: expected ${expectedEdgeLenV}, got ${actualEdgeLenV}`);

            if (mismatches.length > 0) {
                console.error(`[SCENE:v1] Parity check FAILED: ${mismatches[0]}`);
            } else {
                console.log('[SCENE:v1] Parity OK');
            }
        } else {
            console.log('[SCENE:v1] Parity data unavailable');
        }
    }

    /**
     * Load and render a scene.3d.v1.json file
     * @param {string|object} input - URL string or scene object
     * @param {object} opts - Options including mount group
     * @returns {Promise<THREE.Group>} Promise resolving to complete scene group
     */
    async function loadScene3dV1(input, opts) {
        opts = opts || {};

        // Parse input
        let scene;
        if (typeof input === 'string') {
            const res = await fetch(input);
            scene = await res.json();
        } else {
            scene = input;
        }

        // Validate required fields
        if (!scene.units?.cellMeters) {
            throw new Error('Missing required field: units.cellMeters');
        }
        if (!scene.meta?.axes) {
            throw new Error('Missing required field: meta.axes');
        }

        // Validate axes format
        if (!scene.meta.axes.endsWith('_XY_ground')) {
            throw new Error(`Unsupported axes format: ${scene.meta.axes}. Expected format: *_XY_ground`);
        }

        const { units, meta } = scene;
        const { cellMeters, wallHeightMeters, wallThicknessMeters, floorThicknessMeters } = units;

        // Convert v1 data to internal format
        const layout = v1ToLayout(scene);
        const edges = v1ToEdges(scene, layout);

        // Build geometry using adapted builders
        const floorsGroup = buildFloorsV1(layout, cellMeters, floorThicknessMeters);
        const wallsGroup = buildWallsV1(edges, cellMeters, wallHeightMeters, wallThicknessMeters);

        // Build ghost grid
        const gridW = meta.simLimits?.maxTilesX || 60;
        const gridH = meta.simLimits?.maxTilesY || 40;
        const ghostGrid = buildGhostGrid(gridW, gridH, cellMeters);

        // Compute bounds
        const bounds = computeBounds(scene);

        // Create root group
        const sceneGroup = new THREE.Group();
        sceneGroup.name = "scene3d_v1";
        sceneGroup.add(floorsGroup);
        sceneGroup.add(wallsGroup);
        sceneGroup.add(ghostGrid);

        // Add to mount if provided
        if (opts.mount) {
            opts.mount.add(sceneGroup);
        }

        // Validate parity
        validateParity(scene);

        // Calculate dimensions for logging
        const offsetTiles = scene.tiles.floor.map(([x, y]) => [x + scene.originOffset.x, y + scene.originOffset.y]);
        const minX = offsetTiles.length > 0 ? Math.min(...offsetTiles.map(([x]) => x)) : 0;
        const maxX = offsetTiles.length > 0 ? Math.max(...offsetTiles.map(([x]) => x)) : 0;
        const minY = offsetTiles.length > 0 ? Math.min(...offsetTiles.map(([, y]) => y)) : 0;
        const maxY = offsetTiles.length > 0 ? Math.max(...offsetTiles.map(([, y]) => y)) : 0;
        const tilesWidth = maxX - minX + 1;
        const tilesHeight = maxY - minY + 1;

        // Log scene info
        console.log(`[SCENE:v1] tiles=${scene.tiles.floor.length}, edgesH=${scene.edges.horizontal.length}, edgesV=${scene.edges.vertical.length}, w×h=${tilesWidth}×${tilesHeight}, cell=${cellMeters}m, originOffset=(${scene.originOffset.x},${scene.originOffset.y})`);

        // Store bounds for camera positioning
        sceneGroup.bounds = bounds;

        return sceneGroup;
    }

    // Expose to global scope
    window.loadScene3dV1 = loadScene3dV1;

    console.log('✅ loadScene3dV1 browser shim loaded');

})();