import { describe, expect, it } from 'vitest';
import type { FixtureLayout } from '../fixture-layout';
import { luminaireFrame } from '../luminaire-frame';
import { totalFlux } from '../photometry/distribution';
import { catalog, isotropic, photometry, product, room } from '../test-fixtures';
import type {
  Aim,
  Furniture,
  Luminaire,
  MountType,
  Photometry,
  Product,
  Room,
  Scene,
  Vec3,
} from '../types';
import { analyseIlluminance, type IlluminanceAnalysis } from './analyse';
import { AnalysisCache } from './cache';
import { DEFAULT_CALCULATION_OPTIONS, type CalculationOptions } from './options';
import { DEFAULT_ANALYSIS_SETTINGS, type AnalysisInputs } from './settings';
import { directIlluminance } from './direct';
import { directLight } from './direct-light';
import { distributionOf, luminaireSources, type PointSource } from './sources';

const placed = (
  mount: MountType,
  position: Vec3,
  aim: Aim = { tiltDeg: 0, panDeg: 0 },
  extra: Partial<Luminaire> = {},
): Luminaire => ({
  id: `${mount}-${position.x}`,
  productId: `test-${mount}`,
  position,
  aim,
  dimming: 1,
  on: true,
  cct: 3000,
  ...extra,
});

/** Integration cells for the flux check, in m: fine enough for a sharp-edged beam to land within 1 %. */
const FLUX_CELL_M = 0.025;

/**
 * Light landing on the room's six surfaces, in lm: illuminance × area,
 * summed over FLUX_CELL_M cells (the midpoint rule). In a closed room with
 * nothing in it, every lumen a source emits lands somewhere, so this must
 * equal the sources' flux.
 */
function fluxOnRoom(sources: readonly PointSource[], { width, depth, height }: Room): number {
  const faces: { origin: Vec3; u: Vec3; v: Vec3; lu: number; lv: number; normal: Vec3 }[] = [
    { origin: { x: -width / 2, y: 0, z: -depth / 2 }, u: X, v: Z, lu: width, lv: depth, normal: Y },
    {
      origin: { x: -width / 2, y: height, z: -depth / 2 },
      u: X,
      v: Z,
      lu: width,
      lv: depth,
      normal: NEG_Y,
    },
    {
      origin: { x: -width / 2, y: 0, z: -depth / 2 },
      u: Z,
      v: Y,
      lu: depth,
      lv: height,
      normal: X,
    },
    {
      origin: { x: width / 2, y: 0, z: -depth / 2 },
      u: Z,
      v: Y,
      lu: depth,
      lv: height,
      normal: NEG_X,
    },
    {
      origin: { x: -width / 2, y: 0, z: -depth / 2 },
      u: X,
      v: Y,
      lu: width,
      lv: height,
      normal: Z,
    },
    {
      origin: { x: -width / 2, y: 0, z: depth / 2 },
      u: X,
      v: Y,
      lu: width,
      lv: height,
      normal: NEG_Z,
    },
  ];
  let lumens = 0;
  for (const { origin, u, v, lu, lv, normal } of faces) {
    const nu = Math.round(lu / FLUX_CELL_M);
    const nv = Math.round(lv / FLUX_CELL_M);
    const cellArea = (lu / nu) * (lv / nv);
    for (let i = 0; i < nu; i++) {
      for (let j = 0; j < nv; j++) {
        const a = ((i + 0.5) / nu) * lu;
        const b = ((j + 0.5) / nv) * lv;
        const point = {
          x: origin.x + u.x * a + v.x * b,
          y: origin.y + u.y * a + v.y * b,
          z: origin.z + u.z * a + v.z * b,
        };
        lumens += directIlluminance(point, normal, sources, []) * cellArea;
      }
    }
  }
  return lumens;
}
const X = { x: 1, y: 0, z: 0 };
const Y = { x: 0, y: 1, z: 0 };
const Z = { x: 0, y: 0, z: 1 };
const NEG_X = { x: -1, y: 0, z: 0 };
const NEG_Y = { x: 0, y: -1, z: 0 };
const NEG_Z = { x: 0, y: 0, z: -1 };

