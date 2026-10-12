import type { FloorPoint, MountType, Product, Room, Vec3 } from './types';

/** Pendant drop when the product doesn't specify one, in m. */
export const DEFAULT_SUSPENSION = 0.8;
/** Default mounting height for wall fixtures, in m. */
export const WALL_MOUNT_HEIGHT = 1.8;

/** Rays closer than this to parallel with a surface are treated as missing it. */
const PARALLEL_EPSILON = 1e-9;
/** Slack when checking that a wall hit lies on the wall, in m (rounding at the edges). */
const EDGE_EPSILON = 1e-6;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** A half-line in world space, e.g. from the camera through the pointer. */
export interface Ray {
  readonly origin: Vec3;
  /** Need not be normalised. */
  readonly direction: Vec3;
}

/**
 * Moves a position to where the product's mount type allows it inside the
 * room. Without a product (e.g. it left the catalog) the point is only kept
 * inside the room.
 */
export function constrainPosition(position: Vec3, product: Product | undefined, room: Room): Vec3 {
  const halfWidth = room.width / 2;
  const halfDepth = room.depth / 2;
  const inside = {
    x: clamp(position.x, -halfWidth, halfWidth),
    y: clamp(position.y, 0, room.height),
    z: clamp(position.z, -halfDepth, halfDepth),
  };

  switch (product?.mount) {
    case 'recessed':
    case 'track':
      return { ...inside, y: room.height };
    case 'floor':
    case 'table':
      return { ...inside, y: 0 };
    case 'wall':
      return snapToNearestWall(inside, room);
    default:
      return inside;
  }
}

/** Where a newly added product goes: above `at` (default: room centre) at its mount height. */
export function defaultPosition(
  product: Product,
  room: Room,
  at: FloorPoint = { x: 0, z: 0 },
): Vec3 {
  const heightByMount: Record<Product['mount'], number> = {
    recessed: room.height,
    track: room.height,
    pendant: room.height - (product.suspension ?? DEFAULT_SUSPENSION),
    wall: Math.min(WALL_MOUNT_HEIGHT, room.height),
    floor: 0,
    table: 0,
  };
  return constrainPosition({ x: at.x, y: heightByMount[product.mount], z: at.z }, product, room);
}

/**
 * Where `ray` meets the surface a luminaire at `position` slides on when
 * dragged, or null if it doesn't reach it (e.g. pointing above the horizon).
 * The point isn't constrained yet; `constrainPosition` does that.
 *
 * - Ceiling mounts slide on the ceiling, floor and table lamps on the floor,
 *   pendants on the horizontal plane at their current height.
 * - Wall fixtures follow the ray over the walls whose inside faces it, and
 *   over their own wall from either side. Other walls cut away by the camera
 *   are skipped. Pointing at the floor instead gives the point above it at
 *   the fixture's current height, which `constrainPosition` moves onto the
 *   nearest wall.
 */
export function mountSurfaceHit(
  ray: Ray,
  product: Product,
  position: Vec3,
  room: Room,
): Vec3 | null {
  if (product.mount === 'wall') {
    const floor = horizontalHit(ray, 0);
    return wallHit(ray, position, room) ?? (floor && { ...floor, y: position.y });
  }
  return horizontalHit(ray, slideHeight(product.mount, position, room));
}

/** Height of the horizontal plane a luminaire slides on. */
function slideHeight(mount: Exclude<MountType, 'wall'>, position: Vec3, room: Room): number {
  switch (mount) {
    case 'recessed':
    case 'track':
      return room.height;
    case 'floor':
    case 'table':
      return 0;
    case 'pendant':
      return position.y;
  }
}

/** Where the ray meets the horizontal plane at height `y`, if ahead of its origin. */
function horizontalHit({ origin, direction }: Ray, y: number): Vec3 | null {
  if (Math.abs(direction.y) < PARALLEL_EPSILON) return null;
  const t = (y - origin.y) / direction.y;
  if (t <= 0) return null;
  return { x: origin.x + t * direction.x, y, z: origin.z + t * direction.z };
}

/** A wall: the axis it is perpendicular to, where it sits on it, and its inward normal's sign. */
interface Wall {
  readonly axis: 'x' | 'z';
  readonly at: number;
  readonly inward: 1 | -1;
}

/** The four walls, in tie-break order: back, front, left, right. */
function wallsOf(room: Room): readonly Wall[] {
  const halfWidth = room.width / 2;
  const halfDepth = room.depth / 2;
  return [
    { axis: 'z', at: -halfDepth, inward: 1 },
    { axis: 'z', at: halfDepth, inward: -1 },
    { axis: 'x', at: -halfWidth, inward: 1 },
    { axis: 'x', at: halfWidth, inward: -1 },
  ];
}

/** The wall closest to a point inside the room. Ties go to the first in `wallsOf` order. */
function nearestWall(point: Vec3, walls: readonly Wall[]): Wall {
  const distance = (wall: Wall) => (point[wall.axis] - wall.at) * wall.inward;
  return walls.reduce((best, wall) => (distance(wall) < distance(best) ? wall : best));
}

/**
 * The nearest point where the ray reaches a wall from inside the room, or the
 * wall of `position` from either side: a fixture on a near wall the camera has
 * cut away still slides under the pointer.
 */
function wallHit({ origin, direction }: Ray, position: Vec3, room: Room): Vec3 | null {
  const walls = wallsOf(room);
  const own = nearestWall(position, walls);
  let nearest: { t: number; point: Vec3 } | null = null;
  for (const wall of walls) {
    const { axis, at, inward } = wall;
    // Seen from inside, the ray travels against the inward normal.
    const seenFromInside = direction[axis] * inward < -PARALLEL_EPSILON;
    if (!seenFromInside && (wall !== own || Math.abs(direction[axis]) < PARALLEL_EPSILON)) continue;
    const t = (at - origin[axis]) / direction[axis];
    if (t <= 0 || (nearest && t >= nearest.t)) continue;
    const point = {
      x: axis === 'x' ? at : origin.x + t * direction.x,
      y: origin.y + t * direction.y,
      z: axis === 'z' ? at : origin.z + t * direction.z,
    };
    const along = axis === 'x' ? point.z : point.x;
    const halfLength = (axis === 'x' ? room.depth : room.width) / 2;
    const onWall =
      Math.abs(along) <= halfLength + EDGE_EPSILON &&
      point.y >= -EDGE_EPSILON &&
      point.y <= room.height + EDGE_EPSILON;
    if (onWall) nearest = { t, point };
  }
  return nearest?.point ?? null;
}

/**
 * The axis perpendicular to the wall nearest `position`: `'z'` for the back
 * and front walls, `'x'` for the side walls.
 */
export function wallNormalAxis(position: Vec3, room: Room): 'x' | 'z' {
  return nearestWall(position, wallsOf(room)).axis;
}

/** Moves a point onto the closest wall. Ties go to the back wall, then front, left, right. */
function snapToNearestWall(point: Vec3, room: Room): Vec3 {
  const { axis, at } = nearestWall(point, wallsOf(room));
  return { ...point, [axis]: at };
}
