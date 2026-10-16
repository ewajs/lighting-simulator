// Scene operations on furniture (ADR 0047): adding, changing and copying
// pieces, and keeping them where they can stand. Pure functions over
// plain data, like luminaires.ts.

import { FINISHES, FURNITURE_TYPES } from './furniture-kinds';
import { clamp, DEG, rotateY, wrapDeg } from './math';
import { GRID_STEP } from './snap';
import type {
  FloorPoint,
  Furniture,
  FurnitureFinish,
  FurnitureKind,
  FurnitureSize,
  Room,
  Scene,
  Vec3,
} from './types';
import { assertFinite, assertPositive } from './validate';

/** Where wall pieces hang by default: the centre at gallery eye height, in m. */
export const WALL_PIECE_CENTRE_HEIGHT = 1.5;
/** A piece can shrink to this share of its usual size. */
export const MIN_SIZE_SHARE = 0.5;
/** A piece can grow to this share of its usual size. */
export const MAX_SIZE_SHARE = 2;
/** How far a copy sits from its source, to the source's right, in m. */
const DUPLICATE_OFFSET = 0.5;
/** The gap a piece added at a free spot keeps from every other piece, in m: room to walk past a chair. */
const FREE_SPOT_CLEARANCE = 0.1;
/** Slack in the free-spot overlap test, so a piece exactly FREE_SPOT_CLEARANCE away still fits despite rounding, in m. */
const FIT_EPSILON = 1e-9;

/**
 * Keeps an extent of half-size `half` around `value` within ±`limit`. One
 * that doesn't fit (a piece wider than the room) is centred on 0.
 */
const within = (value: number, half: number, limit: number) =>
  half >= limit ? 0 : clamp(value, -limit + half, limit - half);

/** The furniture fields a host may change. Size and finish can change in part. */
export type FurniturePatch = Partial<Pick<Furniture, 'position' | 'rotationDeg'>> & {
  readonly size?: Partial<FurnitureSize>;
  readonly finish?: Partial<FurnitureFinish>;
};

/**
 * A new piece's place and starting fields. `at` is the floor point it stands
 * on; without it, the piece goes to the room centre (a wall piece, to the
 * middle of the nearest wall) or the free spot nearest that. The other
 * fields apply as in an update, so a `position` overrides `at`.
 */
export type AddFurnitureOptions = FurniturePatch & { readonly at?: FloorPoint };

/**
 * Adds a piece of `kind` at its usual size and finishes, standing at `at`.
 * Without `at`, it goes where it would by default (the room centre; a wall
 * piece, the middle of the nearest wall), or if that's taken, to the free
 * spot nearest it (ADR 0049). When the room has none, the default it is.
 */
export function addFurniture(
  scene: Scene,
  kind: FurnitureKind,
  id: string,
  at?: FloorPoint,
): Scene {
  const type = FURNITURE_TYPES[kind];
  if (!type) throw new RangeError(`Unknown furniture kind "${kind}"`);
  const y = type.onWall ? WALL_PIECE_CENTRE_HEIGHT : 0;
  const placed = ({ x, z }: FloorPoint) =>
    constrainFurniture(
      { id, kind, position: { x, y, z }, rotationDeg: 0, size: type.size, finish: type.finish },
      scene.room,
    );
  const piece = at ? placed(at) : freeSpot(scene, placed);
  return { ...scene, furniture: [...scene.furniture, piece] };
}

/**
 * The box a piece fills, aligned with the room's axes: its turned footprint,
 * from the floor to its top (a wall piece: around its centre on the wall).
 */
export function furnitureBounds({ position, size, rotationDeg }: Furniture): {
  min: Vec3;
  max: Vec3;
} {
  const { halfX, halfZ } = footprint(size, rotationDeg);
  const bottom = position.y === 0 ? 0 : position.y - size.height / 2;
  return {
    min: { x: position.x - halfX, y: bottom, z: position.z - halfZ },
    max: { x: position.x + halfX, y: bottom + size.height, z: position.z + halfZ },
  };
}