function sourcesFor(
  luminaire: Luminaire,
  item: Product,
  file: Photometry | undefined,
  layout: FixtureLayout,
): PointSource[] {
  const frame = luminaireFrame(luminaire, item.mount, room, layout);
  return luminaireSources(frame, distributionOf(item, file), file?.luminousOpening, 1);
}

// A distribution with light in every direction, different in each horizontal
// quarter and above and below: any slip in the frame, symmetry or angles
// moves light onto the wrong surface, but the total must still be right.
const UNEVEN = photometry(
  [0, 30, 60, 90, 120, 150, 180],
  [0, 90, 180, 270, 360],
  [
    [900, 1200, 700, 300, 150, 80, 40],
    [900, 600, 400, 250, 120, 60, 40],
    [900, 300, 200, 100, 90, 70, 40],
    [900, 500, 450, 350, 200, 100, 40],
    [900, 1200, 700, 300, 150, 80, 40],
  ],
);

describe('flux conservation: all the light lands on the room', () => {
  const at = { lightOrigin: { x: 0, y: 0, z: 0 } };

  it('for a bare 100 cd source in the middle: 4π · 100 = 1256.6 lm', () => {
    const sources = sourcesFor(
      placed('recessed', { x: 0, y: 1.35, z: 0 }),
      product('recessed'),
      isotropic(100),
      at,
    );
    expect(fluxOnRoom(sources, room) / (4 * Math.PI * 100)).toBeCloseTo(1, 3);
  });

  it('for an uneven distribution, tilted and panned near a corner', () => {
    const luminaire = placed('recessed', { x: 1.6, y: 2.2, z: -1.1 }, { tiltDeg: 55, panDeg: 140 });
    const sources = sourcesFor(luminaire, product('recessed'), UNEVEN, at);
    expect(fluxOnRoom(sources, room) / totalFlux(UNEVEN)).toBeCloseTo(1, 3);
  });

  it('for the same distribution on a wall, turned away from it', () => {
    // Held 0.3 m out from the wall at x = 2.5, so the light doesn't graze it.
    const luminaire = placed('wall', { x: 2.5, y: 1.8, z: 0.4 }, { tiltDeg: 0, panDeg: 20 });
    const sources = sourcesFor(luminaire, product('wall'), UNEVEN, {
      lightOrigin: { x: 0, y: 0, z: 0.3 },
    });
    expect(sources[0]!.position.x).toBeLessThan(2.5);
    expect(fluxOnRoom(sources, room) / totalFlux(UNEVEN)).toBeCloseTo(1, 3);
  });

  it('for an estimated 36° spot aimed at a wall: its 800 lm', () => {
    const spot = product('track');
    const luminaire = placed('track', { x: -1, y: 2.7, z: 0 }, { tiltDeg: 60, panDeg: -90 });
    const sources = sourcesFor(luminaire, spot, undefined, {
      lightOrigin: { x: 0, y: -0.15, z: 0 },
    });
    expect(fluxOnRoom(sources, room) / spot.flux).toBeCloseTo(1, 3);
  });

  it('for a 1.2 m linear opening split into cells', () => {
    const linear = isotropic(50, { widthM: 0.06, lengthM: 1.2, heightM: 0, round: false });
    const luminaire = placed('pendant', { x: 0, y: 1.9, z: 0 }, { tiltDeg: 0, panDeg: 30 });
    const sources = sourcesFor(luminaire, product('pendant'), linear, at);
    expect(sources).toHaveLength(12);
    expect(fluxOnRoom(sources, room) / (4 * Math.PI * 50)).toBeCloseTo(1, 3);
  });
});

