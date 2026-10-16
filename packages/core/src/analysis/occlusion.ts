// Furniture shadows for the illuminance calculation (ADR 0057): each piece
// becomes a box, turned as the piece is, and light is blocked where the line
// from a source to a point passes through one. Furniture blocks direct light
// only; light it reflects is not counted.

import type { Furniture, FurnitureKind, Vec3 } from '../types';
import { DEG, distance, rotateY, subtract } from '../math';

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
    });
  }
  return blockers;
}

/** Whether the segment from `from` to `to` passes through any of the boxes. */
export function segmentBlocked(from: Vec3, to: Vec3, blockers: readonly Blocker[]): boolean {
  return blockers.some((blocker) => crossesBox(from, to, blocker));
}

/**
 * The slab method: in the box's own frame, the segment's parameter t ∈ [0, 1]
 * is clipped to the range inside each pair of faces. It crosses the box when
 * the three ranges overlap for longer than FACE_EPSILON_M.
 */
function crossesBox(from: Vec3, to: Vec3, { centre, half, yawRad }: Blocker): boolean {
  const start = toBoxFrame(from, centre, yawRad);
  const end = toBoxFrame(to, centre, yawRad);
  const length = distance(end, start);
  if (length === 0) return false;
  let enter = 0;
  let exit = 1;
  for (const axis of ['x', 'y', 'z'] as const) {
    const delta = end[axis] - start[axis];
    if (delta === 0) {
      if (Math.abs(start[axis]) >= half[axis]) return false;
      continue;
    }
    const t1 = (-half[axis] - start[axis]) / delta;
    const t2 = (half[axis] - start[axis]) / delta;
    enter = Math.max(enter, Math.min(t1, t2));
    exit = Math.min(exit, Math.max(t1, t2));
  }
  return (exit - enter) * length > FACE_EPSILON_M;
}

/** A point in a box's frame: relative to its centre, turned back by its yaw. */
function toBoxFrame(point: Vec3, centre: Vec3, yawRad: number): Vec3 {
  return rotateY(subtract(point, centre), -yawRad);
}
