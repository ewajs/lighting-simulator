import { describe, expect, it } from 'vitest';
import { addFurniture, constrainFurniture, copyFurniture, updateFurniture } from './furniture';
import { FURNITURE_KINDS, FURNITURE_TYPES } from './furniture-kinds';
import { resizeRoom } from './room';
import { catalog, emptyScene, room } from './test-fixtures';
import type { Furniture, FurnitureKind, Scene } from './types';

/** A scene with one piece of `kind`, and that piece. */
function withPiece(kind: FurnitureKind, at?: { x: number; z: number }): [Scene, Furniture] {
  const scene = addFurniture(emptyScene, kind, 'a', at);
  return [scene, scene.furniture[0]!];
}

const position = (scene: Scene, id = 'a') => scene.furniture.find((f) => f.id === id)!.position;

describe('addFurniture', () => {
  it('adds a piece at its usual size and finishes, standing at the room centre', () => {
    const [, sofa] = withPiece('sofa');
    expect(sofa).toEqual({
      id: 'a',
      kind: 'sofa',
      position: { x: 0, y: 0, z: 0 },
      rotationDeg: 0,
      size: FURNITURE_TYPES.sofa.size,
      finish: FURNITURE_TYPES.sofa.finish,
    });
  });

  it('hangs wall pieces on the nearest wall at eye height, facing the room', () => {
    // Room 5 × 4 m: the back wall is z = −2, the right wall x = 2.5.
    expect(withPiece('artwork')[1]).toMatchObject({
      position: { x: 0, y: 1.5, z: -2 },
      rotationDeg: 0,
    });
    expect(withPiece('artwork', { x: 2.3, z: 0.5 })[1]).toMatchObject({
      position: { x: 2.5, y: 1.5, z: 0.5 },
      rotationDeg: -90,
    });
    expect(withPiece('artwork', { x: 0, z: 1.9 })[1].rotationDeg).toBe(-180);
    expect(withPiece('artwork', { x: -2.4, z: 0 })[1].rotationDeg).toBe(90);
  });

  it('rejects an unknown kind', () => {
    expect(() => addFurniture(emptyScene, 'throne' as FurnitureKind, 'a')).toThrow(/throne/);
  });

  it('knows every kind', () => {
    expect(FURNITURE_KINDS).toHaveLength(14);
    for (const kind of FURNITURE_KINDS) expect(() => withPiece(kind)).not.toThrow();
  });
});

describe('constrainFurniture', () => {
  it('keeps the footprint inside the room', () => {
    // Sofa 2.1 × 0.9 m in a 5 × 4 m room: its centre stays within x ±1.45, z ±1.55.
    const [scene] = withPiece('sofa');
    const moved = updateFurniture(scene, 'a', { position: { x: 10, y: 3, z: -10 } });
    expect(position(moved)).toEqual({ x: 1.45, y: 0, z: -1.55 });
  });

  it('measures the footprint as turned', () => {
    // Turned 90°, the sofa is 0.9 m along x and 2.1 m along z: x ±2.05, z ±0.95.
    const [scene] = withPiece('sofa');
    const turned = updateFurniture(scene, 'a', { rotationDeg: 90, position: { x: 9, y: 0, z: 9 } });
    expect(position(turned).x).toBeCloseTo(2.05, 9);
    expect(position(turned).z).toBeCloseTo(0.95, 9);
  });

  it('keeps rotations in [−180, 180)', () => {
    const [scene] = withPiece('chair');
    const turn = (rotationDeg: number) =>
      updateFurniture(scene, 'a', { rotationDeg }).furniture[0]!.rotationDeg;
    expect(turn(270)).toBe(-90);
    expect(turn(180)).toBe(-180);
    expect(turn(-190)).toBe(170);
    expect(turn(45)).toBe(45);
  });

  it('keeps sizes between half and twice the usual', () => {
    // The sofa is usually 2.1 m wide: 1.05–4.2 m.
    const [scene] = withPiece('sofa');
    const size = (width: number) =>
      updateFurniture(scene, 'a', { size: { width } }).furniture[0]!.size;
    expect(size(10).width).toBe(4.2);
    expect(size(0.2).width).toBe(1.05);
    expect(size(1.8)).toEqual({ width: 1.8, depth: 0.9, height: 0.8 });
  });

  it('centres a piece too big for the room', () => {
    const [, bed] = withPiece('bed');
    const tiny = { ...room, width: 1, depth: 1 };
    expect(
      constrainFurniture({ ...bed, position: { x: 0.3, y: 0, z: -0.3 } }, tiny).position,
    ).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('keeps wall pieces inside the wall and below the ceiling', () => {
    // Artwork 1.0 × 0.7 m on the back wall of a 5 m wide, 2.7 m high room.
    const [scene] = withPiece('artwork');
    const moved = updateFurniture(scene, 'a', { position: { x: 9, y: 9, z: -2 } });
    expect(position(moved)).toEqual({ x: 2, y: 2.35, z: -2 });
    const low = updateFurniture(scene, 'a', { position: { x: 0, y: 0, z: -2 } });
    expect(position(low).y).toBe(0.35);
  });
});

describe('updateFurniture', () => {
  it('changes one finish and keeps the other', () => {
    const [scene] = withPiece('sofa');
    const next = updateFurniture(scene, 'a', { finish: { main: 'slate' } });
    expect(next.furniture[0]!.finish).toEqual({ main: 'slate', accent: 'oak' });
  });

  it('rejects invalid values and unknown ids', () => {
    const [scene] = withPiece('sofa');
    expect(() => updateFurniture(scene, 'a', { rotationDeg: NaN })).toThrow(/rotationDeg/);
    expect(() => updateFurniture(scene, 'a', { size: { height: 0 } })).toThrow(/size.height/);
    expect(() => updateFurniture(scene, 'a', { finish: { main: 'gold' as 'oak' } })).toThrow(
      /gold/,
    );
    expect(() => updateFurniture(scene, 'b', { rotationDeg: 0 })).toThrow(/Unknown furniture/);
  });
});

describe('copyFurniture', () => {
  it('puts a copy 0.5 m to its source’s right', () => {
    const [, chair] = withPiece('chair');
    expect(copyFurniture(chair, 'b', room).position).toEqual({ x: 0.5, y: 0, z: 0 });
    // Turned to face +x, its right is −z.
    const copy = copyFurniture({ ...chair, rotationDeg: 90 }, 'b', room).position;
    expect(copy.x).toBeCloseTo(0, 9);
    expect(copy.z).toBeCloseTo(-0.5, 9);
  });

  it('slides a copied picture along its wall', () => {
    // On the left wall the picture faces +x, so its right is −z.
    const [, picture] = withPiece('artwork', { x: -2.4, z: 0 });
    expect(copyFurniture(picture, 'b', room).position).toEqual({ x: -2.5, y: 1.5, z: -0.5 });
  });
});

describe('resizeRoom', () => {
  it('moves furniture back inside a smaller room', () => {
    const [scene] = withPiece('chair', { x: 2, z: 1.5 });
    // Chair 0.46 × 0.5 m in a 3 × 3 m room: x ≤ 1.27, z ≤ 1.25.
    const resized = resizeRoom(scene, { width: 3, depth: 3 }, catalog);
    expect(position(resized)).toEqual({ x: 1.27, y: 0, z: 1.25 });
  });
});
