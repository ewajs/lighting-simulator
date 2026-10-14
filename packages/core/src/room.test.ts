import { describe, expect, it } from 'vitest';
import { addLuminaire } from './luminaires';
import { resizeRoom, setSurface } from './room';
import { catalog, emptyScene, product } from './test-fixtures';

describe('resizeRoom', () => {
  it('changes only the given dimensions', () => {
    const { room } = resizeRoom(emptyScene, { height: 3 }, catalog);
    expect(room).toMatchObject({ width: 5, depth: 4, height: 3 });
  });

  it('moves ceiling mounts with the ceiling and keeps fixtures inside the room', () => {
    let scene = addLuminaire(emptyScene, product('recessed'), 'a', { x: 2, z: 1.5 });
    scene = resizeRoom(scene, { width: 2, height: 3 }, catalog);
    // New half-width is 1 m, so x = 2 is clamped to 1. The ceiling is now at 3 m.
    expect(scene.luminaires[0]?.position).toEqual({ x: 1, y: 3, z: 1.5 });
  });

  it('rejects non-positive or non-finite sizes', () => {
    expect(() => resizeRoom(emptyScene, { width: 0 }, catalog)).toThrow(/room.width/);
    expect(() => resizeRoom(emptyScene, { height: Number.NaN }, catalog)).toThrow(RangeError);
  });
});

describe('setSurface', () => {
  it('updates one surface and leaves the others', () => {
    const { room } = setSurface(emptyScene, 'floor', { reflectance: 0.5 });
    expect(room.surfaces.floor).toEqual({ color: '#8a6a4a', reflectance: 0.5 });
    expect(room.surfaces.walls).toBe(emptyScene.room.surfaces.walls);
  });

  it('rejects bad colours and reflectances', () => {
    expect(() => setSurface(emptyScene, 'walls', { color: 'red' })).toThrow(/walls.color/);
    expect(() => setSurface(emptyScene, 'walls', { reflectance: 1 })).toThrow(/walls.reflectance/);
  });

  it('puts a texture on and takes it off', () => {
    const textured = setSurface(emptyScene, 'floor', { texture: 'oak-planks', reflectance: 0.3 });
    expect(textured.room.surfaces.floor.texture).toBe('oak-planks');
    const plain = setSurface(textured, 'floor', { texture: undefined });
    expect(plain.room.surfaces.floor.texture).toBeUndefined();
    expect(JSON.parse(JSON.stringify(plain.room.surfaces.floor))).toEqual({
      color: '#8a6a4a',
      reflectance: 0.3,
    });
    expect(() => setSurface(emptyScene, 'floor', { texture: '' })).toThrow(/floor.texture/);
  });
});
