import { describe, expect, it } from 'vitest';
import {
  addLuminaire,
  duplicateLuminaires,
  DUPLICATE_OFFSET,
  removeLuminaires,
  updateLuminaire,
} from './luminaires';
import { catalog, emptyScene, product } from './test-fixtures';

const withSpot = addLuminaire(emptyScene, product('recessed', { cct: 2700 }), 'a', { x: 1, z: 1 });

describe('addLuminaire', () => {
  it('creates a luminaire at full output with the product defaults', () => {
    expect(withSpot.luminaires).toEqual([
      {
        id: 'a',
        productId: 'test-recessed',
        position: { x: 1, y: 2.7, z: 1 },
        aim: { tiltDeg: 0, panDeg: 0 },
        dimming: 1,
        on: true,
        cct: 2700,
      },
    ]);
  });

  it('does not change the original scene', () => {
    expect(emptyScene.luminaires).toHaveLength(0);
  });

  it('rejects products with invalid photometric data', () => {
    expect(() => addLuminaire(emptyScene, product('floor', { flux: Number.NaN }), 'x')).toThrow(
      /flux/,
    );
  });
});

describe('updateLuminaire', () => {
  it('applies the patch', () => {
    const scene = updateLuminaire(withSpot, 'a', { dimming: 0.25, on: false }, catalog);
    expect(scene.luminaires[0]).toMatchObject({ dimming: 0.25, on: false });
  });

  it('constrains a new position to the mount type', () => {
    const scene = updateLuminaire(withSpot, 'a', { position: { x: -1, y: 0.5, z: 0 } }, catalog);
    expect(scene.luminaires[0]?.position).toEqual({ x: -1, y: 2.7, z: 0 });
  });

  it('rejects out-of-range values and unknown ids', () => {
    expect(() => updateLuminaire(withSpot, 'a', { dimming: 1.5 }, catalog)).toThrow(/dimming/);
    expect(() => updateLuminaire(withSpot, 'nope', { on: false }, catalog)).toThrow(/nope/);
  });
});

describe('removeLuminaires', () => {
  it('removes the given ids', () => {
    expect(removeLuminaires(withSpot, ['a']).luminaires).toEqual([]);
  });

  it('rejects unknown ids', () => {
    expect(() => removeLuminaires(withSpot, ['nope'])).toThrow(/nope/);
  });
});

describe('duplicateLuminaires', () => {
  it('copies with a new id, offset along x', () => {
    const scene = duplicateLuminaires(withSpot, ['a'], ['b'], catalog);
    expect(scene.luminaires[1]).toMatchObject({
      id: 'b',
      position: { x: 1 + DUPLICATE_OFFSET, y: 2.7, z: 1 },
    });
  });

  it('keeps the copy inside the room', () => {
    const atEdge = addLuminaire(emptyScene, product('recessed'), 'a', { x: 2.5, z: 0 });
    const scene = duplicateLuminaires(atEdge, ['a'], ['b'], catalog);
    expect(scene.luminaires[1]?.position.x).toBe(2.5);
  });
});
