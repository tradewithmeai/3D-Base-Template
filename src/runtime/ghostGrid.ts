/**
 * Ghost grid overlay for visualizing the editor grid
 *
 * Grid is anchored at world (0,0,0), lines on every integer coordinate,
 * positioned at y=+0.001 to avoid z-fighting.
 * No centering, no offsets, no rotations.
 */

import * as THREE from 'three';

/**
 * Build a ghost grid overlay showing the editor grid
 * @param gridW - Grid width in cells
 * @param gridH - Grid height in cells
 * @param cellMeters - Size of each cell in meters
 * @returns THREE.Group containing the grid lines
 */
export function buildGhostGrid(gridW: number, gridH: number, cellMeters: number): THREE.Group {
  const gridGroup = new THREE.Group();
  gridGroup.name = "ghostGrid";

  const material = new THREE.LineBasicMaterial({
    color: 0x404040,
    transparent: true,
    opacity: 0.3
  });

  const points: THREE.Vector3[] = [];

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