describe('splitting a large opening', () => {
  const file = isotropic(100, { widthM: 0, lengthM: 1.2, heightM: 0, round: false });
  const point = (sources: PointSource[], below: number) =>
    directIlluminance({ x: 0, y: 2.7 - below, z: 0 }, Y, sources, []);
  const split = sourcesFor(placed('recessed', { x: 0, y: 2.7, z: 0 }), product('recessed'), file, {
    lightOrigin: { x: 0, y: 0, z: 0 },
  });
  const single = sourcesFor(
    placed('recessed', { x: 0, y: 2.7, z: 0 }),
    product('recessed'),
    isotropic(100),
    { lightOrigin: { x: 0, y: 0, z: 0 } },
  );

  it('matches a single point source far away: within 0.2 % at 10 m', () => {
    // The line formula below gives 100 / (10 · √100.36) = 0.99821 of the point's value there.
    expect(Math.abs(point(split, 10) / point(single, 10) - 1)).toBeLessThan(0.002);
  });

  it('matches the line source formula close up', () => {
    // A uniform line of length L and intensity I/L per metre, distance h below
    // its middle, on a plane facing it: E = (I / L) · ∫ h / (h² + s²)^{3/2} ds
    // over s ∈ [−L/2, L/2] = (I / L) · L / (h · √(h² + L²/4)) = I / (h · √(h² + L²/4)).
    const h = 0.6;
    const exact = 100 / (h * Math.sqrt(h * h + 0.36));
    expect(Math.abs(point(split, h) / exact - 1)).toBeLessThan(0.002);
    // A single point source would read 100 / 0.36 = 278 lx, 41 % too high.
    expect(point(single, h) / exact).toBeGreaterThan(1.4);
  });
});

describe('analyseIlluminance', () => {
  const ies: AnalysisInputs = {
    catalog,
    photometry: () => isotropic(100),
    modelFile: () => undefined,
  };
  const scene = (luminaires: Luminaire[]): Scene => ({ room, luminaires, furniture: [] });

  it('gives each surface its grid, values and figures, the work plane first', () => {
    const result = analyseIlluminance(scene([placed('recessed', { x: 0, y: 2.7, z: 0 })]), ies);
    expect(result.surfaces.map((surface) => surface.grid.surface)).toEqual([
      'work-plane',
      'floor',
      'ceiling',
      'wall-x-',
      'wall-x+',
      'wall-z-',
      'wall-z+',
    ]);
    for (const surface of result.surfaces) {
      expect(surface.illuminanceLx).toHaveLength(surface.grid.points.length);
      expect(surface.stats!.averageLx).toBeGreaterThan(0);
    }
    expect(result.settings).toBe(DEFAULT_ANALYSIS_SETTINGS);
  });

  it('multiplies by the maintenance factor', () => {
    const luminaires = [placed('recessed', { x: 0, y: 2.7, z: 0 })];
    const full = analyseIlluminance(scene(luminaires), ies, {
      ...DEFAULT_ANALYSIS_SETTINGS,
      maintenanceFactor: 1,
    });
    const maintained = analyseIlluminance(scene(luminaires), ies, DEFAULT_ANALYSIS_SETTINGS);
    expect(
      maintained.surfaces[0]!.stats!.averageLx / full.surfaces[0]!.stats!.averageLx,
    ).toBeCloseTo(0.8, 12);
  });

  it('counts dimming, and nothing from a luminaire switched off', () => {
    const on = analyseIlluminance(scene([placed('recessed', { x: 0, y: 2.7, z: 0 })]), ies);
    const dimmed = analyseIlluminance(
      scene([placed('recessed', { x: 0, y: 2.7, z: 0 }, undefined, { dimming: 0.25 })]),
      ies,
    );
    const off = analyseIlluminance(
      scene([placed('recessed', { x: 0, y: 2.7, z: 0 }, undefined, { on: false })]),
      ies,
    );
    expect(dimmed.surfaces[1]!.stats!.maxLx / on.surfaces[1]!.stats!.maxLx).toBeCloseTo(0.25, 12);
    expect(off.surfaces[1]!.stats!.maxLx).toBe(0);
  });

  it('names the luminaires lit by an estimate, and those it could not place', () => {
    const luminaires = [
      placed('recessed', { x: 0, y: 2.7, z: 0 }),
      { ...placed('track', { x: 1, y: 2.7, z: 0 }), productId: 'not-in-the-catalog' },
    ];
    const result = analyseIlluminance(scene(luminaires), { ...ies, photometry: () => undefined });
    expect(result.estimatedLuminaires).toEqual([luminaires[0]!.id]);
    expect(result.unknownLuminaires).toEqual([luminaires[1]!.id]);
  });

  it('refuses settings that don’t fit the room', () => {
    const empty = scene([]);
    const settings = DEFAULT_ANALYSIS_SETTINGS;
    expect(() => analyseIlluminance(empty, ies, { ...settings, workPlaneHeightM: 3 })).toThrow(
      /work plane/,
    );
    expect(() => analyseIlluminance(empty, ies, { ...settings, borderM: -1 })).toThrow(/border/);
    expect(() => analyseIlluminance(empty, ies, { ...settings, maintenanceFactor: 0 })).toThrow(
      /maintenance/,
    );
    expect(() => analyseIlluminance(empty, ies, { ...settings, maintenanceFactor: 1.2 })).toThrow(
      /maintenance/,
    );
  });

  it('leaves points covered by furniture out of the figures (ADR 0074)', () => {
    // A 1 × 0.35 × 2 m bookcase standing on the work plane: two of its grid
    // points fall inside it, where the light is 0. They made Emin and U₀ 0.
    const bookcase: Furniture = {
      id: 'b',
      kind: 'bookcase',
      position: { x: 0, y: 0, z: -0.9 },
      rotationDeg: 0,
      size: { width: 1, depth: 0.35, height: 2 },
      finish: { main: 'oak', accent: 'white' },
    };
    const luminaires = [placed('recessed', { x: 0, y: 2.7, z: 0 })];
    const result = analyseIlluminance({ room, luminaires, furniture: [bookcase] }, ies);
    const workPlane = result.surfaces[0]!;
    const covered = workPlane.illuminanceLx.filter((_, k) => workPlane.covered[k]);
    expect(covered).toEqual([0, 0]);
    expect(workPlane.stats!.minLx).toBeGreaterThan(0);
    const uncovered = workPlane.illuminanceLx.filter((_, k) => !workPlane.covered[k]);
    expect(workPlane.stats!.minLx).toBe(Math.min(...uncovered));
    // A surface with nothing on it covers nothing.
    expect(result.surfaces[2]!.covered.some(Boolean)).toBe(false);
  });

  it('has no figures for a work plane the border leaves empty', () => {
    const result = analyseIlluminance(scene([]), ies, { ...DEFAULT_ANALYSIS_SETTINGS, borderM: 3 });
    expect(result.surfaces[0]!.stats).toBeUndefined();
  });
});

