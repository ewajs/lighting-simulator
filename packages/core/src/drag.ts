// Moving luminaires and furniture by dragging them in the viewport. Rays are
// plain data, so this runs without three.js and is unit-tested in Node. See
// ADRs 0038, 0041, 0047 and 0048.

import { constrainFurniture } from './furniture';
import { FURNITURE_TYPES } from './furniture-kinds';
import { add, subtract } from './math';
import { luminaireAxes, type MoveAxis } from './move-handle';
import {
  constrainPosition,
  horizontalHit,
  mountSurfaceHit,
  wallNormalAxis,
  wallSlideHit,
  type Ray,
} from './placement';
import { snapPosition, type Guide, type SnapOptions } from './snap';
import type { EditOptions, Simulator } from './simulator';
import type { PickTarget, Vec3 } from './types';

const NO_OFFSET: Vec3 = { x: 0, y: 0, z: 0 };

/** How the grabbed item, and the list it's in, follow a drag. One per kind. */
interface DragRules {
  /** The items of the grabbed one's kind: what moves along, and what the rest lines up with. */
  items(): readonly { readonly id: string; readonly position: Vec3 }[];
  /** Where `ray` meets what the grabbed item slides on, given where it started. */
  hit(ray: Ray, from: Vec3): Vec3 | null;
  /** The nearest position the grabbed item can actually take. */
  constrain(position: Vec3): Vec3;
  /** The coordinates snapping may change at `position`. */
  snapAxes(position: Vec3): MoveAxis[];
  move(id: string, position: Vec3, options: EditOptions): void;
}

/**
 * One drag in progress. The grabbed luminaire or piece follows the ray over
 * what it slides on: a luminaire over the surface it's mounted on, a piece
 * over the floor at the height it was grabbed (a picture over the walls). The
 * offset from the point first grabbed is kept, so it doesn't jump to the
 * pointer. The rest of the group moves by the same horizontal offset. All
 * the moves of one drag are a single undo step. With snapping, the grabbed
 * item snaps to the grid or lines up with items of its kind outside the group.
 */
export class ItemDrag {
  readonly #grabbedId: string;
  readonly #rules: DragRules;
  /** Where each item of the group started, by id. */
  readonly #start = new Map<string, Vec3>();
  /** From the grabbed point to the grabbed item's position. */
  readonly #grabOffset: Vec3;
  readonly #mergeKey = `drag-${crypto.randomUUID()}`;

  /**
   * Starts dragging `grabbed`, with every item of its kind in `groupIds`
   * moving along. `ray` points at where it was grabbed; a piece of furniture
   * was grabbed `grabHeight` m above the floor. Throws if the item or a
   * luminaire's product is unknown.
   */
  constructor(
    simulator: Simulator,
    grabbed: PickTarget,
    groupIds: readonly string[],
    ray: Ray,
    grabHeight = 0,
  ) {
    this.#grabbedId = grabbed.id;
    this.#rules =
      grabbed.kind === 'luminaire'
        ? luminaireRules(simulator, grabbed.id)
        : furnitureRules(simulator, grabbed.id, grabHeight);
    for (const id of new Set([grabbed.id, ...groupIds])) {
      const position = this.#position(id);
      if (position) this.#start.set(id, position);
    }
    const from = this.#start.get(grabbed.id)!;
    const grabbedPoint = this.#rules.hit(ray, from);
    this.#grabOffset = grabbedPoint ? subtract(from, grabbedPoint) : NO_OFFSET;
  }

  /**
   * Moves the group to where `ray` points, snapping unless `snap` is null.
   * Returns the alignments found. A ray that misses what the item slides on is ignored.
   */
  moveTo(ray: Ray, snap: SnapOptions | null = null): readonly Guide[] {
    const rules = this.#rules;
    const from = this.#start.get(this.#grabbedId)!;
    const hit = rules.hit(ray, from);
    // Undo or a delete during the drag can remove items; they're skipped.
    if (!hit || !this.#position(this.#grabbedId)) return [];
    // Constrained before snapping, so it snaps to where the item can actually go.
    let target = rules.constrain(add(hit, this.#grabOffset));
    let guides: readonly Guide[] = [];
    if (snap) {
      const others = rules
        .items()
        .filter((item) => !this.#start.has(item.id))
        .map((item) => item.position);
      ({ position: target, guides } = snapPosition(target, rules.snapAxes(target), others, snap));
    }
    const options = { mergeKey: this.#mergeKey };
    rules.move(this.#grabbedId, target, options);

    // Others follow where the grabbed one actually went, after its constraints.
    const moved = this.#position(this.#grabbedId)!;
    const dx = moved.x - from.x;
    const dz = moved.z - from.z;
    for (const [id, start] of this.#start) {
      if (id === this.#grabbedId || !this.#position(id)) continue;
      rules.move(id, { x: start.x + dx, y: start.y, z: start.z + dz }, options);
    }
    return guides;
  }

  #position(id: string): Vec3 | undefined {
    return this.#rules.items().find((item) => item.id === id)?.position;
  }
}

/** A luminaire slides over its mount surface; a pendant keeps its height when snapping. */
function luminaireRules(simulator: Simulator, id: string): DragRules {
  const grabbed = simulator.scene.luminaires.find((l) => l.id === id);
  const product = grabbed && simulator.catalog.get(grabbed.productId);
  if (!product) throw new Error(`Cannot drag luminaire "${id}"`);
  const room = () => simulator.scene.room;
  return {
    items: () => simulator.scene.luminaires,
    hit: (ray, from) => mountSurfaceHit(ray, product, from, room()),
    constrain: (position) => constrainPosition(position, product, room()),
    snapAxes: (position) => {
      const axes = luminaireAxes(product, position, room());
      return product.mount === 'pendant' ? axes.filter((axis) => axis !== 'y') : axes;
    },
    move: (id, position, options) => simulator.updateLuminaire(id, { position }, options),
  };
}

/**
 * A piece slides over the floor on the plane at `grabHeight`, so on a table
 * top the drag follows the top, not the floor far behind it. A picture slides
 * along the walls and up.
 */
function furnitureRules(simulator: Simulator, id: string, grabHeight: number): DragRules {
  const grabbed = simulator.scene.furniture.find((f) => f.id === id);
  if (!grabbed) throw new Error(`Cannot drag furniture "${id}"`);
  const { onWall } = FURNITURE_TYPES[grabbed.kind];
  const room = () => simulator.scene.room;
  return {
    items: () => simulator.scene.furniture,
    hit: (ray, from) => {
      if (onWall) return wallSlideHit(ray, from, room());
      const hit = horizontalHit(ray, grabHeight);
      return hit && { ...hit, y: 0 };
    },
    constrain: (position) => constrainFurniture({ ...grabbed, position }, room()).position,
    snapAxes: (position) => {
      if (!onWall) return ['x', 'z'];
      return [wallNormalAxis(position, room()) === 'x' ? 'z' : 'x', 'y'];
    },
    move: (id, position, options) => simulator.updateFurniture(id, { position }, options),
  };
}
