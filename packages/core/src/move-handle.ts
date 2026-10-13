// The move handle's logic: which axes a selection can slide along, and
// sliding along one. Rays are plain data, so this runs without three.js.
// See ADR 0039.

import { dot, subtract } from './math';
import { wallNormalAxis, type Ray } from './placement';
import { snapPosition, type Guide, type SnapOptions } from './snap';
import type { Simulator } from './simulator';
import type { Luminaire, Product, Room, Vec3 } from './types';

/** A world axis a move handle slides along. `y` is height. */
export type MoveAxis = 'x' | 'y' | 'z';

/** Rays closer than this to parallel with an axis can't move along it. */
const PARALLEL_EPSILON = 1e-9;

/** Unit vector of each axis. */
export const AXIS_DIRECTIONS: Readonly<Record<MoveAxis, Vec3>> = {
  x: { x: 1, y: 0, z: 0 },
  y: { x: 0, y: 1, z: 0 },
  z: { x: 0, y: 0, z: 1 },
};

/**
 * The axes a luminaire can slide along: across the ceiling or floor, plus
 * height for pendants; along its wall and up for wall fixtures.
 */
export function luminaireAxes(product: Product, position: Vec3, room: Room): MoveAxis[] {
  switch (product.mount) {
    case 'recessed':
    case 'track':
    case 'floor':
    case 'table':
      return ['x', 'z'];
    case 'pendant':
      return ['x', 'y', 'z'];
    case 'wall':
      return [wallNormalAxis(position, room) === 'x' ? 'z' : 'x', 'y'];
  }
}

/**
 * The axes every luminaire in a group can slide along, in x, y, z order.
 * Empty when they share none (e.g. fixtures on two different walls) or when
 * a product is unknown.
 */
export function groupAxes(
  luminaires: readonly Luminaire[],
  product: (productId: string) => Product | undefined,
  room: Room,
): MoveAxis[] {
  if (luminaires.length === 0) return [];
  let shared: MoveAxis[] = ['x', 'y', 'z'];
  for (const luminaire of luminaires) {
    const found = product(luminaire.productId);
    if (!found) return [];
    const axes = luminaireAxes(found, luminaire.position, room);
    shared = shared.filter((axis) => axes.includes(axis));
  }
  return shared;
}

/** The average position of a group of luminaires, where its handle sits. */
export function groupCenter(luminaires: readonly Luminaire[]): Vec3 {
  const sum = { x: 0, y: 0, z: 0 };
  for (const { position } of luminaires) {
    sum.x += position.x;
    sum.y += position.y;
    sum.z += position.z;
  }
  const n = Math.max(1, luminaires.length);
  return { x: sum.x / n, y: sum.y / n, z: sum.z / n };
}

/**
 * How far along the axis line through `origin` the point closest to the ray
 * lies, in m. Null when the ray runs parallel to the axis, or the closest
 * point is behind the ray's origin.
 */
export function axisOffset(ray: Ray, origin: Vec3, axis: MoveAxis): number | null {
  // Closest points of two lines: origin + s·a (|a| = 1) and ray.origin + t·d.
  const a = AXIS_DIRECTIONS[axis];
  const d = ray.direction;
  const w = subtract(origin, ray.origin);
  const b = dot(a, d);
  const c = dot(d, d);
  const denominator = c - b * b;
  if (denominator < PARALLEL_EPSILON * c) return null;
  const aw = dot(a, w);
  const dw = dot(d, w);
  const t = (dw - b * aw) / denominator;
  if (t <= 0) return null;
  return (b * dw - c * aw) / denominator;
}

/**
 * One drag of a move handle: every luminaire in the group slides by the same
 * distance along one axis, as one undo step. The distance is limited so all
 * of them stay inside the room, which keeps the group's shape. With
 * snapping, the group's centre snaps to the grid or lines up with
 * luminaires outside the group.
 */
export class AxisDrag {
  readonly #simulator: Simulator;
  readonly #axis: MoveAxis;
  readonly #origin: Vec3;
  /** Where each luminaire started, by id. */
  readonly #start = new Map<string, Vec3>();
  /** Offset along the axis where the handle was grabbed; null if the grab ray missed. */
  readonly #grabbed: number | null;
  readonly #mergeKey = `axis-drag-${crypto.randomUUID()}`;

  /** `ray` points at where the handle was grabbed. Unknown ids are ignored. */
  constructor(simulator: Simulator, ids: readonly string[], axis: MoveAxis, ray: Ray) {
    const luminaires = simulator.scene.luminaires.filter((l) => ids.includes(l.id));
    for (const { id, position } of luminaires) this.#start.set(id, position);
    this.#simulator = simulator;
    this.#axis = axis;
    this.#origin = groupCenter(luminaires);
    this.#grabbed = axisOffset(ray, this.#origin, axis);
  }

  /**
   * Slides the group to where `ray` points along the axis, snapping unless
   * `snap` is null. Returns the alignments found. Rays it can't follow are ignored.
   */
  moveTo(ray: Ray, snap: SnapOptions | null = null): readonly Guide[] {
    const offset = axisOffset(ray, this.#origin, this.#axis);
    if (offset === null || this.#grabbed === null) return [];
    let distance = offset - this.#grabbed;
    let guides: readonly Guide[] = [];
    if (snap) {
      const center = { ...this.#origin, [this.#axis]: this.#origin[this.#axis] + distance };
      const snapped = snapPosition(center, [this.#axis], this.#others(), snap);
      distance = snapped.position[this.#axis] - this.#origin[this.#axis];
      guides = snapped.guides;
    }
    distance = this.#withinRoom(distance);
    const options = { mergeKey: this.#mergeKey };
    for (const [id, start] of this.#start) {
      if (!this.#simulator.scene.luminaires.some((l) => l.id === id)) continue;
      const position = { ...start, [this.#axis]: start[this.#axis] + distance };
      this.#simulator.updateLuminaire(id, { position }, options);
    }
    return guides;
  }

  /** Positions of the luminaires not being moved, to line up with. */
  #others(): Vec3[] {
    return this.#simulator.scene.luminaires
      .filter((l) => !this.#start.has(l.id))
      .map((l) => l.position);
  }

  /** The distance limited so every luminaire stays inside the room. */
  #withinRoom(distance: number): number {
    const { width, depth, height } = this.#simulator.scene.room;
    const bounds: Record<MoveAxis, [min: number, max: number]> = {
      x: [-width / 2, width / 2],
      y: [0, height],
      z: [-depth / 2, depth / 2],
    };
    const [min, max] = bounds[this.#axis];
    let lowest = -Infinity;
    let highest = Infinity;
    for (const start of this.#start.values()) {
      lowest = Math.max(lowest, min - start[this.#axis]);
      highest = Math.min(highest, max - start[this.#axis]);
    }
    return Math.min(highest, Math.max(lowest, distance));
  }
}