describe('analyseIlluminance: bounced light', () => {
  const ies: AnalysisInputs = {
    catalog,
    photometry: () => isotropic(100),
    modelFile: () => undefined,
  };
  const one = [placed('recessed', { x: 0.5, y: 2.7, z: -0.3 })];
  const withReflectance = (rho: number): Room => ({
    ...room,
    surfaces: {
      floor: { color: '#808080', reflectance: rho },
      walls: { color: '#808080', reflectance: rho },
      ceiling: { color: '#808080', reflectance: rho },
    },
  });

  it('adds the room’s reflections to the direct light at every point', () => {
    const result = analyseIlluminance({ room, luminaires: one, furniture: [] }, ies);
    for (const surface of result.surfaces) {
      surface.illuminanceLx.forEach((total, k) => {
        expect(total).toBeCloseTo(surface.directLx[k]! + surface.indirectLx[k]!, 9);
        expect(surface.indirectLx[k]!).toBeGreaterThan(0);
      });
    }
    expect(result.indirect.patches).toBeGreaterThan(0);
    expect(result.indirect.iterations).toBeGreaterThan(1);
  });

  it('reflects nothing from a black room', () => {
    const result = analyseIlluminance(
      { room: withReflectance(0), luminaires: one, furniture: [] },
      ies,
    );
    for (const surface of result.surfaces) expect(Math.max(...surface.indirectLx)).toBe(0);
  });

  it('reflects more from lighter surfaces', () => {
    const average = (rho: number) =>
      analyseIlluminance(
        { room: withReflectance(rho), luminaires: one, furniture: [] },
        ies,
      ).surfaces[0]!.indirectLx.reduce((sum, value, _, all) => sum + value / all.length, 0);
    expect(average(0.7)).toBeGreaterThan(2 * average(0.4));
  });
});

