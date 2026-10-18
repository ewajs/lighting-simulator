// Prints accuracy/SOURCE-CELL.md: how the size of the cells a luminous
// opening is split into trades accuracy against time (ADR 0069). First
// against the exact illuminance of a glowing panel, which depends on neither
// Radiance nor the room description; then against Radiance over every
// reference room, furniture and all. It's the evidence for the default
// `sourceCellM` and for the choices the Analysis panel offers.
// `npm run accuracy:source-cell` bundles this with Vite and runs it in Node;
// the times are this machine's.
import {
  DEFAULT_CALCULATION_OPTIONS,
  DEFAULT_ROOM,
  fixtureLayout,
  illuminanceAt,
  luminaireFrame,
  sceneLight,
  type AnalysisSettings,
  type Luminaire,
  type Photometry,
  type Product,
} from '@luxstudio/core';
// The formula isn't part of core's API; its own tests use it the same way.
import { rectangleIlluminance } from '../../../packages/core/src/analysis/area-source';
import { brightPointsOff, compareReference, summarize, type Light } from './compare';
import { IES_FILES, REFERENCES } from './inputs';

/** The cell sizes compared, in m; the Analysis panel offers the same. */
const CELLS_M = [0.1, 0.05, 0.025];
/** A point "off" for the share of points: 10 %. */
const OFF = 0.1;

const percent = (value: number) => `${(value * 100).toFixed(2)} %`;
const signed = (value: number) => `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)} %`;
const label = (cellM: number) =>
  cellM === DEFAULT_CALCULATION_OPTIONS.sourceCellM
    ? `${cellM * 100} cm (default)`
    : `${cellM * 100} cm`;

// --- 1. A 60 × 60 cm Lambertian panel against the exact formula. ---

const PEAK_CD = 1000;
const SIDE_M = 0.6;
const DISTANCES_M = [0.05, 0.1, 0.2, 0.5, 1];
const AS_INSTALLED: AnalysisSettings = { workPlaneHeightM: 0, borderM: 0, maintenanceFactor: 1 };
const GAMMAS = Array.from({ length: 181 }, (_, i) => i);
const panel: Photometry = {
  verticalDeg: GAMMAS,
  horizontalDeg: [0],
  candela: [GAMMAS.map((g) => (g <= 90 ? PEAK_CD * Math.cos((g * Math.PI) / 180) : 0))],
  power: 10,
  luminousOpening: { widthM: SIDE_M, lengthM: SIDE_M, heightM: 0, round: false },
  keywords: {},
};
const product: Product = {
  id: 'panel',
  mount: 'recessed',
  power: 10,
  flux: 1,
  cct: 3000,
  beamDeg: 120,
};
const luminaire: Luminaire = {
  id: 'l',
  productId: 'panel',
  position: { x: 0, y: DEFAULT_ROOM.height, z: 0 },
  aim: { tiltDeg: 0, panDeg: 0 },
  dimming: 1,
  on: true,
  cct: 3000,
};
const origin = luminaireFrame(luminaire, 'recessed', DEFAULT_ROOM, fixtureLayout(product)).origin;
const inputs = {
  catalog: { get: (id: string) => (id === 'panel' ? product : undefined) },
  photometry: () => panel,
  modelFile: () => undefined,
};

/** One row of errors at each distance; `cellM` undefined: the opening as one point. */
function panelRow(cellM: number | undefined, name: string): string {
  const light = sceneLight(
    { room: DEFAULT_ROOM, luminaires: [luminaire], furniture: [] },
    inputs,
    AS_INSTALLED,
    {
      ...DEFAULT_CALCULATION_OPTIONS,
      sourceCellM: cellM ?? DEFAULT_CALCULATION_OPTIONS.sourceCellM,
      splitOpenings: cellM !== undefined,
      bouncedLight: false,
      furnitureInBouncedLight: false,
      luminaireBodies: false,
    },
  );
  const errors = DISTANCES_M.map((d) => {
    const { directLx } = illuminanceAt(light, { ...origin, y: origin.y - d }, { x: 0, y: 1, z: 0 });
    return signed(directLx / rectangleIlluminance(PEAK_CD, SIDE_M, SIDE_M, d) - 1);
  });
  return `| ${name} | ${errors.join(' | ')} |`;
}

// --- 2. Every reference room against Radiance. ---

