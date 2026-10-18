// Data for the Concepts pages on light and the inverse-square law (ADR 0059):
// computed by Lux Studio's own core from the demo's real IES files, when the
// manual is built. The pages draw it; nothing is computed in the browser.
import { defineLoader } from 'vitepress';
import {
  beamAngleDeg,
  candelaAt,
  directIlluminance,
  directLight,
  parseIes,
  type Catalog,
  type LuminousOpening,
  type Photometry,
  type Product,
  type Room,
  type Vec3,
} from './core';
import { IES_FILES, iesText } from './files';

/** A point on a chart: x, then y. */
export type XY = [number, number];

/** One luminaire's polar chart: intensity round each of its two main planes. */
export interface PolarChart {
  readonly key: keyof typeof IES_FILES;
  /** The plane through 0° and 180°, then the one through 90° and 270°: angle from straight down (negative on the 180° or 270° side), cd. */
  readonly planes: readonly [XY[], XY[]];
  readonly peakCd: number;
  readonly beamDeg: number;
}

/** Everything the light pages draw. */
export interface LightData {
  readonly polar: readonly PolarChart[];
  /** Straight below the Cooper downlight: distance in m, lux. */
  readonly falloff: readonly XY[];
  /** Across the floor 2.7 m below it: position in m, lux; then without the cosine (I / d² alone). */
  readonly floor: readonly [XY[], XY[]];
  /** Below the middle of a 1.2 m line of light: the exact formula, Lux Studio's split cells, a single point. */
  readonly line: readonly [XY[], XY[], XY[]];
  /** The Cooper downlight's intensity straight down, in cd: for the pages' worked examples. */
  readonly downlightNadirCd: number;
}

declare const data: LightData;
export { data };

/** Angular step for the polar charts, in degrees. */
const POLAR_STEP_DEG = 2.5;
/** The ceiling height the floor profile is drawn for, in m: the demo's rooms. */
const CEILING_M = 2.7;
/** The line source: 100 cd from 1.2 m of length, the demo's linear pendant's length. */
const LINE = { cd: 100, lengthM: 1.2 };

const UP: Vec3 = { x: 0, y: 1, z: 0 };
const ROOM: Room = {
  width: 20,
  depth: 20,
  height: 10,
  surfaces: {
    floor: { color: '#808080', reflectance: 0.5 },
    walls: { color: '#808080', reflectance: 0.5 },
    ceiling: { color: '#808080', reflectance: 0.5 },
  },
};
/** No maintenance factor and no border: the light as installed. */
const AS_INSTALLED = { workPlaneHeightM: 0, borderM: 0, maintenanceFactor: 1 };

export default defineLoader({
  load(): LightData {
    const files = Object.fromEntries(
      Object.keys(IES_FILES).map((key) => [key, parseIes(iesText(key as keyof typeof IES_FILES))]),
    ) as Record<keyof typeof IES_FILES, Photometry>;
    const downlight = files.downlight;
    return {
      polar: (Object.keys(files) as (keyof typeof IES_FILES)[]).map((key) =>
        polarChart(key, files[key]),
      ),
      falloff: falloff(downlight),
      floor: floorProfile(downlight),
      line: lineSource(),
      downlightNadirCd: candelaAt(downlight, 0, 0),
    };
  },
});

function polarChart(key: keyof typeof IES_FILES, photometry: Photometry): PolarChart {
  const plane = (positive: number, negative: number): XY[] => {
    const points: XY[] = [];
    for (let v = 180; v >= 0; v -= POLAR_STEP_DEG)
      points.push([-v, candelaAt(photometry, v, negative)]);
    for (let v = POLAR_STEP_DEG; v <= 180; v += POLAR_STEP_DEG)
      points.push([v, candelaAt(photometry, v, positive)]);
    return points;
  };
  const planes: [XY[], XY[]] = [plane(0, 180), plane(90, 270)];
  const peakCd = Math.max(...planes.flat().map(([, cd]) => cd));
  return { key, planes, peakCd, beamDeg: beamAngleDeg(photometry) };
}

/** One luminaire whose light leaves from `origin`, aimed straight down, as core computes it. */
function lightAt(origin: Vec3, photometry: Photometry) {
  const product: Product = {
    id: 'p',
    mount: 'recessed',
    power: 1,
    flux: 1,
    cct: 3000,
    beamDeg: 60,
  };
  const catalog: Catalog = { get: () => product };
  // A recessed fixture's light sits 3 cm below it (fixture-layout.ts).
  const luminaire = {
    id: 'l',
    productId: 'p',
    position: { x: origin.x, y: origin.y + 0.03, z: origin.z },
    aim: { tiltDeg: 0, panDeg: 0 },
    dimming: 1,
    on: true,
    cct: 3000,
  };
  const light = directLight(
    { room: ROOM, luminaires: [luminaire], furniture: [], windows: [] },
    { catalog, photometry: () => photometry, modelFile: () => undefined },
    AS_INSTALLED,
  );
  return (point: Vec3) => directIlluminance(point, UP, light.sources, light.blockers);
}

function falloff(photometry: Photometry): XY[] {
  const top = 8;
  const at = lightAt({ x: 0, y: top, z: 0 }, photometry);
  const points: XY[] = [];
  for (let d = 0.5; d <= 5.001; d += 0.1) points.push([d, at({ x: 0, y: top - d, z: 0 })]);
  return points;
}

function floorProfile(photometry: Photometry): [XY[], XY[]] {
  const at = lightAt({ x: 0, y: CEILING_M, z: 0 }, photometry);
  const actual: XY[] = [];
  const withoutCosine: XY[] = [];
  for (let x = -3; x <= 3.001; x += 0.05) {
    actual.push([x, at({ x, y: 0, z: 0 })]);
    const distanceSquared = x * x + CEILING_M * CEILING_M;
    const angleDeg = (Math.atan2(Math.abs(x), CEILING_M) * 180) / Math.PI;
    withoutCosine.push([x, candelaAt(photometry, angleDeg, 0) / distanceSquared]);
  }
  return [actual, withoutCosine];
}

function lineSource(): [XY[], XY[], XY[]] {
  const uniform = (luminousOpening: LuminousOpening): Photometry => ({
    verticalDeg: [0, 180],
    horizontalDeg: [0],
    candela: [[LINE.cd, LINE.cd]],
    power: 1,
    luminousOpening,
    keywords: {},
  });
  const split = lightAt(
    { x: 0, y: 5, z: 0 },
    uniform({ widthM: 0, lengthM: LINE.lengthM, heightM: 0, round: false }),
  );
  const single = lightAt(
    { x: 0, y: 5, z: 0 },
    uniform({ widthM: 0, lengthM: 0, heightM: 0, round: false }),
  );
  const exact: XY[] = [];
  const cells: XY[] = [];
  const point: XY[] = [];
  for (let h = 0.15; h <= 3.001; h += 0.05) {
    // A uniform line of length L and I / L per metre, h below its middle: E = I / (h √(h² + L²/4)).
    exact.push([h, LINE.cd / (h * Math.sqrt(h * h + (LINE.lengthM * LINE.lengthM) / 4))]);
    cells.push([h, split({ x: 0, y: 5 - h, z: 0 })]);
    point.push([h, single({ x: 0, y: 5 - h, z: 0 })]);
  }
  return [exact, cells, point];
}
