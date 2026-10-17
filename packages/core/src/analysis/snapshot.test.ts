import { describe, expect, it } from 'vitest';
import { catalog, isotropic, room } from '../test-fixtures';
import type { Luminaire, Scene } from '../types';
import { analyseIlluminance } from './analyse';
import { analysisSnapshot, snapshotInputs } from './snapshot';
import type { AnalysisInputs } from './settings';

const luminaire = (id: string, productId: string): Luminaire => ({
  id,
  productId,
  position: { x: 0, y: 2.7, z: 0 },
  aim: { tiltDeg: 0, panDeg: 0 },
  dimming: 1,
  on: true,
  cct: 3000,
});
const scene: Scene = {
  room,
  luminaires: [
    luminaire('a', 'test-recessed'),
    luminaire('b', 'test-recessed'),
    luminaire('c', 'not-in-the-catalog'),
  ],
  furniture: [],
};
const model = new ArrayBuffer(8);
const inputs: AnalysisInputs = {
  catalog,
  photometry: (id) => (id === 'test-recessed' ? isotropic(100) : undefined),
  modelFile: (id) => (id === 'test-recessed' ? model : undefined),
};

describe('analysisSnapshot', () => {
  const snapshot = analysisSnapshot(scene, inputs);

  it('holds each product the scene uses once, with what has loaded for it', () => {
    expect(snapshot.products.map((p) => p.id)).toEqual(['test-recessed']);
    expect(Object.keys(snapshot.photometry)).toEqual(['test-recessed']);
    expect(snapshot.modelFiles['test-recessed']).toBe(model);
  });

  it('survives a structured clone, as a Web Worker receives it', () => {
    expect(structuredClone(snapshot)).toEqual(snapshot);
  });

  it('gives the same calculation back through snapshotInputs', () => {
    // The model file here isn't a real one, so both fall back to the placeholder.
    const direct = analyseIlluminance(scene, inputs);
    const through = analyseIlluminance(scene, snapshotInputs(structuredClone(snapshot)));
    expect(through.surfaces.map((s) => s.illuminanceLx)).toEqual(
      direct.surfaces.map((s) => s.illuminanceLx),
    );
    expect(through.unknownLuminaires).toEqual(['c']);
  });
});