describe('analyseIlluminance: features switched off', () => {
  const ies: AnalysisInputs = {
    catalog,
    photometry: () => isotropic(100, { widthM: 0, lengthM: 1.2, heightM: 0, round: false }),
    modelFile: () => undefined,
  };
  const sofa: Furniture = {
    id: 'sofa',
    kind: 'sofa',
    position: { x: 0, y: 0, z: 0 },
    rotationDeg: 0,
    size: { width: 2, depth: 1, height: 0.8 },
    finish: { main: 'oak', accent: 'oak' },
  };
  const scene: Scene = {
    room,
    luminaires: [placed('recessed', { x: 0, y: 2.7, z: 0 })],
    furniture: [sofa],
  };
  const withOptions = (changes: Partial<CalculationOptions>) =>
    analyseIlluminance(scene, ies, DEFAULT_ANALYSIS_SETTINGS, {
      ...DEFAULT_CALCULATION_OPTIONS,
      ...changes,
    });
  /** The floor point straight under the light, which the sofa hides. */
  const underLight = (result: IlluminanceAnalysis) => {
    const floor = result.surfaces[1]!;
    const k = floor.grid.points.findIndex((p) => Math.hypot(p.x, p.z) < 0.2);
    return { direct: floor.directLx[k]!, indirect: floor.indirectLx[k]! };
  };

  it('counts everything by default', () => {
    const result = withOptions({});
    expect(underLight(result).direct).toBe(0);
    expect(result.indirect.patches).toBeGreaterThan(0);
  });

  it('without bounced light: no patches, and nothing indirect anywhere', () => {
    const result = withOptions({
      bouncedLight: false,
      furnitureInBouncedLight: false,
      luminaireBodies: false,
    });
    expect(result.indirect).toEqual({ patches: 0, iterations: 0 });
    for (const surface of result.surfaces) expect(Math.max(...surface.indirectLx)).toBe(0);
    expect(result.surfaces[0]!.directLx).toEqual(withOptions({}).surfaces[0]!.directLx);
  });

  it('without furniture shadows: light reaches the floor under the sofa', () => {
    expect(
      underLight(withOptions({ furnitureShadows: false, furnitureInBouncedLight: false })).direct,
    ).toBeGreaterThan(0);
  });

  it('without split openings: each luminaire is one point of light', () => {
    const sources = (splitOpenings: boolean) =>
      directLight(scene, ies, DEFAULT_ANALYSIS_SETTINGS, {
        ...DEFAULT_CALCULATION_OPTIONS,
        splitOpenings,
      }).sources;
    // The 1.2 m line in 10 cm cells, or not split at all.
    expect(sources(true)).toHaveLength(12);
    expect(sources(false)).toHaveLength(1);
    // At the light's origin, which the placeholder fixture puts 3 cm below the ceiling.
    expect(sources(false)[0]!.position.x).toBe(0);
    expect(sources(false)[0]!.position.y).toBeCloseTo(2.67, 12);
  });

  it('refuses sizes and tolerances out of range', () => {
    expect(() => withOptions({ patchSizeM: 0 })).toThrow(/patchSizeM/);
    expect(() => withOptions({ sourceCellM: Number.NaN })).toThrow(/sourceCellM/);
    expect(() => withOptions({ tolerance: 1 })).toThrow(/tolerance/);
  });

  it('refuses luminaire bodies without bounced light', () => {
    expect(() => withOptions({ bouncedLight: false, furnitureInBouncedLight: false })).toThrow(
      /luminaireBodies needs/,
    );
  });

  it('refuses furniture in bounced light without bounced light or furniture shadows', () => {
    expect(() => withOptions({ bouncedLight: false })).toThrow(/furnitureInBouncedLight needs/);
    expect(() => withOptions({ furnitureShadows: false })).toThrow(/furnitureInBouncedLight needs/);
  });

  it('with furniture in bounced light: a lighter table reflects more onto the ceiling', () => {
    const table = (main: 'white' | 'charcoal'): Scene => ({
      ...scene,
      furniture: [
        {
          ...sofa,
          id: 'table',
          kind: 'dining-table',
          size: { width: 1.6, depth: 0.9, height: 0.75 },
          finish: { main, accent: main },
        },
      ],
    });
    const ceilingIndirect = (main: 'white' | 'charcoal') => {
      const ceiling = analyseIlluminance(table(main), ies).surfaces[2]!;
      return ceiling.indirectLx.reduce((sum, value) => sum + value, 0);
    };
    expect(ceilingIndirect('white')).toBeGreaterThan(1.05 * ceilingIndirect('charcoal'));
  });

  it('with furniture in bounced light: the floor under the sofa gets nothing bounced either', () => {
    // The sofa covers the floor point, so no patch is in sight of it.
    expect(underLight(withOptions({})).indirect).toBe(0);
    expect(underLight(withOptions({ furnitureInBouncedLight: false })).indirect).toBeGreaterThan(0);
  });
});

