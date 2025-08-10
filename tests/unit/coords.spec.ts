import { describe, it, expect } from 'vitest';
import { getFloorCenter, getCeilingCenter, getWallCenter, type Dimensions } from '../../src/lib/coords';

describe('Corner-based coordinate conversions', () => {
  const testRoom: Dimensions = {
    width: 40,  // X-axis: 0 to 40
    depth: 30,  // Z-axis: 0 to 30
    height: 8   // Y-axis: 0 to 8
  };

  describe('getFloorCenter', () => {
    it('should place floor at room center, Y=0', () => {
      const result = getFloorCenter(testRoom);
      
      expect(result).toEqual({
        x: 20,  // width / 2
        y: 0,   // floor level
        z: 15   // depth / 2
      });
    });

    it('should work with different room dimensions', () => {
      const smallRoom: Dimensions = { width: 10, depth: 6, height: 3 };
      const result = getFloorCenter(smallRoom);
      
      expect(result).toEqual({
        x: 5,   // 10 / 2
        y: 0,   // floor level
        z: 3    // 6 / 2
      });
    });
  });

  describe('getCeilingCenter', () => {
    it('should place ceiling at room center, Y=height', () => {
      const result = getCeilingCenter(testRoom);
      
      expect(result).toEqual({
        x: 20,  // width / 2
        y: 8,   // ceiling height
        z: 15   // depth / 2
      });
    });
  });

  describe('getWallCenter', () => {
    it('should place north wall at back (Z=depth)', () => {
      const result = getWallCenter('north', testRoom);
      
      expect(result).toEqual({
        x: 20,  // width / 2
        y: 4,   // height / 2
        z: 30   // depth (back wall)
      });
    });

    it('should place south wall at front (Z=0)', () => {
      const result = getWallCenter('south', testRoom);
      
      expect(result).toEqual({
        x: 20,  // width / 2
        y: 4,   // height / 2
        z: 0    // front wall
      });
    });

    it('should place east wall at right (X=width)', () => {
      const result = getWallCenter('east', testRoom);
      
      expect(result).toEqual({
        x: 40,  // width (right wall)
        y: 4,   // height / 2
        z: 15   // depth / 2
      });
    });

    it('should place west wall at left (X=0)', () => {
      const result = getWallCenter('west', testRoom);
      
      expect(result).toEqual({
        x: 0,   // left wall
        y: 4,   // height / 2
        z: 15   // depth / 2
      });
    });

    it('should throw error for invalid wall', () => {
      expect(() => {
        // @ts-ignore - intentionally testing invalid input
        getWallCenter('invalid', testRoom);
      }).toThrow('Invalid wall identifier: invalid');
    });
  });

  describe('coordinate system validation', () => {
    it('should match expected lobby layout positions', () => {
      // Test against actual room-layout.json coordinates
      const lobbyDimensions: Dimensions = { width: 40, depth: 30, height: 8 };
      
      // Floor should be at center (matches room-layout.json: [20, 0, 15])
      const floor = getFloorCenter(lobbyDimensions);
      expect(floor).toEqual({ x: 20, y: 0, z: 15 });
      
      // Ceiling should be at center, top (matches: [20, 8, 15])
      const ceiling = getCeilingCenter(lobbyDimensions);
      expect(ceiling).toEqual({ x: 20, y: 8, z: 15 });
      
      // Walls should match layout positions
      expect(getWallCenter('north', lobbyDimensions)).toEqual({ x: 20, y: 4, z: 30 });
      expect(getWallCenter('south', lobbyDimensions)).toEqual({ x: 20, y: 4, z: 0 });
      expect(getWallCenter('east', lobbyDimensions)).toEqual({ x: 40, y: 4, z: 15 });
      expect(getWallCenter('west', lobbyDimensions)).toEqual({ x: 0, y: 4, z: 15 });
    });
  });
});