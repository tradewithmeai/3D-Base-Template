/**
 * importScene3D - Reconstructive scene.3d.v1 importer with grid snapping
 *
 * Grid-snapped reconstruction: 1 tile = 1 engine unit (X/Z)
 * Converts JSON metres to engine units via 1 / units.cellMeters
 * Produces merged floor areas and coalesced wall runs
 */

(function() {
    'use strict';

    // Ensure THREE.js is available
    if (typeof window.THREE === 'undefined') {
        throw new Error('THREE.js must be loaded before importScene3D');
    }

    const THREE = window.THREE;

    /**
     * Import scene.3d.v1 JSON and reconstruct optimized geometry
     * @param {Object|string} jsonOrPath - JSON object or path to scene.3d.v1.json file
     * @param {Object} options - Import options { mode: 'optimized'|'literal' }
     * @returns {Promise<THREE.Group>} Three.js group containing reconstructed geometry
     */
    async function importScene3D(jsonOrPath, options = {}) {
        const { mode = 'optimized' } = options;

        let scene3D;
        if (typeof jsonOrPath === 'string') {
            const res = await fetch(jsonOrPath);
            scene3D = await res.json();
        } else {
            scene3D = jsonOrPath;
        }

        // Validate schema once
        if (!scene3D.meta || scene3D.meta.schema !== 'scene.3d.v1') {
            throw new Error('Invalid JSON: expected scene.3d.v1 schema');
        }

        // Extract data
        const scale = 1 / (scene3D.units?.cellMeters || 1.0);
        const floorTiles = scene3D.tiles?.floor || [];
        const hEdges = scene3D.edges?.horizontal || [];
        const vEdges = scene3D.edges?.vertical || [];

        const group = new THREE.Group();
        group.name = `scene-3d-${scene3D.meta.name || 'imported'}`;

        if (mode === 'literal') {
            // Debug mode: per-tile/per-edge rendering
            const floorsGroup = buildLiteralFloors(floorTiles, scene3D, scale);
            const wallsGroup = buildLiteralWalls(hEdges, vEdges, scene3D, scale);
            group.add(floorsGroup, wallsGroup);
        } else {
            // Optimized mode: clustered floors and coalesced walls
            const floorsGroup = buildClusteredFloors(floorTiles, scene3D, scale);
            const wallsGroup = buildCoalescedWalls(hEdges, vEdges, scene3D, scale);
            group.add(floorsGroup, wallsGroup);
        }

        // Count wall runs for logging
        const hRuns = mode === 'literal' ? hEdges.length : countHorizontalRuns(hEdges);
        const vRuns = mode === 'literal' ? vEdges.length : countVerticalRuns(vEdges);

        console.info('[PIPE]', {
            mode,
            unitPerTile: true,
            scale,
            tiles: floorTiles.length,
            hRuns,
            vRuns
        });

        return group;
    }

    /**
     * Build clustered floor areas (4-neighbour contiguous regions)
     */
    function buildClusteredFloors(floorTiles, scene3D, scale) {
        const group = new THREE.Group();
        group.name = 'clustered-floors';

        const floorThicknessUnits = (scene3D.units?.floorThicknessMeters || 0.1) * scale;

        const floorMaterial = new THREE.MeshLambertMaterial({
            color: 0x8B4513, // Brown floor
            transparent: false
        });

        // Create tile set for fast lookup
        const tileSet = new Set(floorTiles.map(([x, y]) => `${x},${y}`));
        const processed = new Set();

        floorTiles.forEach(([startX, startY]) => {
            const key = `${startX},${startY}`;
            if (processed.has(key)) return;

            // Find rectangular region starting at this tile
            const region = findRectangularRegion(startX, startY, tileSet, processed);
            if (region.width === 0 || region.height === 0) return;

            // Mark all tiles in region as processed
            for (let y = region.minY; y <= region.maxY; y++) {
                for (let x = region.minX; x <= region.maxX; x++) {
                    processed.add(`${x},${y}`);
                }
            }

            // Create merged floor slab
            const geometry = new THREE.BoxGeometry(region.width, floorThicknessUnits, region.height);
            const mesh = new THREE.Mesh(geometry, floorMaterial);

            // Position: worldX = x + 0.5; worldZ = y + 0.5 (units)
            const centerX = region.minX + region.width / 2;
            const centerZ = region.minY + region.height / 2;
            mesh.position.set(centerX, floorThicknessUnits / 2, centerZ);
            mesh.name = `floor-region-${region.minX}-${region.minY}-${region.width}x${region.height}`;

            group.add(mesh);
        });

        return group;
    }

    /**
     * Build coalesced wall runs (maximal horizontal/vertical sequences)
     */
    function buildCoalescedWalls(hEdges, vEdges, scene3D, scale) {
        const group = new THREE.Group();
        group.name = 'coalesced-walls';

        const wallHeightUnits = (scene3D.units?.wallHeightMeters || 3.0) * scale;
        const wallThicknessUnits = (scene3D.units?.wallThicknessMeters || 0.2) * scale;

        const wallMaterial = new THREE.MeshLambertMaterial({
            color: 0x808080, // Gray walls
            transparent: false
        });

        // Coalesce horizontal edges into runs
        const hRuns = coalesceHorizontalEdges(hEdges);
        hRuns.forEach((run, index) => {
            const length = run.endX - run.startX;
            const centerX = (run.startX + run.endX) / 2;
            const centerY = wallHeightUnits / 2;
            const wallZ = run.y + 0.5; // Edge at y+0.5

            const geometry = new THREE.BoxGeometry(length, wallHeightUnits, wallThicknessUnits);
            const mesh = new THREE.Mesh(geometry, wallMaterial);
            mesh.position.set(centerX, centerY, wallZ);
            mesh.name = `wall-h-run-${index}`;
            group.add(mesh);
        });

        // Coalesce vertical edges into runs
        const vRuns = coalesceVerticalEdges(vEdges);
        vRuns.forEach((run, index) => {
            const length = run.endY - run.startY;
            const wallX = run.x + 0.5; // Edge at x+0.5
            const centerY = wallHeightUnits / 2;
            const centerZ = (run.startY + run.endY) / 2;

            const geometry = new THREE.BoxGeometry(wallThicknessUnits, wallHeightUnits, length);
            const mesh = new THREE.Mesh(geometry, wallMaterial);
            mesh.position.set(wallX, centerY, centerZ);
            mesh.name = `wall-v-run-${index}`;
            group.add(mesh);
        });

        return group;
    }

    /**
     * Build literal per-tile floors (debug mode)
     */
    function buildLiteralFloors(floorTiles, scene3D, scale) {
        const group = new THREE.Group();
        group.name = 'literal-floors';

        const floorThicknessUnits = (scene3D.units?.floorThicknessMeters || 0.1) * scale;
        const floorMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });

        floorTiles.forEach(([x, y]) => {
            const geometry = new THREE.BoxGeometry(1, floorThicknessUnits, 1);
            const mesh = new THREE.Mesh(geometry, floorMaterial);
            mesh.position.set(x + 0.5, floorThicknessUnits / 2, y + 0.5);
            mesh.name = `floor-literal-${x}-${y}`;
            group.add(mesh);
        });

        return group;
    }

    /**
     * Build literal per-edge walls (debug mode)
     */
    function buildLiteralWalls(hEdges, vEdges, scene3D, scale) {
        const group = new THREE.Group();
        group.name = 'literal-walls';

        const wallHeightUnits = (scene3D.units?.wallHeightMeters || 3.0) * scale;
        const wallThicknessUnits = (scene3D.units?.wallThicknessMeters || 0.2) * scale;
        const wallMaterial = new THREE.MeshLambertMaterial({ color: 0x808080 });

        // Horizontal edges
        hEdges.forEach(([x, y]) => {
            const geometry = new THREE.BoxGeometry(1, wallHeightUnits, wallThicknessUnits);
            const mesh = new THREE.Mesh(geometry, wallMaterial);
            mesh.position.set(x + 0.5, wallHeightUnits / 2, y + 0.5);
            mesh.name = `wall-h-literal-${x}-${y}`;
            group.add(mesh);
        });

        // Vertical edges
        vEdges.forEach(([x, y]) => {
            const geometry = new THREE.BoxGeometry(wallThicknessUnits, wallHeightUnits, 1);
            const mesh = new THREE.Mesh(geometry, wallMaterial);
            mesh.position.set(x + 0.5, wallHeightUnits / 2, y + 0.5);
            mesh.name = `wall-v-literal-${x}-${y}`;
            group.add(mesh);
        });

        return group;
    }

    // Helper functions for floor clustering and wall coalescing
    function findRectangularRegion(startX, startY, tileSet, processed) {
        let width = 0;
        let height = 0;

        // Find width by scanning right
        while (tileSet.has(`${startX + width},${startY}`) &&
               !processed.has(`${startX + width},${startY}`)) {
            width++;
        }

        // Find height by scanning down
        let validHeight = true;
        while (validHeight) {
            for (let x = startX; x < startX + width; x++) {
                if (!tileSet.has(`${x},${startY + height}`) ||
                    processed.has(`${x},${startY + height}`)) {
                    validHeight = false;
                    break;
                }
            }
            if (validHeight) height++;
        }

        return {
            minX: startX,
            maxX: startX + width - 1,
            minY: startY,
            maxY: startY + height - 1,
            width,
            height
        };
    }

    function coalesceHorizontalEdges(edges) {
        const runs = [];
        const edgesByY = {};

        // Group edges by Y coordinate
        edges.forEach(([x, y]) => {
            if (!edgesByY[y]) edgesByY[y] = [];
            edgesByY[y].push(x);
        });

        // Find maximal runs for each Y
        Object.keys(edgesByY).forEach(y => {
            const xValues = edgesByY[y].sort((a, b) => a - b);
            let startX = xValues[0];
            let endX = startX + 1;

            for (let i = 1; i < xValues.length; i++) {
                if (xValues[i] === endX) {
                    endX++;
                } else {
                    runs.push({ startX, endX, y: parseInt(y) });
                    startX = xValues[i];
                    endX = startX + 1;
                }
            }
            runs.push({ startX, endX, y: parseInt(y) });
        });

        return runs;
    }

    function coalesceVerticalEdges(edges) {
        const runs = [];
        const edgesByX = {};

        // Group edges by X coordinate
        edges.forEach(([x, y]) => {
            if (!edgesByX[x]) edgesByX[x] = [];
            edgesByX[x].push(y);
        });

        // Find maximal runs for each X
        Object.keys(edgesByX).forEach(x => {
            const yValues = edgesByX[x].sort((a, b) => a - b);
            let startY = yValues[0];
            let endY = startY + 1;

            for (let i = 1; i < yValues.length; i++) {
                if (yValues[i] === endY) {
                    endY++;
                } else {
                    runs.push({ startY, endY, x: parseInt(x) });
                    startY = yValues[i];
                    endY = startY + 1;
                }
            }
            runs.push({ startY, endY, x: parseInt(x) });
        });

        return runs;
    }

    function countHorizontalRuns(edges) {
        return coalesceHorizontalEdges(edges).length;
    }

    function countVerticalRuns(edges) {
        return coalesceVerticalEdges(edges).length;
    }

    // Expose to global scope
    window.importScene3D = importScene3D;

    console.log('✅ importScene3D loaded - reconstructive scene.3d.v1 importer');

})();