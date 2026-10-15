import { describe, expect, it } from 'vitest';
import {
  parseScene,
  SCENE_FILE_EXTENSION,
  SCENE_FILE_FORMAT,
  SCENE_FILE_VERSION,
  SceneFileError,
  serializeScene,
  unknownProducts,
  type SceneFileProblem,
} from './scene-file';
import { Simulator } from './simulator';
import { catalog } from './test-fixtures';
import type { Scene } from './types';

/** A scene with a bit of everything: a textured floor, two luminaires and a piece of furniture. */
function sampleScene(): Scene {
  const sim = new Simulator({ catalog });
  sim.setSurface('floor', { texture: 'oak-planks', reflectance: 0.3 });
  sim.addLuminaire('test-track', { at: { x: 1, z: 0 }, aim: { tiltDeg: 30, panDeg: 90 } });
  sim.addLuminaire('test-pendant', { dimming: 0.5, on: false });
  sim.addFurniture('sofa', { at: { x: -1, z: 1 }, rotationDeg: 90, finish: { main: 'slate' } });
  return sim.scene;
}

/** The text of a file with this scene data, at this version. */
const fileWith = (scene: unknown, version: unknown = SCENE_FILE_VERSION) =>
  JSON.stringify({ format: SCENE_FILE_FORMAT, version, scene });

/** The problem parseScene reports for `text`, and its message. */
function failure(text: string): { problem: SceneFileProblem; message: string } {
  try {
    parseScene(text);
  } catch (error) {
    if (error instanceof SceneFileError) return { problem: error.problem, message: error.message };
    throw error;
  }
  throw new Error('parseScene accepted it');
}

describe('serializeScene and parseScene', () => {
  it('round-trip a scene', () => {
    const scene = sampleScene();
    const text = serializeScene(scene);
    expect(JSON.parse(text)).toMatchObject({ format: 'lux-studio-scene', version: 1 });
    expect(parseScene(text)).toEqual(scene);
    expect(SCENE_FILE_EXTENSION).toBe('.luxstudio.json');
  });

  it('keeps only the fields it knows', () => {
    const scene = sampleScene();
    const [first, ...rest] = scene.luminaires;
    const extended = {
      ...scene,
      notes: 'from another tool',
      luminaires: [{ ...first, colour: 'red' }, ...rest],
    };
    const read = parseScene(fileWith(extended));
    expect(read).not.toHaveProperty('notes');
    expect(read.luminaires[0]).not.toHaveProperty('colour');
  });

  it('tells other files apart from damaged scene files', () => {
    expect(failure('not json').problem).toBe('not-a-scene');
    expect(failure('{"name": "package.json"}').problem).toBe('not-a-scene');
    const newer = failure(fileWith(sampleScene(), 2));
    expect(newer.problem).toBe('newer-version');
    expect(newer.message).toMatch(/version 2.*up to 1/);
    expect(failure(fileWith(sampleScene(), 0.5)).problem).toBe('invalid');
  });

  it('names the first field that is missing, of the wrong type or out of range', () => {
    const scene = sampleScene();
    const [lamp, pendant] = scene.luminaires;
    const [sofa] = scene.furniture;
    const message = (broken: unknown) => failure(fileWith(broken)).message;
    const { floor, ceiling } = scene.room.surfaces;
    expect(
      failure(fileWith({ ...scene, room: { ...scene.room, surfaces: { floor, ceiling } } })),
    ).toEqual({
      problem: 'invalid',
      message: 'walls must be an object',
    });
    expect(message({ ...scene, luminaires: [lamp, { ...pendant, on: 'yes' }] })).toBe(
      'luminaires[1].on must be true or false',
    );
    expect(message({ ...scene, luminaires: [{ ...lamp, dimming: 3 }, pendant] })).toMatch(
      /dimming/,
    );
    expect(message({ ...scene, furniture: [{ ...sofa, kind: 'throne' }] })).toMatch(/throne/);
    expect(message({ ...scene, furniture: [{ ...sofa, id: lamp!.id }] })).toMatch(/share the id/);
    expect(message({ ...scene, furniture: null })).toBe('furniture must be a list');
  });

  it('upgrades files from older versions step by step', () => {
    // As if version 2 had added furniture: a version-1 file without any still opens.
    const { room, luminaires } = sampleScene();
    const addFurniture = (scene: unknown) => ({ ...(scene as object), furniture: [] });
    const scene = parseScene(fileWith({ room, luminaires }, 1), [addFurniture]);
    expect(scene.furniture).toEqual([]);
    expect(scene.luminaires).toEqual(luminaires);
  });
});

describe('unknownProducts', () => {
  it('lists the products a scene uses that the catalog lacks, each once', () => {
    const scene = sampleScene();
    const elsewhere = {
      ...scene,
      luminaires: scene.luminaires.map((l) => ({ ...l, productId: 'acme-spot' })),
    };
    expect(unknownProducts(scene, catalog)).toEqual([]);
    expect(unknownProducts(elsewhere, catalog)).toEqual(['acme-spot']);
  });
});

describe('Simulator.setScene', () => {
  it('replaces the scene as one undo step', () => {
    const sim = new Simulator({ catalog });
    sim.addLuminaire('test-recessed');
    const before = sim.scene;
    const opened = sampleScene();
    sim.setScene(opened);
    expect(sim.scene).toBe(opened);
    sim.undo();
    expect(sim.scene).toBe(before);
  });

  it('rejects an invalid scene, leaving the current one', () => {
    const sim = new Simulator({ catalog });
    const before = sim.scene;
    const { room } = sampleScene();
    expect(() =>
      sim.setScene({ room: { ...room, width: 0 }, luminaires: [], furniture: [] }),
    ).toThrow(/room.width/);
    expect(sim.scene).toBe(before);
    expect(sim.canUndo()).toBe(false);
  });
});
