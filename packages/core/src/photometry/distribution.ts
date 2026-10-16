// Reading a Type C light distribution: symmetry, interpolated intensity,
// total flux and beam angle. Pure maths over Photometry, no three.js.
// Between measured angles the intensity is interpolated linearly in both
// directions; outside the measured vertical range it is 0 cd.

import { DEG, length } from '../math';
import type { Photometry, Vec3 } from '../types';

/**
 * How the measured horizontal angles cover the full circle (LM-63 Type C):
 * one angle means rotationally symmetric, 0–90° quadrant symmetric, 0–180°
 * symmetric about the 0°–180° plane, the legacy 90–270° symmetric about the
 * 90°–270° plane, and 0° to more than 180° no symmetry. A file that stops
 * short of 360° wraps around to its 0° values.
 */
export type HorizontalSymmetry = 'rotational' | 'quadrant' | 'bilateral' | 'bilateral-90' | 'none';

const FULL_CIRCLE_DEG = 360;
/** Beam angle threshold: 50 % of peak intensity (IES/CIE beam angle). */
const BEAM_FRACTION = 0.5;

/** The symmetry implied by a file's horizontal angles, or undefined if LM-63 doesn't allow them. */
export function horizontalSymmetry(
  horizontalDeg: readonly number[],
): HorizontalSymmetry | undefined {
  const first = horizontalDeg[0];
  const last = horizontalDeg.at(-1);
  if (first === undefined || last === undefined) return undefined;
  if (horizontalDeg.length === 1) return 'rotational';
  if (first === 0 && last === 90) return 'quadrant';
  if (first === 0 && last === 180) return 'bilateral';
  if (first === 90 && last === 270) return 'bilateral-90';
  if (first === 0 && last > 180 && last <= FULL_CIRCLE_DEG) return 'none';
  return undefined;
}

/**
 * Luminous intensity in cd towards a direction given in the luminaire's own
 * Type C angles (see {@link Photometry}). Any horizontal angle is accepted and
 * folded into the measured range using the file's symmetry.
 */
export function candelaAt(
  photometry: Photometry,
  verticalDeg: number,
  horizontalDeg: number,
): number {
  const rows = photometry.candela;
  const symmetry = symmetryOf(photometry);
  if (symmetry === 'rotational')
    return profileAt(photometry.verticalDeg, row(rows, 0), verticalDeg);

  const angles = photometry.horizontalDeg;
  const phi = foldHorizontal(horizontalDeg, symmetry);
  const lastIndex = angles.length - 1;
  const last = angles[lastIndex]!;
  if (phi >= last) {
    // Only an unsymmetric file that stops short of 360° gets here with
    // phi > last: interpolate across the gap back to its 0° row.
    const t = phi === last ? 0 : (phi - last) / (FULL_CIRCLE_DEG - last);
    return interpolateRows(photometry, lastIndex, 0, t, verticalDeg);
  }
  // phi now lies within [first, last), so a larger angle exists.
  const upper = angles.findIndex((angle) => angle > phi);
  const lowerAngle = angles[upper - 1]!;
  const t = (phi - lowerAngle) / (angles[upper]! - lowerAngle);
  return interpolateRows(photometry, upper - 1, upper, t, verticalDeg);
}

/**
 * Total luminous flux in lm leaving the luminaire, integrated over the whole
 * sphere from the candela table. The integral is exact for the linear
 * interpolation {@link candelaAt} uses.
 */
export function totalFlux(photometry: Photometry): number {
  return 2 * Math.PI * zonalIntegral(photometry.verticalDeg, averagedProfile(photometry));
}

/**
 * Full beam angle in degrees: twice the angle from the axis to where the
 * intensity, averaged over all horizontal angles, falls to 50 % of its peak.
 * The axis is the nadir when the peak points down, the zenith when it points
 * up. A distribution that never falls to 50 % (e.g. a bare lamp) gives the
 * full measured spread, up to 360°.
 */
export function beamAngleDeg(photometry: Photometry): number {
  const angles = photometry.verticalDeg;
  const profile = averagedProfile(photometry);
  const peak = Math.max(...profile);
  const peakIndex = profile.indexOf(peak);
  const threshold = BEAM_FRACTION * peak;
  const pointsDown = angles[peakIndex]! <= 90;
  const step = pointsDown ? 1 : -1;

  let edgeDeg = pointsDown ? angles.at(-1)! : angles[0]!;
  for (let i = peakIndex + step; i >= 0 && i < angles.length; i += step) {
    if (profile[i]! < threshold) {
      const inside = profile[i - step]!;
      const t = (inside - threshold) / (inside - profile[i]!);
      edgeDeg = angles[i - step]! + t * (angles[i]! - angles[i - step]!);
      break;
    }
  }
  return pointsDown ? 2 * edgeDeg : 2 * (180 - edgeDeg);
}