describe('analyseIlluminance: luminaire bodies (ADR 0075)', () => {
  // A 60 × 60 cm flat panel shining down only, its light 3 cm under the
  // ceiling: its body hides the ceiling right above it from the room.
  const downOnly = photometry([0, 89, 90, 180], [0], [[100, 100, 0, 0]], {
    widthM: 0.6,
    lengthM: 0.6,
    heightM: 0,
    round: false,
  });
  const panel: AnalysisInputs = { catalog, photometry: () => downOnly, modelFile: () => undefined };
  const luminaire = placed('recessed', { x: 0, y: 2.7, z: 0 });
  const analyse = (luminaireBodies: boolean, luminaires = [luminaire], cache?: AnalysisCache) =>
    analyseIlluminance(
      { room, luminaires, furniture: [] },
      panel,
      DEFAULT_ANALYSIS_SETTINGS,
      { ...DEFAULT_CALCULATION_OPTIONS, luminaireBodies },
      cache,
    );
  /** The bounced light at the ceiling point nearest a spot. */
  const ceilingAt = (result: IlluminanceAnalysis, x: number, z: number) => {
    const ceiling = result.surfaces[2]!;
    const k = ceiling.grid.points.reduce(
      (best, p, i) =>
        Math.hypot(p.x - x, p.z - z) <
        Math.hypot(ceiling.grid.points[best]!.x - x, ceiling.grid.points[best]!.z - z)
          ? i
          : best,
      0,
    );
    return ceiling.indirectLx[k]!;
  };

  it('hide the ceiling above a panel from the room, and barely matter far from it', () => {
    const [off, on] = [analyse(false), analyse(true)];
    expect(ceilingAt(on, 0, 0)).toBeLessThan(0.2 * ceilingAt(off, 0, 0));
    expect(ceilingAt(on, 2, 1.5) / ceilingAt(off, 2, 1.5)).toBeGreaterThan(0.97);
  });

  it('are part of the room: moving a luminaire recalculates it, dimming one doesn’t', () => {
    const cache = new AnalysisCache();
    analyse(true, [luminaire], cache);
    analyse(true, [{ ...luminaire, dimming: 0.5 }], cache);
    expect(cache.stats).toEqual({ hits: 1, misses: 1 });
    analyse(true, [{ ...luminaire, position: { x: 1, y: 2.7, z: 0 } }], cache);
    expect(cache.stats.misses).toBe(2);
  });

  it('come from luminous openings only: a point source has none', () => {
    const point = analyseIlluminance(
      { room, luminaires: [luminaire], furniture: [] },
      { ...panel, photometry: () => isotropic(100) },
    );
    const pointOff = analyseIlluminance(
      { room, luminaires: [luminaire], furniture: [] },
      { ...panel, photometry: () => isotropic(100) },
      DEFAULT_ANALYSIS_SETTINGS,
      { ...DEFAULT_CALCULATION_OPTIONS, luminaireBodies: false },
    );
    expect(ceilingAt(point, 0, 0)).toBe(ceilingAt(pointOff, 0, 0));
  });
});
