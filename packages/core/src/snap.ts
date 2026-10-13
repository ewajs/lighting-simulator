// Snapping for drags: a grid from the room centre, and alignment with other
// luminaires and the room's centre lines. Pure functions over plain data.
// See ADR 0041.

import type { MoveAxis } from './move-handle';
import type { Vec3 } from './types';

/** Grid spacing, in m. Positions snap to multiples of it, measured from the room centre. */
export const GRID_STEP = 0.1;
/** Rotation rings turn in multiples of this, in degrees: a luminaire's pan, a piece's rotation. */
export const TURN_STEP_DEG = 15;

/** How a drag snaps, or null for free movement. */
export interface SnapOptions {
  /** How close a coordinate must be to another luminaire's, or a centre line, to align with it, in m. */
  readonly toleranceM: number;
}

/**
 * A line a dragged luminaire lines up with: the vertical plane `axis = value`,
 * e.g. `{ axis: 'x', value: 1.2 }` for another luminaire at x = 1.2.
 */
export interface Guide {
  readonly axis: 'x' | 'z';
  readonly value: number;
}

/** A snapped position and the alignments it found. */
export interface Snapped {
  readonly position: Vec3;
  readonly guides: readonly Guide[];
}

/**
 * Snaps the coordinates of `position` named in `axes`. Across the room (x and
 * z) a coordinate first aligns with the nearest of `others` or the centre
 * line within the tolerance; otherwise, and for height, it snaps to the grid.
 */
export function snapPosition(
  position: Vec3,
  axes: readonly MoveAxis[],
  others: readonly Vec3[],
  { toleranceM }: SnapOptions,
): Snapped {
  const snapped = { ...position };
  const guides: Guide[] = [];
  for (const axis of axes) {
    const value = position[axis];
    if (axis !== 'y') {
      // The room's centre line is a target like any luminaire.
      const aligned = nearestWithin(value, [0, ...others.map((other) => other[axis])], toleranceM);
      if (aligned !== null) {
        snapped[axis] = aligned;
        guides.push({ axis, value: aligned });
        continue;
      }
    }
    snapped[axis] = toGrid(value);
  }
  return { position: snapped, guides };
}

/** An angle snapped to TURN_STEP_DEG, in [−180, 180). */
export function snapTurn(angleDeg: number): number {
  const snapped = Math.round(angleDeg / TURN_STEP_DEG) * TURN_STEP_DEG;
  return snapped >= 180 ? snapped - 360 : snapped;
}

/** The nearest grid line. Dividing by the lines per metre keeps results like 0.3 exact. */
function toGrid(value: number): number {
  const perMetre = Math.round(1 / GRID_STEP);
  return Math.round(value * perMetre) / perMetre;
}

function nearestWithin(
  value: number,
  targets: readonly number[],
  tolerance: number,
): number | null {
  let best: number | null = null;
  for (const target of targets) {
    const distance = Math.abs(target - value);
    if (distance <= tolerance && (best === null || distance < Math.abs(best - value))) {
      best = target;
    }
  }
  return best;
}
