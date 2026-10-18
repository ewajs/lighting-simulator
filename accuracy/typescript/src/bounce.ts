// Prints accuracy/BOUNCE.md: where Lux Studio's bounced light differs from
// Radiance's, and why (ADR 0070). Bounced light, total less direct, reads a
// little high in almost every room. The leading explanation: in Radiance a
// luminaire's glowing surface hides bounced light, as a black body would,
// while Lux Studio's luminaires hide nothing. This experiment gives each
// luminaire a black box the size of its IES opening, in bounced light only,
// and compares again; then it checks what's left against the patch size, and
// looks again at the sconce's split-openings step. An experiment, not a
// feature: core's calculation doesn't change. `npm run accuracy:bounce`
// bundles this with Vite and runs it in Node.
import {
  coveredByFurniture,
  DEFAULT_CALCULATION_OPTIONS,
  fixtureLayout,
  illuminanceAt,
  luminaireFrame,
  parseIes,
  type Blocker,
  type CalculationOptions,
  type Product,
  type SceneLight,
} from '@luxstudio/core';
// The radiosity's parts aren't core's API: an experiment assembles them its own way.
import { directIlluminance } from '../../../packages/core/src/analysis/direct';
import { boxPatches, roomPatches } from '../../../packages/core/src/analysis/patches';
import { formFactors, solveIndirectLight } from '../../../packages/core/src/analysis/radiosity';
import { boxVisibility } from '../../../packages/core/src/analysis/visibility';
import {
  compareReference,
  oursLx,
  radianceLx,
  referenceBoxes,
  referenceLight,
  referenceRoom,
  summarize,
  type PointComparison,
  type Reference,
} from './compare';
import { IES_FILES, REFERENCES } from './inputs';

/** A flat opening's box is this thick, in m: thin enough not to matter, thick enough to hit. */
const THIN_M = 0.0005;

/**
 * Each luminaire's body as a black box: its IES luminous opening, centred on
 * its light, turned as it is about the vertical. Tilt is left out: the tilted
 * luminaires are 10 cm spots. A round opening becomes the square of the same
 * area.
 */
function luminaireBodies(reference: Reference): Blocker[] {
  const room = referenceRoom(reference);
  return reference.room.luminaires.map((item) => {
    const { luminousOpening: opening } = parseIes(IES_FILES[item.ies]!);
    const product: Product = {
      id: item.ies,
      mount: 'recessed',
      power: 1,
      flux: 1,
      cct: 3000,
      beamDeg: 60,
    };
    const layout = fixtureLayout(product);
    const placed = {
      id: 'body',
      productId: item.ies,
      position: {
        x: item.origin.x - layout.lightOrigin.x,
        y: item.origin.y - layout.lightOrigin.y,
        z: item.origin.z - layout.lightOrigin.z,
      },
      aim: { tiltDeg: item.tiltDeg ?? 0, panDeg: item.panDeg ?? 0 },
      dimming: 1,
      on: true,
      cct: 3000,
    };
    const frame = luminaireFrame(placed, 'recessed', room, layout);
    const square = opening.round ? Math.sqrt(Math.PI) / 2 : 1;
    return {
      centre: frame.origin,
      half: {
        x: Math.max((opening.widthM * square) / 2, THIN_M),
        y: Math.max(opening.heightM / 2, THIN_M),
        z: Math.max((opening.lengthM * square) / 2, THIN_M),
      },
      // A box's own x axis is (cos, 0, −sin) of its yaw: along the frame's side.
      yawRad: Math.atan2(-frame.side.z, frame.side.x),
      reflectance: 0,
    };
  });
}

/**
 * The reference's light with each luminaire's body hiding bounced light: in
 * the patches' view of each other and the points' view of the patches, not in
 * the light leaving the luminaires.
 */
function lightWithBodies(reference: Reference, options: CalculationOptions): SceneLight {
  const base = referenceLight(reference, IES_FILES, options);
  const furniture = base.direct.blockers;
  const hiding = [...furniture, ...luminaireBodies(reference)];
  const room = referenceRoom(reference);
  const patches = [
    ...roomPatches(room, options.patchSizeM),
    ...furniture.flatMap((blocker) => boxPatches(blocker, options.patchSizeM)),
  ];
  const directOnPatches = patches.map(
    (patch) =>
      patch.samples.reduce(
        (sum, sample) =>
          sum + directIlluminance(sample, patch.normal, base.direct.sources, furniture),
        0,
      ) / patch.samples.length,
  );
  const factors = formFactors(patches, boxVisibility(hiding));
  return {
    direct: base.direct,
    indirect: solveIndirectLight(patches, factors, directOnPatches, options.tolerance, hiding),
  };
}

/** Every point of a reference against Radiance, with luminaire bodies hiding bounced light. */
function compareWithBodies(reference: Reference, options: CalculationOptions): PointComparison[] {
  const light = lightWithBodies(reference, options);
  const boxes = referenceBoxes(reference);
  return reference.points.map(({ surface, position, normal, direct, total }) => {
    const ours = illuminanceAt(light, position, normal);
    return {
      surface,
      position,
      radianceDirectLx: direct,
      radianceTotalLx: total,
      oursDirectLx: ours.directLx,
      oursTotalLx: ours.totalLx,
      covered: coveredByFurniture(position, normal, boxes),
    };
  });
}

