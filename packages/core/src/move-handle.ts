// The move handle's logic: which axes a selection of luminaires or furniture
// can slide along, and sliding along one. Rays are plain data, so this runs
// without three.js. See ADRs 0039 and 0049.

import { itemRules, type ItemRules } from './item-rules';
import { dot, subtract } from './math';
import type { Ray } from './placement';
import { findItem, itemCentre } from './scene-items';
import { snapPosition, type Guide, type SnapOptions } from './snap';
import type { Simulator } from './simulator';
import type { Vec3 } from './types';

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

/** The axes every item in `ids` can slide along, in x, y, z order. Empty when they share none, e.g. pictures on two different walls. */
export function groupAxes(rules: ItemRules, ids: readonly string[]): MoveAxis[] {
  const items = rules.items().filter((item) => ids.includes(item.id));
  if (items.length === 0) return [];
  let shared: MoveAxis[] = ['x', 'y', 'z'];
  for (const { id, position } of items) {
    const axes = rules.axes(id, position);
    shared = shared.filter((axis) => axes.includes(axis));
  }
  return shared;
}

/** The average of some points, e.g. the middles of a group, where its handle sits. */
export function groupCenter(points: readonly Vec3[]): Vec3 {
  const sum = { x: 0, y: 0, z: 0 };
  for (const point of points) {
    sum.x += point.x;
    sum.y += point.y;
    sum.z += point.z;
  }
  const n = Math.max(1, points.length);
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
 * One drag of a move handle: every luminaire or piece in the group slides by
 * the same distance along one axis, as one undo step. The distance is
 * limited by the item that can go least far, so the group keeps its shape
 * at the walls. With snapping, the group's centre snaps to the grid or
 * lines up with items of its kind outside the group.
 */
export class AxisDrag {
  readonly #rules: ItemRules;
  readonly #axis: MoveAxis;
  readonly #origin: Vec3;
  /** Where each item started, by id. */
  readonly #start = new Map<string, Vec3>();
  /** Offset along the axis where the handle was grabbed; null if the grab ray missed. */
  readonly #grabbed: number | null;
  readonly #mergeKey = `axis-drag-${crypto.randomUUID()}`;

  /**
   * Slides the items in `ids`, all of one kind. `ray` points at where the
   * handle was grabbed. Unknown ids are ignored.
   */
  constructor(simulator: Simulator, ids: readonly string[], axis: MoveAxis, ray: Ray) {
    const found = ids.flatMap((id) => findItem(simulator.scene, id) ?? []);
    this.#rules = itemRules(simulator, found[0]?.kind ?? 'luminaire');
    for (const { item } of found) this.#start.set(item.id, item.position);
    this.#axis = axis;
    this.#origin = groupCenter(found.map(itemCentre));
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
    distance = this.#keepingShape(distance);
    const options = { mergeKey: this.#mergeKey };
    const present = new Set(this.#rules.items().map((item) => item.id));
    for (const [id, start] of this.#start) {
      if (!present.has(id)) continue;
      this.#rules.move(id, this.#moved(start, distance), options);
    }
    return guides;
  }

  /** Positions of the items not being moved, to line up with. */
  #others(): Vec3[] {
    return this.#rules
      .items()
      .filter((item) => !this.#start.has(item.id))
      .map((item) => item.position);
  }

  /** The distance cut short where an item would be stopped (a wall, the floor), so none lags behind. */
  #keepingShape(distance: number): number {
    let allowed = distance;
    for (const [id, start] of this.#start) {
      const reach =
        this.#rules.constrain(id, this.#moved(start, distance))[this.#axis] - start[this.#axis];
      if (Math.abs(reach) < Math.abs(allowed))
        allowed = Math.sign(reach) === Math.sign(distance) ? reach : 0;
    }
    return allowed;
  }

  #moved(start: Vec3, distance: number): Vec3 {
    return { ...start, [this.#axis]: start[this.#axis] + distance };
  }
}
