// Distances from moving luminaires to the walls and floor, shown while
// dragging. Pure functions over plain data. See ADR 0042.

import { wallNormalAxis } from './placement';
import type { MountType, Room, Vec3 } from './types';

/** Shorter than this, a dimension isn't worth drawing, in m. */
const MIN_LENGTH_M = 0.001;

/** A straight-line dimension in the room. */
export interface Dimension {
  readonly from: Vec3;
  readonly to: Vec3;
  readonly lengthM: number;
}

/** A luminaire to measure: where it is and how it's mounted. */
export interface MeasuredLuminaire {
  readonly position: Vec3;
  readonly mount: MountType;
}

/**
 * Dimensions from a luminaire's centre to the room around it:
 * - ceiling and floor mounts, and pendants: to the nearer side wall (x) and
 *   the nearer back or front wall (z);
 * - wall fixtures: along their wall to the nearer corner;
 * - wall fixtures always, and pendants with `withHeight`: down to the floor.
 */
export function luminaireDimensions(
  { position, mount }: MeasuredLuminaire,
  room: Room,
  withHeight: boolean,
): Dimension[] {
  const across: ('x' | 'z')[] =
    mount === 'wall' ? [wallNormalAxis(position, room) === 'x' ? 'z' : 'x'] : ['x', 'z'];
  const dimensions = across.map((axis) => {
    const half = (axis === 'x' ? room.width : room.depth) / 2;
    return dimension(position, { ...position, [axis]: position[axis] >= 0 ? half : -half });
  });
  if (mount === 'wall' || (mount === 'pendant' && withHeight)) {
    dimensions.push(dimension(position, { ...position, y: 0 }));
  }
  return dimensions.filter(({ lengthM }) => lengthM >= MIN_LENGTH_M);
}

/**
 * Dimensions for a group: for each direction measured (towards +x, −x, +z,
 * −z or the floor), only the shortest, from the luminaire nearest that wall.
 */
export function groupDimensions(
  luminaires: readonly MeasuredLuminaire[],
  room: Room,
  withHeight: boolean,
): Dimension[] {
  const shortest = new Map<string, Dimension>();
  for (const luminaire of luminaires) {
    for (const found of luminaireDimensions(luminaire, room, withHeight)) {
      const key = direction(found);
      const current = shortest.get(key);
      if (!current || found.lengthM < current.lengthM) shortest.set(key, found);
    }
  }
  return [...shortest.values()];
}

function dimension(from: Vec3, to: Vec3): Dimension {
  return { from, to, lengthM: Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z) };
}

/** Which way a dimension points, e.g. `x+` or `y-`. */
function direction({ from, to }: Dimension): string {
  const axes = ['x', 'y', 'z'] as const;
  const axis = axes.find((a) => Math.abs(to[a] - from[a]) >= MIN_LENGTH_M) ?? 'x';
  return `${axis}${to[axis] >= from[axis] ? '+' : '-'}`;
}
