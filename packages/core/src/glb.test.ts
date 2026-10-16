import { describe, expect, it, onTestFinished, vi } from 'vitest';
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

describe('agreement with three.js', () => {
  it('finds nodes where three.js’ loader puts them, in a file three.js wrote', async () => {
    const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    const THREE = await import('three');
    // The exporter reads its output Blob with FileReader, which Node lacks.
    const NodeFileReader = class {
      result: ArrayBuffer | null = null;
      onloadend: (() => void) | null = null;
      readAsArrayBuffer(blob: Blob) {
        void blob.arrayBuffer().then((buffer) => {
          this.result = buffer;
          this.onloadend?.();
        });
      }
    };
    vi.stubGlobal('FileReader', NodeFileReader);
    onTestFinished(() => {
      vi.unstubAllGlobals();
    });

    // A track spot as a manufacturer might model it: turned and scaled at the
    // root, a head turned on its pivot, and the light inside the head.
    const root = new THREE.Group();
    root.position.set(0.2, -0.01, 0.05);
    root.rotation.set(0.1, 0.7, -0.05);
    root.scale.set(1.1, 0.9, 1);
    const head = new THREE.Group();
    head.name = 'head';
    head.position.set(0, -0.1, 0);
    head.rotation.set(-0.4, 0.3, 0);
    const light = new THREE.Object3D();
    light.name = 'light';
    light.position.set(0.01, -0.08, 0.02);
    // A mesh so the exporter writes a real model, not just empty nodes.
    head.add(light, new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.05)));
    root.add(head);
    const scene = new THREE.Scene().add(root);

    const file = (await new GLTFExporter().parseAsync(scene, { binary: true })) as ArrayBuffer;
    const loaded = (await new GLTFLoader().parseAsync(file, '')).scene;
    loaded.updateMatrixWorld(true);
    const positions = glbNodePositions(file, ['light', 'head']);
    for (const name of ['light', 'head']) {
      const expected = loaded.getObjectByName(name)!.getWorldPosition(new THREE.Vector3());
      const found = positions.get(name)!;
      expect(found.x).toBeCloseTo(expected.x, 9);
      expect(found.y).toBeCloseTo(expected.y, 9);
      expect(found.z).toBeCloseTo(expected.z, 9);
    }
  });
});