/** Each surface's bounced-light average difference. */
function bouncedAverages(points: readonly PointComparison[]): Map<string, number> {
  const sums = new Map<string, { radiance: number; ours: number }>();
  for (const point of points) {
    const sum = sums.get(point.surface) ?? { radiance: 0, ours: 0 };
    sum.radiance += radianceLx(point, 'bounced');
    sum.ours += oursLx(point, 'bounced');
    sums.set(point.surface, sum);
  }
  return new Map([...sums].map(([surface, s]) => [surface, s.ours / s.radiance - 1]));
}

const signed = (value: number) => `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)} %`;
const percent = (value: number) => `${(value * 100).toFixed(2)} %`;
const mean = (values: readonly number[]) => values.reduce((s, v) => s + v, 0) / values.length;
const worstTotalAverage = (points: readonly PointComparison[], reference: Reference) =>
  Math.max(
    ...summarize(
      points,
      reference.room.luminaires.map((l) => l.origin),
      'total',
    ).map((s) => Math.abs(s.averageError)),
  );

// --- 1. The excess, and the luminaires' bodies. ---
const excessRows: string[] = [];
const asIsAll: number[] = [];
const bodiesAll: number[] = [];
for (const [name, reference] of Object.entries(REFERENCES)) {
  const asIs = bouncedAverages(compareReference(reference, IES_FILES));
  const bodies = bouncedAverages(compareWithBodies(reference, DEFAULT_CALCULATION_OPTIONS));
  for (const [surface, error] of asIs) {
    const withBodies = bodies.get(surface)!;
    asIsAll.push(error);
    bodiesAll.push(withBodies);
    excessRows.push(`| ${name} | ${surface} | ${signed(error)} | ${signed(withBodies)} |`);
  }
}

// --- 2. What's left, against the patch size. ---
const PATCHES_M = [0.5, 0.25, 0.125];
const patchRows = PATCHES_M.map((patchSizeM) => {
  const errors = Object.values(REFERENCES).flatMap((reference) => [
    ...bouncedAverages(
      compareWithBodies(reference, { ...DEFAULT_CALCULATION_OPTIONS, patchSizeM }),
    ).values(),
  ]);
  const size =
    patchSizeM === DEFAULT_CALCULATION_OPTIONS.patchSizeM ? `${patchSizeM} (default)` : patchSizeM;
  return (
    `| ${size} | ${signed(mean(errors))} | ${percent(mean(errors.map(Math.abs)))} | ` +
    `${percent(Math.max(...errors.map(Math.abs)))} |`
  );
});

// --- 3. The sconce's split-openings step. ---
const sconce = REFERENCES['wall-sconce']!;
const split = (splitOpenings: boolean) => ({ ...DEFAULT_CALCULATION_OPTIONS, splitOpenings });
const sconceRows = [
  [
    'As Lux Studio calculates',
    worstTotalAverage(compareReference(sconce, IES_FILES, split(false)), sconce),
    worstTotalAverage(compareReference(sconce, IES_FILES, split(true)), sconce),
  ],
  [
    'Luminaire bodies hide bounced light',
    worstTotalAverage(compareWithBodies(sconce, split(false)), sconce),
    worstTotalAverage(compareWithBodies(sconce, split(true)), sconce),
  ],
].map(
  ([label, whole, cells]) =>
    `| ${label} | ${percent(whole as number)} | ${percent(cells as number)} |`,
);

const lines = [
  '# Bounced light: where the difference comes from',
  '',
  'Generated by `npm run accuracy:bounce` (ADR 0070). Bounced light is total less direct,',
  "on both sides. An experiment: core's calculation is unchanged.",
  '',
  "## The excess, and the luminaires' bodies",
  '',
  "Each surface's bounced-light average against Radiance's: as Lux Studio calculates it,",
  "and with each luminaire's body (its IES opening, as a black box) hiding bounced light,",
  'as a glowing surface does in Radiance.',
  '',
  '| Room | Surface | As calculated | Bodies hide bounced light |',
  '|---|---|---|---|',
  ...excessRows,
  `| **Mean** | | ${signed(mean(asIsAll))} | ${signed(mean(bodiesAll))} |`,
  `| **Mean of the sizes** | | ${percent(mean(asIsAll.map(Math.abs)))} | ${percent(mean(bodiesAll.map(Math.abs)))} |`,
  '',
  "## What's left, against the patch size",
  '',
  "With the bodies hiding bounced light, over every room's surfaces. A bias that shrinks",
  "with the patches is the patches'; one that doesn't is elsewhere.",
  '',
  '| Patch size (m) | Mean difference | Mean size | Worst |',
  '|---|---|---|---|',
  ...patchRows,
  '',
  "## The sconce's split-openings step",
  '',
  "The worst total-light surface average, with the sconce's 23 × 13 × 51 cm box as one",
  'point and split into cells.',
  '',
  '| | One point | Split into cells |',
  '|---|---|---|',
  ...sconceRows,
];
console.log(lines.join('\n'));
