import { describe, expect, it } from 'vitest';
import { fixtureLayout, modelLayout, placeholderLayout } from './fixture-layout';
import { glbNodePositions } from './glb';
import { product } from './test-fixtures';

/** A binary glTF holding only `json`, as the format lays it out: header, then a padded JSON chunk. */
function glb(json: unknown, version = 2): ArrayBuffer {
  let text = JSON.stringify(json);
  while (text.length % 4 !== 0) text += ' ';
  const bytes = new TextEncoder().encode(text);
  const buffer = new ArrayBuffer(12 + 8 + bytes.length);
  const view = new DataView(buffer);
  view.setUint32(0, 0x46546c67, true); // "glTF"
  view.setUint32(4, version, true);
  view.setUint32(8, buffer.byteLength, true);
  view.setUint32(12, bytes.length, true);
  view.setUint32(16, 0x4e4f534a, true); // "JSON"
  new Uint8Array(buffer, 20).set(bytes);
  return buffer;
}

const HALF_TURN_SIN = Math.SQRT1_2;

describe('glbNodePositions', () => {
  it('composes translations, rotations and scales down the hierarchy', () => {
    const file = glb({
      scene: 0,
      scenes: [{ nodes: [0, 2] }],
      nodes: [
        // Moved to (1, 2, 3) and turned 90° about y, which takes +z to +x.
        { translation: [1, 2, 3], rotation: [0, HALF_TURN_SIN, 0, HALF_TURN_SIN], children: [1] },
        { name: 'light', translation: [0, 0, 1] },
        // Scaled ×2: a child 1 m along x ends up 2 m along.
        { scale: [2, 2, 2], children: [3] },
        { name: 'head', translation: [1, 0, 0] },
      ],
    });
    const positions = glbNodePositions(file, ['light', 'head', 'missing']);
    const light = positions.get('light')!;
    expect(light.x).toBeCloseTo(2, 12);
    expect(light.y).toBeCloseTo(2, 12);
    expect(light.z).toBeCloseTo(3, 12);
    expect(positions.get('head')).toEqual({ x: 2, y: 0, z: 0 });
    expect(positions.has('missing')).toBe(false);
  });

  it('reads a node given as a matrix', () => {
    const matrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0.5, -0.03, 0.25, 1];
    const file = glb({ scenes: [{ nodes: [0] }], nodes: [{ name: 'light', matrix }] });
    expect(glbNodePositions(file, ['light']).get('light')).toEqual({ x: 0.5, y: -0.03, z: 0.25 });
  });

  it('takes the first node of a name, as three.js does', () => {
    const file = glb({
      scenes: [{ nodes: [0, 1] }],
      nodes: [
        { name: 'light', translation: [0, -0.1, 0] },
        { name: 'light', translation: [0, -0.5, 0] },
      ],
    });
    expect(glbNodePositions(file, ['light']).get('light')).toEqual({ x: 0, y: -0.1, z: 0 });
  });

  it('rejects files that are not binary glTF 2.0', () => {
    expect(() => glbNodePositions(new ArrayBuffer(8), ['light'])).toThrow(/too short/);
    const wrongMagic = glb({});
    new DataView(wrongMagic).setUint32(0, 0, true);
    expect(() => glbNodePositions(wrongMagic, ['light'])).toThrow(/glTF/);
    expect(() => glbNodePositions(glb({}, 1), ['light'])).toThrow(/version 1/);
  });
});

describe('fixture layouts', () => {
  it('reads a model’s light and head nodes', () => {
    const file = glb({
      scenes: [{ nodes: [0] }],
      nodes: [
        { name: 'head', translation: [0, -0.1, 0], children: [1] },
        { name: 'light', translation: [0, -0.08, 0] },
      ],
    });
    const layout = modelLayout(file);
    expect(layout.headPivot).toEqual({ x: 0, y: -0.1, z: 0 });
    expect(layout.lightOrigin.y).toBeCloseTo(-0.18, 12);
  });

  it('puts the light at a model’s origin when it has no light node, and gives no head', () => {
    expect(modelLayout(glb({ scenes: [{ nodes: [] }], nodes: [] }))).toEqual({
      lightOrigin: { x: 0, y: 0, z: 0 },
    });
  });

  it('falls back to the placeholder’s layout without a model, or with one it can’t read', () => {
    const track = product('track');
    expect(fixtureLayout(track)).toEqual(placeholderLayout('track'));
    expect(fixtureLayout(track, new ArrayBuffer(4))).toEqual(placeholderLayout('track'));
  });
});
