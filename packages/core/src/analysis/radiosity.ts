// Bounced light: how much light each patch of the room reflects once every
// bounce is counted (ADR 0060). Each patch reflects its reflectance ρ times
// all it receives, directly from the luminaires and from every other patch:
//
//   M_i = ρ_i · (E_direct,i + Σ_j F_ij · M_j)
//
// M is the patch's exitance (lm/m²), and F_ij the form factor from patch i to
// patch j. Gauss–Seidel iteration converges because every ρ is below 1.
// The light reflected towards any point P is then E(P) = Σ_j M_j · F(P → j).

import { distance } from '../math';
import type { Vec3 } from '../types';
import { pointToPolygon } from './form-factor';
import type { Blocker } from './occlusion';
import type { Patch } from './patches';

/**
 * The share of a patch a point actually sees, 0–1, past anything in between
 * (ADR 0060). Furniture plugs in here (visibility.ts, ADR 0063); other room
 * shapes will too.
 */
export type Visibility = (from: Vec3, to: Patch) => number;

/** Sees everything: the room's own surfaces never hide each other in a rectangular room. */
export const UNBLOCKED: Visibility = () => 1;

/**
 * Patches nearer than this many patch sizes are averaged over their sample
 * points; further, one centre point is within a fraction of a percent.
 */
const NEAR_IN_SIZES = 3;
/** A safety stop: the solve converges in tens of iterations for any real room. */
const MAX_ITERATIONS = 1000;

/** The patches' form factors: row i holds F from patch i to every patch j, in order. */
export interface FormFactors {
  readonly count: number;
  /** F_ij at index i · count + j. */
  readonly values: Float64Array;
}

/**
 * Every patch's form factor to every other. Patches on one flat surface see
 * nothing of each other. Every pair obeys reciprocity, A_i · F_ij = A_j · F_ji,
 * so the energy between them balances exactly: for distant pairs F_ji comes
 * from F_ij, which halves the work; close pairs are sampled both ways and
 * share the mean of the two estimates of A · F.
 */
export function formFactors(
  patches: readonly Patch[],
  visibility: Visibility = UNBLOCKED,
): FormFactors {
  const count = patches.length;
  const values = new Float64Array(count * count);
  const factor = (from: Patch, to: Patch, points: readonly Vec3[]) => {
    let sum = 0;
    for (const point of points) {
      sum += pointToPolygon(point, from.normal, to.vertices) * visibility(point, to);
    }
    return sum / points.length;
  };
  for (let i = 0; i < count; i++) {
    const a = patches[i]!;
    for (let j = i + 1; j < count; j++) {
      const b = patches[j]!;
      if (coplanar(a, b)) continue;
      const near = distance(a.centre, b.centre) < NEAR_IN_SIZES * Math.max(a.sizeM, b.sizeM);
      if (near) {
        const shared = (a.area * factor(a, b, a.samples) + b.area * factor(b, a, b.samples)) / 2;
        values[i * count + j] = shared / a.area;
        values[j * count + i] = shared / b.area;
      } else {
        const fij = factor(a, b, [a.centre]);
        values[i * count + j] = fij;
        values[j * count + i] = (fij * a.area) / b.area;
      }
    }
  }
  return { count, values };
}

/** Whether two patches lie in one plane facing the same way: then neither sees the other. */
function coplanar(a: Patch, b: Patch): boolean {
  const n = a.normal;
  const sameFacing = n.x * b.normal.x + n.y * b.normal.y + n.z * b.normal.z > 1 - 1e-12;
  const offset =
    (b.centre.x - a.centre.x) * n.x +
    (b.centre.y - a.centre.y) * n.y +
    (b.centre.z - a.centre.z) * n.z;
  return sameFacing && Math.abs(offset) < 1e-9;
}

/** The solved indirect (bounced) light. */
export interface IndirectLight {
  readonly patches: readonly Patch[];
  /** Each patch's exitance: the light it reflects, in lm/m². */
  readonly exitance: Float64Array;
  readonly iterations: number;
  /** The boxes that hide patches from a point (ADR 0063): none when furniture doesn't count. */
  readonly blockers: readonly Blocker[];
}

/**
 * Solves for every patch's exitance, given the direct light each receives.
 *
 * @param directLx The direct illuminance on each patch, in patch order.
 * @param tolerance Stop once no exitance changes by more than this share of the largest.
 * @param blockers The boxes `factors` was computed past, kept for reading the light at points.
 */
export function solveIndirectLight(
  patches: readonly Patch[],
  factors: FormFactors,
  directLx: ArrayLike<number>,
  tolerance: number,
  blockers: readonly Blocker[] = [],
): IndirectLight {
  const { count, values } = factors;
  const exitance = new Float64Array(count);
  for (let i = 0; i < count; i++) exitance[i] = patches[i]!.reflectance * directLx[i]!;
  let iterations = 0;
  for (; iterations < MAX_ITERATIONS; iterations++) {
    let largestChange = 0;
    let largest = 0;
    for (let i = 0; i < count; i++) {
      let received = directLx[i]!;
      const row = i * count;
      for (let j = 0; j < count; j++) received += values[row + j]! * exitance[j]!;
      const next = patches[i]!.reflectance * received;
      largestChange = Math.max(largestChange, Math.abs(next - exitance[i]!));
      largest = Math.max(largest, next);
      exitance[i] = next;
    }
    if (largestChange <= tolerance * largest) break;
  }
  return { patches, exitance, iterations: iterations + 1, blockers };
}

/**
 * The indirect (bounced) light reaching a point facing `normal` (a unit
 * vector), in lx, past whatever `visibility` says hides each patch.
 */
export function indirectIlluminanceAt(
  point: Vec3,
  normal: Vec3,
  light: IndirectLight,
  visibility: Visibility = UNBLOCKED,
): number {
  let lux = 0;
  for (let j = 0; j < light.patches.length; j++) {
    const exitance = light.exitance[j]!;
    if (exitance === 0) continue;
    const patch = light.patches[j]!;
    const factor = pointToPolygon(point, normal, patch.vertices);
    if (factor === 0) continue;
    lux += exitance * factor * visibility(point, patch);
  }
  return lux;
}

/**
 * How much each point sees of each patch, as `indirectIlluminanceAt` weighs
 * them: row k holds F(points[k] → j) · visibility for every patch j. The
 * bounced light at point k is then the sum of row k times each exitance.
 * It depends only on the geometry, so it can be kept between calculations
 * (cache.ts).
 */
export function pointViews(
  points: readonly Vec3[],
  normal: Vec3,
  patches: readonly Patch[],
  visibility: Visibility = UNBLOCKED,
): Float64Array {
  const count = patches.length;
  const views = new Float64Array(points.length * count);
  points.forEach((point, k) => {
    for (let j = 0; j < count; j++) {
      const patch = patches[j]!;
      const factor = pointToPolygon(point, normal, patch.vertices);
      if (factor !== 0) views[k * count + j] = factor * visibility(point, patch);
    }
  });
  return views;
}

/** The bounced light at point `k` of `views` (from `pointViews`), in lx. */
export function indirectFromViews(views: Float64Array, k: number, light: IndirectLight): number {
  const count = light.patches.length;
  let lux = 0;
  for (let j = 0; j < count; j++) lux += views[k * count + j]! * light.exitance[j]!;
  return lux;
}
