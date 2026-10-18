// Lux Studio's illuminance with the demo's real manufacturer files (ADR 0057,
// 0058): values read by hand from a file, and conservation of each file's
// flux. Core's own tests prove the maths with made-up data; these show it holds
// for real files, next to the Radiance comparison that uses the same files.
import {
  DEFAULT_DAYLIGHT,
  DEFAULT_ROOM,
  directIlluminance,
  directLight,
  parseIes,
  totalFlux,
  type AnalysisInputs,
  type Catalog,
  type Luminaire,
  type Photometry,
  type PointSource,
  type Product,
  type Room,
  type Vec3,
} from '@luxstudio/core';
import { describe, expect, it } from 'vitest';
import { IES_FILES } from './inputs';

/** The demo's five files by the product ids the demo gives them. */
const PRODUCT_FILES: Record<string, string> = {
  'ies-downlight': 'LX6C15D010-EX6C159030-6LBMH.ies',
  'ies-track-spot': 'qg63_b35q.ies',
  'ies-linear-pendant': 'HP-2-ID-4ft-H-B-835-ITL85132.008.ies',
  'ies-wall-washer': 'C3L10935NZ10U-C3RLWCC.ies',
  'ies-wall-up-down': 'CB3326-L35K-H.ies',
};

const FILES: Record<string, Photometry> = Object.fromEntries(
  Object.entries(PRODUCT_FILES).map(([id, file]) => [id, parseIes(IES_FILES[file]!)]),
);

/** Each as a recessed product: its light 3 cm below the fixture, turned only by its aim. */
const catalog: Catalog = {
  get: (id): Product | undefined =>
    id in FILES
      ? { id, mount: 'recessed', power: 1, flux: totalFlux(FILES[id]!), cct: 3000, beamDeg: 60 }
      : undefined,
};

const room: Room = DEFAULT_ROOM;
const UP: Vec3 = { x: 0, y: 1, z: 0 };
const FULL = { workPlaneHeightM: 0.8, borderM: 0.5, maintenanceFactor: 1 };

const placed = (productId: string, position: Vec3, tiltDeg = 0, panDeg = 0): Luminaire => ({
  id: productId,
  productId,
  position,
  aim: { tiltDeg, panDeg },
  dimming: 1,
  on: true,
  cct: 3000,
});

/** The products and their IES files, with no models: lights at the placeholders' positions. */
const inputs: AnalysisInputs = {
  catalog,
  photometry: (id) => FILES[id],
  modelFile: () => undefined,
};

describe('the Cooper downlight, by hand from its file', () => {
  // Its light sits 3 cm below the fixture (the placeholder's and the model's
  // `light` node): placed at 2.73 m, it shines from 2.70 m above the floor.
  const light = directLight(
    {
      room,
      luminaires: [placed('ies-downlight', { x: 0, y: 2.73, z: 0 })],
      furniture: [],
      windows: [],
      daylight: DEFAULT_DAYLIGHT,
    },
    inputs,
    FULL,
  );
  const at = (x: number) => directIlluminance({ x, y: 0, z: 0 }, UP, light.sources, light.blockers);

  // Its 15 cm opening is split into four cells 5.4 cm off centre (sources.ts),
  // each of which sees these points about 1° off where a single point would,
  // so the values land within 0.3 % of the single-point hand values.
  const WITHIN = 0.003;

  it('gives I(0°) / h² straight below: 1142.1 / 2.7² = 156.67 lx', () => {
    expect(Math.abs(at(0) / (1142.1 / 2.7 ** 2) - 1)).toBeLessThan(WITHIN);
  });

  it('gives I(θ) · cos θ / d² 1 m to the side: 98.15 lx', () => {
    // θ = atan(1 / 2.7) = 20.32°, between the file's 873.4 cd at 20° and 828.9 cd
    // at 22.5°: I = 867.65 cd. d² = 1 + 2.7² = 8.29, cos θ = 2.7 / √8.29.
    const expected = (867.648 * (2.7 / Math.sqrt(8.29))) / 8.29;
    expect(Math.abs(at(1) / expected - 1)).toBeLessThan(WITHIN);
  });
});

/** Integration cells for the flux check, in m: these files land within 0.06 % at this size. */
const FLUX_CELL_M = 0.05;
const AXES = { x: { x: 1, y: 0, z: 0 }, y: UP, z: { x: 0, y: 0, z: 1 } };

/** Light landing on the room's six surfaces, in lm: illuminance × area over FLUX_CELL_M cells. */
function fluxOnRoom(sources: readonly PointSource[]): number {
  const { width: w, depth: d, height: h } = room;
  const neg = (v: Vec3) => ({ x: -v.x, y: -v.y, z: -v.z });
  const faces = [
    { origin: { x: -w / 2, y: 0, z: -d / 2 }, u: AXES.x, v: AXES.z, lu: w, lv: d, n: AXES.y },
    { origin: { x: -w / 2, y: h, z: -d / 2 }, u: AXES.x, v: AXES.z, lu: w, lv: d, n: neg(AXES.y) },
    { origin: { x: -w / 2, y: 0, z: -d / 2 }, u: AXES.z, v: AXES.y, lu: d, lv: h, n: AXES.x },
    { origin: { x: w / 2, y: 0, z: -d / 2 }, u: AXES.z, v: AXES.y, lu: d, lv: h, n: neg(AXES.x) },
    { origin: { x: -w / 2, y: 0, z: -d / 2 }, u: AXES.x, v: AXES.y, lu: w, lv: h, n: AXES.z },
    { origin: { x: -w / 2, y: 0, z: d / 2 }, u: AXES.x, v: AXES.y, lu: w, lv: h, n: neg(AXES.z) },
  ];
  let lumens = 0;
  for (const { origin, u, v, lu, lv, n } of faces) {
    const nu = Math.round(lu / FLUX_CELL_M);
    const nv = Math.round(lv / FLUX_CELL_M);
    const area = (lu / nu) * (lv / nv);
    for (let i = 0; i < nu; i++) {
      for (let j = 0; j < nv; j++) {
        const a = ((i + 0.5) / nu) * lu;
        const b = ((j + 0.5) / nv) * lv;
        const point = {
          x: origin.x + u.x * a + v.x * b,
          y: origin.y + u.y * a + v.y * b,
          z: origin.z + u.z * a + v.z * b,
        };
        lumens += directIlluminance(point, n, sources, []) * area;
      }
    }
  }
  return lumens;
}

describe('each real file’s flux lands on the room', () => {
  // Hung mid-room so no surface is closer than the 5 × 10 cm the cells are good for.
  const aims = [
    [0, 0],
    [40, 65],
    [80, -150],
  ] as const;
  for (const id of Object.keys(FILES)) {
    it(`${id}, at every aim: illuminance × area adds up to the file's flux`, () => {
      const file = FILES[id]!;
      for (const [tilt, pan] of aims) {
        const position =
          id === 'ies-wall-up-down' ? { x: 0.6, y: 1.35, z: -0.4 } : { x: 0.3, y: 1.35, z: 0.2 };
        const light = directLight(
          {
            room,
            luminaires: [placed(id, position, tilt, pan)],
            furniture: [],
            windows: [],
            daylight: DEFAULT_DAYLIGHT,
          },
          inputs,
          FULL,
        );
        expect(Math.abs(fluxOnRoom(light.sources) / totalFlux(file) - 1)).toBeLessThan(0.002);
      }
    });
  }
});