/**
 * The piece `placed` puts at the room centre, or else at the grid point
 * nearest that spot where it keeps FREE_SPOT_CLEARANCE from every other
 * piece (for a picture, along its wall first). The centre if none is free.
 */
function freeSpot(scene: Scene, placed: (at: FloorPoint) => Furniture): Furniture {
  const others = scene.furniture.map(furnitureBounds);
  const gap = FREE_SPOT_CLEARANCE - FIT_EPSILON;
  const fits = (piece: Furniture) => {
    const { min, max } = furnitureBounds(piece);
    return others.every(
      (other) =>
        min.x >= other.max.x + gap ||
        max.x <= other.min.x - gap ||
        min.z >= other.max.z + gap ||
        max.z <= other.min.z - gap ||
        min.y >= other.max.y - FIT_EPSILON ||
        max.y <= other.min.y + FIT_EPSILON,
    );
  };
  const home = placed({ x: 0, z: 0 });
  if (fits(home)) return home;
  for (const point of gridPointsNearest(home.position, scene.room)) {
    const piece = placed(point);
    if (fits(piece)) return piece;
  }
  return home;
}

/** Every GRID_STEP point on the floor plan, nearest `from` first. */
function gridPointsNearest(from: FloorPoint, room: Room): FloorPoint[] {
  // Dividing by the lines per metre keeps points like 0.3 exact, as in snap.ts.
  const perMetre = Math.round(1 / GRID_STEP);
  const points: FloorPoint[] = [];
  const stepsX = Math.floor((room.width / 2) * perMetre);
  const stepsZ = Math.floor((room.depth / 2) * perMetre);
  for (let i = -stepsX; i <= stepsX; i++) {
    for (let k = -stepsZ; k <= stepsZ; k++) points.push({ x: i / perMetre, z: k / perMetre });
  }
  const distance = (point: FloorPoint) => Math.hypot(point.x - from.x, point.z - from.z);
  // Ties go to the front (+z), then to the right: the side nearest the default camera.
  return points.sort((a, b) => distance(a) - distance(b) || b.z - a.z || b.x - a.x);
}

/** Applies `patch` to one piece, then keeps it inside the room and within its size range. */
export function updateFurniture(scene: Scene, id: string, patch: FurniturePatch): Scene {
  const current = findFurniture(scene, id);
  const next: Furniture = {
    ...current,
    ...patch,
    size: { ...current.size, ...patch.size },
    finish: { ...current.finish, ...patch.finish },
  };
  assertFurniture(next);
  const constrained = constrainFurniture(next, scene.room);
  return {
    ...scene,
    furniture: scene.furniture.map((piece) => (piece.id === id ? constrained : piece)),
  };
}

/**
 * A copy of `source` with id `id`, DUPLICATE_OFFSET to the source's right, so
 * a copied chair lands beside it and a copied picture further along its wall.
 */
export function copyFurniture(source: Furniture, id: string, room: Room): Furniture {
  const turn = source.rotationDeg * DEG;
  // The piece's own +x (its right, seen from the front) in the room.
  const step = rotateY({ x: DUPLICATE_OFFSET, y: 0, z: 0 }, turn);
  const { x, y, z } = source.position;
  return constrainFurniture({ ...source, id, position: { x: x + step.x, y, z: z + step.z } }, room);
}

/**
 * Keeps a piece where it can be: its size within MIN_SIZE_SHARE–MAX_SIZE_SHARE
 * of its usual size, its rotation in [−180, 180), and its footprint inside the
 * room on the floor. Wall pieces go onto the nearest wall, facing the room,
 * inside the wall's edges. A piece bigger than the room is centred.
 */
