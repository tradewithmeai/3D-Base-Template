/**
 * validateScene3D - JSON Schema validation for scene.3d.v1 format
 *
 * Provides warn-only validation with detailed error reporting
 * Returns { errors, count } for import-time validation
 */

(function() {
    'use strict';

    // Simple JSON Schema validator implementation
    // This is a lightweight validator focused on scene.3d.v1 needs

    /**
     * Validate scene.3d.v1 JSON object against schema
     * @param {Object} obj - JSON object to validate
     * @returns {Object} { errors: Array, count: number }
     */
    function validateScene3D(obj) {
        const errors = [];

        if (!obj || typeof obj !== 'object') {
            errors.push({ path: '$', message: 'Root must be an object' });
            return { errors, count: errors.length };
        }

        // Validate required top-level properties
        const requiredProps = ['meta', 'units', 'bounds', 'tiles', 'edges', 'originOffset'];
        requiredProps.forEach(prop => {
            if (!(prop in obj)) {
                errors.push({ path: `$.${prop}`, message: `Missing required property '${prop}'` });
            }
        });

        // Validate meta object
        if (obj.meta) {
            validateMeta(obj.meta, errors, '$.meta');
        }

        // Validate units object
        if (obj.units) {
            validateUnits(obj.units, errors, '$.units');
        }

        // Validate bounds object
        if (obj.bounds) {
            validateBounds(obj.bounds, errors, '$.bounds');
        }

        // Validate tiles object
        if (obj.tiles) {
            validateTiles(obj.tiles, errors, '$.tiles');
        }

        // Validate edges object
        if (obj.edges) {
            validateEdges(obj.edges, errors, '$.edges');
        }

        // Validate originOffset object
        if (obj.originOffset) {
            validateOriginOffset(obj.originOffset, errors, '$.originOffset');
        }

        return { errors, count: errors.length };
    }

    function validateMeta(meta, errors, path) {
        if (typeof meta !== 'object') {
            errors.push({ path, message: 'Must be an object' });
            return;
        }

        // Required: schema, version
        if (!meta.schema) {
            errors.push({ path: `${path}.schema`, message: 'Missing required property' });
        } else if (meta.schema !== 'scene.3d.v1') {
            errors.push({ path: `${path}.schema`, message: 'Must be "scene.3d.v1"' });
        }

        if (!meta.version) {
            errors.push({ path: `${path}.version`, message: 'Missing required property' });
        } else if (typeof meta.version !== 'string' || !/^1\.[0-9]+$/.test(meta.version)) {
            errors.push({ path: `${path}.version`, message: 'Must match pattern "1.x"' });
        }

        // Optional: name length check
        if (meta.name && (typeof meta.name !== 'string' || meta.name.length === 0 || meta.name.length > 100)) {
            errors.push({ path: `${path}.name`, message: 'Must be string with 1-100 characters' });
        }
    }

    function validateUnits(units, errors, path) {
        if (typeof units !== 'object') {
            errors.push({ path, message: 'Must be an object' });
            return;
        }

        // Required numeric properties with ranges
        const numericProps = {
            cellMeters: { min: 0, max: 10, exclusive: true },
            wallHeightMeters: { min: 0.1, max: 20 },
            wallThicknessMeters: { min: 0.01, max: 2 },
            floorThicknessMeters: { min: 0.01, max: 1 }
        };

        Object.entries(numericProps).forEach(([prop, range]) => {
            if (!(prop in units)) {
                errors.push({ path: `${path}.${prop}`, message: 'Missing required property' });
            } else if (typeof units[prop] !== 'number') {
                errors.push({ path: `${path}.${prop}`, message: 'Must be a number' });
            } else {
                const val = units[prop];
                const minCheck = range.exclusive ? (val <= range.min) : (val < range.min);
                if (minCheck) {
                    errors.push({ path: `${path}.${prop}`, message: `Must be ${range.exclusive ? '>' : '>='} ${range.min}` });
                }
                if (val > range.max) {
                    errors.push({ path: `${path}.${prop}`, message: `Must be <= ${range.max}` });
                }
            }
        });

        // Optional enum properties
        if (units.lengthUnit && !['meters', 'metres'].includes(units.lengthUnit)) {
            errors.push({ path: `${path}.lengthUnit`, message: 'Must be "meters" or "metres"' });
        }

        if (units.coordinateSystem && units.coordinateSystem !== 'right-handed-y-up') {
            errors.push({ path: `${path}.coordinateSystem`, message: 'Must be "right-handed-y-up"' });
        }
    }

    function validateBounds(bounds, errors, path) {
        if (typeof bounds !== 'object') {
            errors.push({ path, message: 'Must be an object' });
            return;
        }

        ['min', 'max', 'center'].forEach(prop => {
            if (!(prop in bounds)) {
                errors.push({ path: `${path}.${prop}`, message: 'Missing required property' });
            } else {
                validatePoint3D(bounds[prop], errors, `${path}.${prop}`);
            }
        });
    }

    function validateTiles(tiles, errors, path) {
        if (typeof tiles !== 'object') {
            errors.push({ path, message: 'Must be an object' });
            return;
        }

        if (!('floor' in tiles)) {
            errors.push({ path: `${path}.floor`, message: 'Missing required property' });
        } else if (!Array.isArray(tiles.floor)) {
            errors.push({ path: `${path}.floor`, message: 'Must be an array' });
        } else {
            tiles.floor.forEach((coord, index) => {
                validateGridCoordinate(coord, errors, `${path}.floor[${index}]`);
            });
        }
    }

    function validateEdges(edges, errors, path) {
        if (typeof edges !== 'object') {
            errors.push({ path, message: 'Must be an object' });
            return;
        }

        ['horizontal', 'vertical'].forEach(prop => {
            if (!(prop in edges)) {
                errors.push({ path: `${path}.${prop}`, message: 'Missing required property' });
            } else if (!Array.isArray(edges[prop])) {
                errors.push({ path: `${path}.${prop}`, message: 'Must be an array' });
            } else {
                edges[prop].forEach((coord, index) => {
                    validateGridCoordinate(coord, errors, `${path}.${prop}[${index}]`);
                });
            }
        });
    }

    function validateOriginOffset(offset, errors, path) {
        if (typeof offset !== 'object') {
            errors.push({ path, message: 'Must be an object' });
            return;
        }

        ['x', 'z'].forEach(prop => {
            if (!(prop in offset)) {
                errors.push({ path: `${path}.${prop}`, message: 'Missing required property' });
            } else if (typeof offset[prop] !== 'number') {
                errors.push({ path: `${path}.${prop}`, message: 'Must be a number' });
            }
        });
    }

    function validatePoint3D(point, errors, path) {
        if (typeof point !== 'object') {
            errors.push({ path, message: 'Must be an object' });
            return;
        }

        ['x', 'y', 'z'].forEach(prop => {
            if (!(prop in point)) {
                errors.push({ path: `${path}.${prop}`, message: 'Missing required property' });
            } else if (typeof point[prop] !== 'number') {
                errors.push({ path: `${path}.${prop}`, message: 'Must be a number' });
            }
        });
    }

    function validateGridCoordinate(coord, errors, path) {
        if (!Array.isArray(coord)) {
            errors.push({ path, message: 'Must be an array' });
            return;
        }

        if (coord.length !== 2) {
            errors.push({ path, message: 'Must have exactly 2 elements' });
            return;
        }

        coord.forEach((val, index) => {
            if (!Number.isInteger(val)) {
                errors.push({ path: `${path}[${index}]`, message: 'Must be an integer' });
            } else if (val < 0 || val > 1000) {
                errors.push({ path: `${path}[${index}]`, message: 'Must be between 0 and 1000' });
            }
        });
    }

    // Expose to global scope
    window.validateScene3D = validateScene3D;

    console.log('✅ validateScene3D loaded - scene.3d.v1 schema validation');

})();