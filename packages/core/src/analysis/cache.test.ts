// The cache must never change a result (ADR 0065): every figure with it is
// the same as without it, whatever changed between calculations.
import { describe, expect, it } from 'vitest';
import { catalog, isotropic, room } from '../test-fixtures';
import type { Furniture, Luminaire, Scene } from '../types';
import { analyseIlluminance, type IlluminanceAnalysis } from './analyse';
import { AnalysisCache } from './cache';
import { DEFAULT_CALCULATION_OPTIONS } from './options';
import { DEFAULT_ANALYSIS_SETTINGS, type AnalysisInputs } from './settings';
import { DEFAULT_DAYLIGHT } from '../daylight';

const inputs: AnalysisInputs = {
  catalog,
  photometry: () => isotropic(100, { widthM: 0, lengthM: 0.6, heightM: 0, round: false }),
  modelFile: () => undefined,
};
const luminaire = (x: number, dimming = 1): Luminaire => ({
  id: `l${x}`,
  productId: 'test-recessed',
  position: { x, y: 2.7, z: 0 },
  aim: { tiltDeg: 0, panDeg: 0 },
  dimming,
  on: true,
  cct: 3000,
});
const table = (x: number): Furniture => ({
  id: 'table',
  kind: 'dining-table',
  position: { x, y: 0, z: 0.3 },
  rotationDeg: 20,
  size: { width: 1.6, depth: 0.9, height: 0.75 },
  finish: { main: 'oak', accent: 'oak' },
});
const scene = (changes: Partial<Scene> = {}): Scene => ({
  room,
  luminaires: [luminaire(-1), luminaire(1)],
  furniture: [table(0)],
  windows: [],
  daylight: DEFAULT_DAYLIGHT,
  ...changes,
});
const values = (analysis: IlluminanceAnalysis) => analysis.surfaces.map((s) => s.illuminanceLx);
const uncached = (s: Scene) => values(analyseIlluminance(s, inputs));
const run = (cache: AnalysisCache, s: Scene) =>
  values(
    analyseIlluminance(s, inputs, DEFAULT_ANALYSIS_SETTINGS, DEFAULT_CALCULATION_OPTIONS, cache),
  );

describe('AnalysisCache', () => {
  it('gives exactly the results of a calculation without it', () => {
    expect(run(new AnalysisCache(), scene())).toEqual(uncached(scene()));
  });

  it('reuses the room’s work when only the light changes, with the same results', () => {
    const cache = new AnalysisCache();
    run(cache, scene());
    const dimmed = scene({ luminaires: [luminaire(-1, 0.4), luminaire(1.5)] });
    expect(run(cache, dimmed)).toEqual(uncached(dimmed));
    expect(cache.stats).toEqual({ hits: 1, misses: 1 });
  });

  it('reuses it when a surface’s reflectance changes: only the solve uses it', () => {
    const cache = new AnalysisCache();
    run(cache, scene());
    const darker = scene({
      room: { ...room, surfaces: { ...room.surfaces, walls: { color: '#444', reflectance: 0.3 } } },
    });
    expect(run(cache, darker)).toEqual(uncached(darker));
    expect(cache.stats.hits).toBe(1);
  });

  it('starts again when furniture moves or the room changes size', () => {
    const cache = new AnalysisCache();
    run(cache, scene());
    const moved = scene({ furniture: [table(0.5)] });
    expect(run(cache, moved)).toEqual(uncached(moved));
    const wider = scene({ room: { ...room, width: room.width + 1 } });
    expect(run(cache, wider)).toEqual(uncached(wider));
    expect(cache.stats).toEqual({ hits: 0, misses: 3 });
  });

  it('keeps grid views per work plane: a new height is calculated, the same results either way', () => {
    const cache = new AnalysisCache();
    run(cache, scene());
    const settings = { ...DEFAULT_ANALYSIS_SETTINGS, workPlaneHeightM: 0.75 };
    const higher = analyseIlluminance(
      scene(),
      inputs,
      settings,
      DEFAULT_CALCULATION_OPTIONS,
      cache,
    );
    expect(values(higher)).toEqual(values(analyseIlluminance(scene(), inputs, settings)));
  });
});