/**
 * Type C angles of a direction in the luminaire's own frame (ADR 0036): −y is
 * the aim (vertical 0°), +z the forward direction (horizontal 0°) and +x
 * horizontal 90°, anticlockwise seen from above. The IES light's shader
 * computes the same mapping on the GPU.
 */
export function typeCAngles(direction: Vec3): { verticalDeg: number; horizontalDeg: number } {
  const verticalDeg = (Math.acos(-direction.y / length(direction)) * 180) / Math.PI;
  const horizontalDeg = (Math.atan2(direction.x, direction.z) * 180) / Math.PI;
  return { verticalDeg, horizontalDeg: (horizontalDeg + 360) % 360 };
}

function symmetryOf(photometry: Photometry): HorizontalSymmetry {
  const symmetry = horizontalSymmetry(photometry.horizontalDeg);
  if (symmetry === undefined) {
    throw new RangeError(
      `Unsupported horizontal angles ${photometry.horizontalDeg[0]}–${photometry.horizontalDeg.at(-1)}°`,
    );
  }
  return symmetry;
}

/** Maps any horizontal angle onto the measured range, using the symmetry. */
function foldHorizontal(deg: number, symmetry: HorizontalSymmetry): number {
  const phi = ((deg % FULL_CIRCLE_DEG) + FULL_CIRCLE_DEG) % FULL_CIRCLE_DEG;
  switch (symmetry) {
    case 'quadrant': {
      const half = phi > 180 ? FULL_CIRCLE_DEG - phi : phi;
      return half > 90 ? 180 - half : half;
    }
    case 'bilateral':
      return phi > 180 ? FULL_CIRCLE_DEG - phi : phi;
    case 'bilateral-90':
      // Mirroring across the 90°–270° plane maps phi to 180° − phi.
      if (phi < 90) return 180 - phi;
      return phi > 270 ? 540 - phi : phi;
    default:
      return phi;
  }
}

function interpolateRows(
  photometry: Photometry,
  lower: number,
  upper: number,
  t: number,
  verticalDeg: number,
): number {
  const angles = photometry.verticalDeg;
  const a = profileAt(angles, row(photometry.candela, lower), verticalDeg);
  const b = profileAt(angles, row(photometry.candela, upper), verticalDeg);
  return a + t * (b - a);
}

/** Linear interpolation along one vertical profile; 0 outside the measured range. */
function profileAt(angles: readonly number[], values: readonly number[], deg: number): number {
  const first = angles[0]!;
  const last = angles.at(-1)!;
  if (deg < first || deg > last) return 0;
  if (deg === last) return values.at(-1)!;
  const upper = angles.findIndex((angle) => angle > deg);
  const a = angles[upper - 1]!;
  const t = (deg - a) / (angles[upper]! - a);
  return values[upper - 1]! + t * (values[upper]! - values[upper - 1]!);
}

/**
 * The vertical profile averaged over the full circle of horizontal angles.
 * Each measured row weighs the arc it covers under linear interpolation (the
 * trapezoid rule); mirrored copies cover the same arcs, so averaging over the
 * measured range equals averaging over 360°.
 */
function averagedProfile(photometry: Photometry): number[] {
  const weights = horizontalWeights(photometry);
  return photometry.verticalDeg.map((_, v) =>
    weights.reduce((sum, weight, h) => sum + weight * row(photometry.candela, h)[v]!, 0),
  );
}

function horizontalWeights(photometry: Photometry): number[] {
  const angles = photometry.horizontalDeg;
  const symmetry = symmetryOf(photometry);
  if (symmetry === 'rotational') return [1];
  const weights = angles.map(() => 0);
  const addArc = (a: number, b: number, arcDeg: number) => {
    weights[a]! += arcDeg / 2;
    weights[b]! += arcDeg / 2;
  };
  for (let i = 0; i + 1 < angles.length; i++) addArc(i, i + 1, angles[i + 1]! - angles[i]!);
  if (symmetry === 'none') {
    addArc(angles.length - 1, 0, FULL_CIRCLE_DEG - angles.at(-1)!);
  }
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  return weights.map((weight) => weight / total);
}

/**
 * ∫ I(θ) sin θ dθ over the measured vertical range, with I linear between
 * samples. Per segment [a, b]:
 * ∫ I sin θ = I_a (cos a − cos b) + (I_b − I_a)/(b − a) · (sin b − sin a − (b − a) cos b).
 */
function zonalIntegral(anglesDeg: readonly number[], values: readonly number[]): number {
  let sum = 0;
  for (let i = 0; i + 1 < anglesDeg.length; i++) {
    const a = anglesDeg[i]! * DEG;
    const b = anglesDeg[i + 1]! * DEG;
    const ia = values[i]!;
    const slope = (values[i + 1]! - ia) / (b - a);
    sum += ia * (Math.cos(a) - Math.cos(b));
    sum += slope * (Math.sin(b) - Math.sin(a) - (b - a) * Math.cos(b));
  }
  return sum;
}

function row(rows: Photometry['candela'], index: number): readonly number[] {
  return rows[index]!;
}
