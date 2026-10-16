import { describe, expect, it } from 'vitest';
import type { FixtureLayout } from '../fixture-layout';
import { luminaireFrame } from '../luminaire-frame';
import { totalFlux } from '../photometry/distribution';
import { catalog, isotropic, photometry, product, room } from '../test-fixtures';
import type { Aim, Luminaire, MountType, Photometry, Product, Room, Scene, Vec3 } from '../types';
import { analyseDirect, DEFAULT_ANALYSIS_SETTINGS, type AnalysisInputs } from './analyse-direct';
import { directIlluminance } from './direct';
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

describe('analyseDirect', () => {
  const ies: AnalysisInputs = {
    catalog,
    photometry: () => isotropic(100),
    modelFile: () => undefined,
  };
  const scene = (luminaires: Luminaire[]): Scene => ({ room, luminaires, furniture: [] });

  it('gives each surface its grid, values and figures, the work plane first', () => {
    const result = analyseDirect(scene([placed('recessed', { x: 0, y: 2.7, z: 0 })]), ies);
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
    const full = analyseDirect(scene(luminaires), ies, {
      ...DEFAULT_ANALYSIS_SETTINGS,
      maintenanceFactor: 1,
    });
    const maintained = analyseDirect(scene(luminaires), ies, DEFAULT_ANALYSIS_SETTINGS);
    expect(
      maintained.surfaces[0]!.stats!.averageLx / full.surfaces[0]!.stats!.averageLx,
    ).toBeCloseTo(0.8, 12);
  });

  it('counts dimming, and nothing from a luminaire switched off', () => {
    const on = analyseDirect(scene([placed('recessed', { x: 0, y: 2.7, z: 0 })]), ies);
    const dimmed = analyseDirect(
      scene([placed('recessed', { x: 0, y: 2.7, z: 0 }, undefined, { dimming: 0.25 })]),
      ies,
    );
    const off = analyseDirect(
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
    const result = analyseDirect(scene(luminaires), { ...ies, photometry: () => undefined });
    expect(result.estimatedLuminaires).toEqual([luminaires[0]!.id]);
    expect(result.unknownLuminaires).toEqual([luminaires[1]!.id]);
  });

  it('refuses settings that don’t fit the room', () => {
    const empty = scene([]);
    const settings = DEFAULT_ANALYSIS_SETTINGS;
    expect(() => analyseDirect(empty, ies, { ...settings, workPlaneHeightM: 3 })).toThrow(
      /work plane/,
    );
    expect(() => analyseDirect(empty, ies, { ...settings, borderM: -1 })).toThrow(/border/);
    expect(() => analyseDirect(empty, ies, { ...settings, maintenanceFactor: 0 })).toThrow(
      /maintenance/,
    );
    expect(() => analyseDirect(empty, ies, { ...settings, maintenanceFactor: 1.2 })).toThrow(
      /maintenance/,
    );
  });

  it('has no figures for a work plane the border leaves empty', () => {
    const result = analyseDirect(scene([]), ies, { ...DEFAULT_ANALYSIS_SETTINGS, borderM: 3 });
    expect(result.surfaces[0]!.stats).toBeUndefined();
  });
});
