// Furniture shadows for the illuminance calculation (ADR 0057): each piece
// becomes a box, turned as the piece is, and light is blocked where the line
// from a source to a point passes through one. Furniture blocks direct light
// only; light it reflects is not counted.

import { FINISHES } from '../furniture-kinds';
import type { Furniture, FurnitureKind, Vec3 } from '../types';
import { DEG } from '../math';

/**
 * The thickness of a table or desk top, in m. Matches TOP_THICKNESS in
 * render/furniture/style.ts, which draws them (checked by a test).
 */
export const TABLE_TOP_M = 0.03;

/**
 * How each kind of piece blocks light: as a solid box, as only its top (a
 * table lets light between its legs), or not at all (open or slender pieces,
 * and pictures flat on a wall).
 */
export const FURNITURE_BLOCKING: Readonly<Record<FurnitureKind, 'solid' | 'top' | 'none'>> = {
  sofa: 'solid',
  armchair: 'solid',
  'coffee-table': 'top',
  'tv-unit': 'solid',
  plant: 'none',
  'dining-table': 'top',
  chair: 'none',
  desk: 'top',
  'office-chair': 'none',
  bookcase: 'solid',
  bed: 'solid',
  'kitchen-island': 'solid',
  'display-plinth': 'solid',
  artwork: 'none',
};

/** A box that blocks light, turned about the vertical, in m. */
export interface Blocker {
  readonly centre: Vec3;
  /** Half its size along its own axes: x across, y up, z front to back. */
  readonly half: Vec3;
  /** Its turn about the vertical, as the piece's `rotationDeg`, in radians. */
  readonly yawRad: number;
  /** The share of light its faces reflect, diffusely, 0–1: its main finish's (ADR 0063). */
  readonly reflectance: number;
}

/** A segment shorter than this inside a box doesn't count as blocked, in m: points on a box's face stay lit from outside. */
const FACE_EPSILON_M = 1e-6;

/** The boxes the room's furniture blocks light with. */
export function furnitureBlockers(furniture: readonly Furniture[]): Blocker[] {
  const blockers: Blocker[] = [];
  for (const piece of furniture) {
    const blocking = FURNITURE_BLOCKING[piece.kind];
    if (blocking === 'none') continue;
    const { width, depth, height } = piece.size;
    const bottom = blocking === 'top' ? height - TABLE_TOP_M : 0;
    blockers.push({
      centre: {
        x: piece.position.x,
        y: piece.position.y + (bottom + height) / 2,
        z: piece.position.z,
      },
      half: { x: width / 2, y: (height - bottom) / 2, z: depth / 2 },
      yawRad: piece.rotationDeg * DEG,
      reflectance: FINISHES[piece.finish.main].reflectance,
    });
  }
  return blockers;
}

/**
 * Boxes ready for many segment tests (ADR 0063): each one's frame and bounds
 * worked out once, in a flat array, so a test allocates nothing. Bounced light
 * tests millions of segments in a furnished room.
 */
export interface PreparedBlockers {
  /** Per box: centre x, y, z; half x, y, z; cos and sin of its yaw; its bounds' min x, y, z and max x, y, z. */
  readonly data: Float64Array;
  readonly count: number;
}

const STRIDE = 14;
const prepared = new WeakMap<readonly Blocker[], PreparedBlockers>();

/** `blockers` prepared for `segmentBlockedPrepared`; the same array is prepared once. */
export function prepareBlockers(blockers: readonly Blocker[]): PreparedBlockers {
  const known = prepared.get(blockers);
  if (known) return known;
  const data = new Float64Array(blockers.length * STRIDE);
  blockers.forEach(({ centre, half, yawRad }, k) => {
    const [cos, sin] = [Math.cos(yawRad), Math.sin(yawRad)];
    // The turned box's extent along the room's axes.
    const ex = Math.abs(cos) * half.x + Math.abs(sin) * half.z;
    const ez = Math.abs(sin) * half.x + Math.abs(cos) * half.z;
    data.set(
      [
        centre.x,
        centre.y,
        centre.z,
        half.x,
        half.y,
        half.z,
        cos,
        sin,
        centre.x - ex,
        centre.y - half.y,
        centre.z - ez,
        centre.x + ex,
        centre.y + half.y,
        centre.z + ez,
      ],
      k * STRIDE,
    );
  });
  const result = { data, count: blockers.length };
  prepared.set(blockers, result);
  return result;
}

