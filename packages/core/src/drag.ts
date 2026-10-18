// Moving luminaires, furniture and windows by dragging them in the viewport. Rays are
// plain data, so this runs without three.js and is unit-tested in Node. See
// ADRs 0038, 0041, 0047, 0048 and 0078.

import { FURNITURE_TYPES } from './furniture-kinds';
import { itemRules, type ItemRules } from './item-rules';
import { add, dot, scale, subtract } from './math';
import { horizontalHit, mountSurfaceHit, wallSlideHit, type Ray } from './placement';
import { snapPosition, type Guide, type SnapOptions } from './snap';
import type { Simulator } from './simulator';
import type { PickTarget, Vec3 } from './types';
import { windowRect } from './windows';

const NO_OFFSET: Vec3 = { x: 0, y: 0, z: 0 };

/** What the grabbed item slides on. */
interface Slide {
  /** Where `ray` meets it, given where the item started; null if it misses. */
  hit(ray: Ray, from: Vec3): Vec3 | null;
  /** Whether it's level (a ceiling, the floor, a pendant's height), so the drag never changes height. */
  readonly level: boolean;
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
  readonly #rules: ItemRules;
  readonly #slide: Slide;
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
    this.#rules = itemRules(simulator, grabbed.kind);
    this.#slide = {
      luminaire: () => luminaireSlide(simulator, grabbed.id),
      furniture: () => furnitureSlide(simulator, grabbed.id, grabHeight),
      window: () => windowSlide(simulator, grabbed.id),
    }[grabbed.kind]();
    for (const id of new Set([grabbed.id, ...groupIds])) {
      const position = this.#position(id);
      if (position) this.#start.set(id, position);
    }
    const from = this.#start.get(grabbed.id)!;
    const grabbedPoint = this.#slide.hit(ray, from);
    this.#grabOffset = grabbedPoint ? subtract(from, grabbedPoint) : NO_OFFSET;
  }

  /**
   * Moves the group to where `ray` points, snapping unless `snap` is null.
   * Returns the alignments found. A ray that misses what the item slides on is ignored.
   */
  moveTo(ray: Ray, snap: SnapOptions | null = null): readonly Guide[] {
    const rules = this.#rules;
    const from = this.#start.get(this.#grabbedId)!;
    const hit = this.#slide.hit(ray, from);
    // Undo or a delete during the drag can remove items; they're skipped.
    if (!hit || !this.#position(this.#grabbedId)) return [];
    // Constrained before snapping, so it snaps to where the item can actually go.
    let target = rules.constrain(this.#grabbedId, add(hit, this.#grabOffset));
    let guides: readonly Guide[] = [];
    if (snap) {
      const others = rules
        .items()
        .filter((item) => !this.#start.has(item.id))
        .map((item) => item.position);
      const axes = rules
        .axes(this.#grabbedId, target)
        .filter((axis) => axis !== 'y' || !this.#slide.level);
      ({ position: target, guides } = snapPosition(target, axes, others, snap));
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

/** A luminaire slides over its mount surface; a pendant at its height. */
function luminaireSlide(simulator: Simulator, id: string): Slide {
  const grabbed = simulator.scene.luminaires.find((l) => l.id === id);
  const product = grabbed && simulator.catalog.get(grabbed.productId);
  if (!product) throw new Error(`Cannot drag luminaire "${id}"`);
  return {
    hit: (ray, from) => mountSurfaceHit(ray, product, from, simulator.scene.room),
    level: product.mount !== 'wall',
  };
}

/**
 * A piece slides over the floor on the plane at `grabHeight`, so on a table
 * top the drag follows the top, not the floor far behind it. A picture slides
 * along the walls and up.
 */
function furnitureSlide(simulator: Simulator, id: string, grabHeight: number): Slide {
  const grabbed = simulator.scene.furniture.find((f) => f.id === id);
  if (!grabbed) throw new Error(`Cannot drag furniture "${id}"`);
  if (FURNITURE_TYPES[grabbed.kind].onWall) {
    return { hit: (ray, from) => wallSlideHit(ray, from, simulator.scene.room), level: false };
  }
  return {
    hit: (ray) => {
      const hit = horizontalHit(ray, grabHeight);
      return hit && { ...hit, y: 0 };
    },
    level: true,
  };
}

/** Below this, a ray is taken as parallel to a window's surface. */
const PARALLEL_EPSILON = 1e-9;

/**
 * A window slides over its own wall or the ceiling, wherever the ray meets
 * that plane, even beyond the room's edges: constrainWindow keeps it inside.
 */
function windowSlide(simulator: Simulator, id: string): Slide {
  const grabbed = simulator.scene.windows.find((w) => w.id === id);
  if (!grabbed) throw new Error(`Cannot drag window "${id}"`);
  const { normal } = windowRect(grabbed, simulator.scene.room);
  return {
    hit: ({ origin, direction }, from) => {
      const along = dot(direction, normal);
      if (Math.abs(along) < PARALLEL_EPSILON) return null;
      const t = dot(subtract(from, origin), normal) / along;
      return t > 0 ? add(origin, scale(direction, t)) : null;
    },
    level: grabbed.surface === 'ceiling',
  };
}
