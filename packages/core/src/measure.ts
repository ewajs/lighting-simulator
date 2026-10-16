// Distances from moving luminaires and furniture to the walls and floor,
// shown while dragging. Pure functions over plain data. See ADRs 0042, 0049.

import { furnitureBounds } from './furniture';
import { distance } from './math';
import { wallNormalAxis } from './placement';
import type { Furniture, MountType, Room, Vec3 } from './types';

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
 * Dimensions from a piece's edges to the room around it, not from its centre:
 * the gap behind a sofa is what matters.
 * - Floor pieces: from the edges facing the nearer side wall (x) and the
 *   nearer back or front wall (z), along the floor.
 * - Wall pieces: from the side facing the nearer corner, along the wall, and
 *   from the bottom edge down to the floor.
 */
export function furnitureDimensions(piece: Furniture, room: Room): Dimension[] {
  const { position } = piece;
  const { min, max } = furnitureBounds(piece);
  const onWall = position.y !== 0;
  const across: ('x' | 'z')[] = onWall
    ? [wallNormalAxis(position, room) === 'x' ? 'z' : 'x']
    : ['x', 'z'];
  const dimensions = across.map((axis) => {
    const half = (axis === 'x' ? room.width : room.depth) / 2;
    const towardsPlus = position[axis] >= 0;
    const edge = { ...position, [axis]: towardsPlus ? max[axis] : min[axis] };
    return dimension(edge, { ...edge, [axis]: towardsPlus ? half : -half });
  });
  if (onWall) dimensions.push(dimension({ ...position, y: min.y }, { ...position, y: 0 }));
  return dimensions.filter(({ lengthM }) => lengthM >= MIN_LENGTH_M);
}

/**
 * Dimensions for a group, from each item's own: for each direction measured
 * (towards +x, −x, +z, −z or the floor), only the shortest, from the item
 * nearest that wall.
 */
export function groupDimensions(dimensions: readonly Dimension[]): Dimension[] {
  const shortest = new Map<string, Dimension>();
  for (const found of dimensions) {
    const key = direction(found);
    const current = shortest.get(key);
    if (!current || found.lengthM < current.lengthM) shortest.set(key, found);
  }
  return [...shortest.values()];
}

function dimension(from: Vec3, to: Vec3): Dimension {
  return { from, to, lengthM: distance(from, to) };
}

/** Which way a dimension points, e.g. `x+` or `y-`. */
function direction({ from, to }: Dimension): string {
  const axes = ['x', 'y', 'z'] as const;
  const axis = axes.find((a) => Math.abs(to[a] - from[a]) >= MIN_LENGTH_M) ?? 'x';
  return `${axis}${to[axis] >= from[axis] ? '+' : '-'}`;
}