/**
 * Whether any prepared box's bounds meet the given bounds: if none does, no
 * segment inside them can be blocked.
 */
export function boundsMeetBlockers(
  boxes: PreparedBlockers,
  minX: number,
  minY: number,
  minZ: number,
  maxX: number,
  maxY: number,
  maxZ: number,
): boolean {
  const d = boxes.data;
  for (let k = 0; k < boxes.count; k++) {
    const o = k * STRIDE;
    if (
      maxX >= d[o + 8]! &&
      minX <= d[o + 11]! &&
      maxY >= d[o + 9]! &&
      minY <= d[o + 12]! &&
      maxZ >= d[o + 10]! &&
      minZ <= d[o + 13]!
    ) {
      return true;
    }
  }
  return false;
}

/** Whether the segment from `from` to `to` passes through any of the boxes. */
export function segmentBlocked(from: Vec3, to: Vec3, blockers: readonly Blocker[]): boolean {
  if (blockers.length === 0) return false;
  return segmentBlockedPrepared(
    prepareBlockers(blockers),
    from.x,
    from.y,
    from.z,
    to.x,
    to.y,
    to.z,
  );
}

/**
 * The slab method, on prepared boxes: in each box's own frame, the segment's
 * parameter t ∈ [0, 1] is clipped to the range inside each pair of faces. It
 * crosses the box when the three ranges overlap for longer than
 * FACE_EPSILON_M. A segment whose bounds miss the box's is passed over first.
 */
export function segmentBlockedPrepared(
  boxes: PreparedBlockers,
  sx: number,
  sy: number,
  sz: number,
  ex: number,
  ey: number,
  ez: number,
): boolean {
  const d = boxes.data;
  const length = Math.hypot(ex - sx, ey - sy, ez - sz);
  if (length === 0) return false;
  for (let k = 0; k < boxes.count; k++) {
    const o = k * STRIDE;
    if (
      Math.max(sx, ex) < d[o + 8]! ||
      Math.min(sx, ex) > d[o + 11]! ||
      Math.max(sy, ey) < d[o + 9]! ||
      Math.min(sy, ey) > d[o + 12]! ||
      Math.max(sz, ez) < d[o + 10]! ||
      Math.min(sz, ez) > d[o + 13]!
    ) {
      continue;
    }
    const [cx, cy, cz, hx, hy, hz, cos, sin] = [
      d[o]!,
      d[o + 1]!,
      d[o + 2]!,
      d[o + 3]!,
      d[o + 4]!,
      d[o + 5]!,
      d[o + 6]!,
      d[o + 7]!,
    ];
    // Into the box's frame: relative to its centre, turned back by its yaw.
    const ax = sx - cx;
    const az = sz - cz;
    const bx = ex - cx;
    const bz = ez - cz;
    const x0 = ax * cos - az * sin;
    const z0 = ax * sin + az * cos;
    const x1 = bx * cos - bz * sin;
    const z1 = bx * sin + bz * cos;
    const y0 = sy - cy;
    const y1 = ey - cy;
    // The three pairs of faces, unrolled so nothing is allocated per test.
    let enter = 0;
    let exit = 1;
    let delta = x1 - x0;
    if (delta === 0) {
      if (Math.abs(x0) >= hx) continue;
    } else {
      const t1 = (-hx - x0) / delta;
      const t2 = (hx - x0) / delta;
      enter = Math.max(enter, Math.min(t1, t2));
      exit = Math.min(exit, Math.max(t1, t2));
    }
    delta = y1 - y0;
    if (delta === 0) {
      if (Math.abs(y0) >= hy) continue;
    } else {
      const t1 = (-hy - y0) / delta;
      const t2 = (hy - y0) / delta;
      enter = Math.max(enter, Math.min(t1, t2));
      exit = Math.min(exit, Math.max(t1, t2));
    }
    delta = z1 - z0;
    if (delta === 0) {
      if (Math.abs(z0) >= hz) continue;
    } else {
      const t1 = (-hz - z0) / delta;
      const t2 = (hz - z0) / delta;
      enter = Math.max(enter, Math.min(t1, t2));
      exit = Math.min(exit, Math.max(t1, t2));
    }
    if ((exit - enter) * length > FACE_EPSILON_M) return true;
  }
  return false;
}