export function constrainFurniture(piece: Furniture, room: Room): Furniture {
  const type = FURNITURE_TYPES[piece.kind];
  const size = constrainSize(piece.size, type.size);
  if (type.onWall) return { ...piece, size, ...onNearestWall(piece.position, size, room) };
  const rotationDeg = wrapDeg(piece.rotationDeg);
  const { halfX, halfZ } = footprint(size, rotationDeg);
  const position = {
    x: within(piece.position.x, halfX, room.width / 2),
    y: 0,
    z: within(piece.position.z, halfZ, room.depth / 2),
  };
  return { ...piece, size, rotationDeg, position };
}

/** Throws a RangeError naming the field if a piece isn't valid. */
export function assertFurniture(piece: Furniture): void {
  const name = `furniture "${piece.id}"`;
  if (!Object.hasOwn(FURNITURE_TYPES, piece.kind)) {
    throw new RangeError(`${name} has an unknown kind "${piece.kind}"`);
  }
  for (const axis of ['x', 'y', 'z'] as const) {
    assertFinite(`${name} position.${axis}`, piece.position[axis]);
  }
  assertFinite(`${name} rotationDeg`, piece.rotationDeg);
  for (const side of ['width', 'depth', 'height'] as const) {
    assertPositive(`${name} size.${side}`, piece.size[side]);
  }
  for (const part of ['main', 'accent'] as const) {
    if (!Object.hasOwn(FINISHES, piece.finish[part])) {
      throw new RangeError(`${name} finish.${part} "${piece.finish[part]}" is not in FINISHES`);
    }
  }
}

/** Half the extent of a turned footprint along the room's x and z. */
function footprint(size: FurnitureSize, rotationDeg: number): { halfX: number; halfZ: number } {
  const cos = Math.abs(Math.cos(rotationDeg * DEG));
  const sin = Math.abs(Math.sin(rotationDeg * DEG));
  return {
    halfX: (cos * size.width + sin * size.depth) / 2,
    halfZ: (sin * size.width + cos * size.depth) / 2,
  };
}

function constrainSize(size: FurnitureSize, usual: FurnitureSize): FurnitureSize {
  const fit = (side: keyof FurnitureSize) =>
    clamp(size[side], usual[side] * MIN_SIZE_SHARE, usual[side] * MAX_SIZE_SHARE);
  return { width: fit('width'), depth: fit('depth'), height: fit('height') };
}

/**
 * The nearest wall's place for a wall piece at `point`: its back on the wall,
 * facing the room, inside the wall's edges and between floor and ceiling.
 */
function onNearestWall(
  point: Vec3,
  size: FurnitureSize,
  room: Room,
): { position: Vec3; rotationDeg: number } {
  const halfWidth = room.width / 2;
  const halfDepth = room.depth / 2;
  // From outside the room, the nearest wall is the one nearest the point brought inside.
  const x = clamp(point.x, -halfWidth, halfWidth);
  const z = clamp(point.z, -halfDepth, halfDepth);
  // Each wall, how far the point is from it, and which way its piece faces. Ties go to the first.
  const walls = [
    { distance: z + halfDepth, rotationDeg: 0 },
    { distance: halfDepth - z, rotationDeg: -180 },
    { distance: x + halfWidth, rotationDeg: 90 },
    { distance: halfWidth - x, rotationDeg: -90 },
  ];
  const { rotationDeg } = walls.reduce((best, wall) =>
    wall.distance < best.distance ? wall : best,
  );
  const halfTall = size.height / 2;
  const y =
    size.height >= room.height ? room.height / 2 : clamp(point.y, halfTall, room.height - halfTall);
  const halfAcross = size.width / 2;
  const position =
    rotationDeg === 0 || rotationDeg === -180
      ? {
          x: within(point.x, halfAcross, halfWidth),
          y,
          z: rotationDeg === 0 ? -halfDepth : halfDepth,
        }
      : {
          x: rotationDeg === 90 ? -halfWidth : halfWidth,
          y,
          z: within(point.z, halfAcross, halfDepth),
        };
  return { position, rotationDeg };
}

function findFurniture(scene: Scene, id: string): Furniture {
  const piece = scene.furniture.find((f) => f.id === id);
  if (!piece) throw new Error(`Unknown furniture "${id}"`);
  return piece;
}