/** The lights the study pools: bounced light is in BOUNCE.md (ADR 0070). */
type PooledLight = Exclude<Light, 'bounced'>;

interface Pooled {
  worstAverage: number;
  worstFar: number;
  worstNear: number;
  off: number;
  bright: number;
}

function roomsRow(cellM: number): {
  line: (light: PooledLight) => string;
  seconds: number;
  far: number[];
} {
  const options = { ...DEFAULT_CALCULATION_OPTIONS, sourceCellM: cellM };
  const pooled: Record<PooledLight, Pooled> = {
    direct: { worstAverage: 0, worstFar: 0, worstNear: 0, off: 0, bright: 0 },
    total: { worstAverage: 0, worstFar: 0, worstNear: 0, off: 0, bright: 0 },
  };
  const far: number[] = [];
  const start = performance.now();
  for (const reference of Object.values(REFERENCES)) {
    const points = compareReference(reference, IES_FILES, options);
    const origins = reference.room.luminaires.map((l) => l.origin);
    for (const light of ['direct', 'total'] as const) {
      const p = pooled[light];
      let roomFar = 0;
      for (const s of summarize(points, origins, light)) {
        p.worstAverage = Math.max(p.worstAverage, Math.abs(s.averageError));
        p.worstNear = Math.max(p.worstNear, s.worstNear);
        roomFar = Math.max(roomFar, s.worstFar);
      }
      p.worstFar = Math.max(p.worstFar, roomFar);
      const { off, bright } = brightPointsOff(points, light, OFF);
      p.off += off;
      p.bright += bright;
      if (light === 'direct') far.push(roomFar);
    }
  }
  const seconds = (performance.now() - start) / 1000;
  const line = (light: PooledLight) => {
    const p = pooled[light];
    return (
      `| ${label(cellM)} | ${percent(p.worstAverage)} | ${percent(p.worstFar)} | ` +
      `${percent(p.worstNear)} | ${p.off} of ${p.bright} (${percent(p.off / p.bright)}) |`
    );
  };
  return { line, seconds, far };
}

const rooms = Object.keys(REFERENCES);
const results = CELLS_M.map((cellM) => ({ cellM, ...roomsRow(cellM) }));
const head =
  '| Cell | Worst surface average | Worst far point | Worst near point | Bright points off by over 10 % |';

const lines = [
  '# Source cells: accuracy against time',
  '',
  'Generated by `npm run accuracy:source-cell` (ADR 0069). A luminaire whose luminous',
  'opening is larger than a cell is split into cells, each a point source (ADR 0057).',
  'Smaller cells make shadow edges and points close to large luminaires more exact,',
  'and take longer.',
  '',
  '## Against the exact value',
  '',
  'A 60 × 60 cm panel that glows evenly (Lambertian, 1000 cd straight down), against the',
  "exact illuminance below its centre (Howell's configuration factor B-3). This depends",
  'on neither Radiance nor the room description.',
  '',
  `| Cell | ${DISTANCES_M.map((d) => `${d} m below`).join(' | ')} |`,
  `|---|${DISTANCES_M.map(() => '---').join('|')}|`,
  panelRow(undefined, 'none (one point)'),
  ...CELLS_M.map((cellM) => panelRow(cellM, label(cellM))),
  '',
  'Within 1 % from two cells away; each halving cuts the error about four times.',
  '',
  '## Against Radiance, every reference room',
  '',
  'Furniture and all. Worst values over every room and surface; the points off are',
  'counted over every room. "Far" points are at least 1 m from every luminaire.',
  '',
  '### Direct light',
  '',
  head,
  '|---|---|---|---|---|',
  ...results.map((r) => r.line('direct')),
  '',
  '### Total light',
  '',
  head,
  '|---|---|---|---|---|',
  ...results.map((r) => r.line('total')),
  '',
  '### Time',
  '',
  'The whole calculation for every room, on the machine that ran it.',
  '',
  '| Cell | Time, all rooms (s) |',
  '|---|---|',
  ...results.map((r) => `| ${label(r.cellM)} | ${r.seconds.toFixed(1)} |`),
  '',
  '### Worst far point in direct light, room by room',
  '',
  `| Cell | ${rooms.join(' | ')} |`,
  `|---|${rooms.map(() => '---').join('|')}|`,
  ...results.map((r) => `| ${label(r.cellM)} | ${r.far.map(percent).join(' | ')} |`),
];
console.log(lines.join('\n'));
