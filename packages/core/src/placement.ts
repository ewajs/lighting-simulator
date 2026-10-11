import type { FloorPoint, Product, Room, Vec3 } from './types';

/** Pendant drop when the product doesn't specify one, in m. */
export const DEFAULT_SUSPENSION = 0.8;
/** Default mounting height for wall fixtures, in m. */
export const WALL_MOUNT_HEIGHT = 1.8;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

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

/** Moves a point onto the closest wall. Ties go to the back wall, then front, left, right. */
function snapToNearestWall(point: Vec3, room: Room): Vec3 {
  const halfWidth = room.width / 2;
  const halfDepth = room.depth / 2;
  const candidates: [distance: number, snapped: Vec3][] = [
    [point.z + halfDepth, { ...point, z: -halfDepth }],
    [halfDepth - point.z, { ...point, z: halfDepth }],
    [point.x + halfWidth, { ...point, x: -halfWidth }],
    [halfWidth - point.x, { ...point, x: halfWidth }],
  ];
  let [bestDistance, best] = candidates[0]!;
  for (const [distance, snapped] of candidates) {
    if (distance < bestDistance) [bestDistance, best] = [distance, snapped];
  }
  return best;
}
