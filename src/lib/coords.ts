/**
 * Corner-based coordinate system utilities for 3D room building
 * 
 * Converts from corner-based coordinates (origin at Southwest corner)
 * to Three.js center-based positioning
 */

export interface Dimensions {
  width: number;
  depth: number;
  height: number;
}

export interface Position {
  x: number;
  y: number;
  z: number;
}

/**
 * Convert floor corner coordinates to Three.js center position
 * @param roomDimensions - Room dimensions (width=X, depth=Z, height=Y)
 * @returns Center position for floor plane
 */
export function getFloorCenter(roomDimensions: Dimensions): Position {
  return {
    x: roomDimensions.width / 2,
    y: 0,
    z: roomDimensions.depth / 2
  };
}

/**
 * Convert ceiling corner coordinates to Three.js center position  
 * @param roomDimensions - Room dimensions (width=X, depth=Z, height=Y)
 * @returns Center position for ceiling plane
 */
export function getCeilingCenter(roomDimensions: Dimensions): Position {
  return {
    x: roomDimensions.width / 2,
    y: roomDimensions.height,
    z: roomDimensions.depth / 2
  };
}

/**
 * Convert wall corner coordinates to Three.js center position
 * @param wall - Wall identifier ('north', 'south', 'east', 'west')
 * @param roomDimensions - Room dimensions (width=X, depth=Z, height=Y)
 * @returns Center position for wall plane
 */
export function getWallCenter(wall: 'north' | 'south' | 'east' | 'west', roomDimensions: Dimensions): Position {
  const midHeight = roomDimensions.height / 2;
  
  switch (wall) {
    case 'north': // Back wall (Z = depth)
      return {
        x: roomDimensions.width / 2,
        y: midHeight,
        z: roomDimensions.depth
      };
      
    case 'south': // Front wall (Z = 0)
      return {
        x: roomDimensions.width / 2,
        y: midHeight,
        z: 0
      };
      
    case 'east': // Right wall (X = width)
      return {
        x: roomDimensions.width,
        y: midHeight,
        z: roomDimensions.depth / 2
      };
      
    case 'west': // Left wall (X = 0)
      return {
        x: 0,
        y: midHeight,
        z: roomDimensions.depth / 2
      };
      
    default:
      throw new Error(`Invalid wall identifier: ${wall}`);
  }
}