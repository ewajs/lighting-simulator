// Moving furniture by dragging it in the viewport (ADR 0047). Rays are plain
// data, so this runs without three.js and is unit-tested in Node.

import { constrainFurniture } from './furniture';
import { FURNITURE_TYPES } from './furniture-kinds';
import type { MoveAxis } from './move-handle';
import { horizontalHit, wallNormalAxis, wallSlideHit, type Ray } from './placement';
import { snapPosition, type Guide, type SnapOptions } from './snap';
import type { Simulator } from './simulator';
import type { Furniture, Vec3 } from './types';

const NO_OFFSET: Vec3 = { x: 0, y: 0, z: 0 };

/**
 * One drag of furniture in progress. The grabbed piece slides over the floor
 * (a picture over the walls), and the point grabbed stays under the pointer:
 * on a table top, the drag follows the plane at the top's height, not the
 * floor far behind it. The rest of the group moves by
 * the same offset across the room. All the moves of one drag are a single
 * undo step. With snapping, the grabbed piece snaps to the grid or lines up
 * with pieces outside the group, centre to centre.
 */
export class FurnitureDrag {
  readonly #simulator: Simulator;
  readonly #grabbedId: string;
  readonly #onWall: boolean;
  /** Height of the plane a floor piece is dragged on: where it was grabbed. */
  readonly #grabHeight: number;
  /** Where each piece of the group started, by id. */
  readonly #start = new Map<string, Vec3>();
  /** From the grabbed point to the piece's position. */
  readonly #grabOffset: Vec3;
  readonly #mergeKey = `drag-${crypto.randomUUID()}`;

  /**
   * Starts dragging `grabbedId`, with every piece in `groupIds` moving along.
   * `ray` points at where it was grabbed, `grabHeight` m above the floor.
   * Throws if the piece is unknown.
   */
  constructor(
    simulator: Simulator,
    grabbedId: string,
    groupIds: readonly string[],
    ray: Ray,
    grabHeight = 0,
  ) {
    const { furniture } = simulator.scene;
    const grabbed = furniture.find((f) => f.id === grabbedId);
    if (!grabbed) throw new Error(`Cannot drag furniture "${grabbedId}"`);
    this.#simulator = simulator;
    this.#grabbedId = grabbedId;
    this.#onWall = FURNITURE_TYPES[grabbed.kind].onWall;
    this.#grabHeight = grabHeight;
    for (const id of new Set([grabbedId, ...groupIds])) {
      const piece = furniture.find((f) => f.id === id);
      if (piece) this.#start.set(id, piece.position);
    }
    const grabbedPoint = this.#hit(ray, grabbed.position);
    this.#grabOffset = grabbedPoint ? subtract(grabbed.position, grabbedPoint) : NO_OFFSET;
  }

  /**
   * Moves the group to where `ray` points, snapping unless `snap` is null.
   * Returns the alignments found. A ray that misses the floor or walls is ignored.
   */
  moveTo(ray: Ray, snap: SnapOptions | null = null): readonly Guide[] {
    const simulator = this.#simulator;
    const from = this.#start.get(this.#grabbedId)!;
    const grabbed = this.#piece(this.#grabbedId);
    const hit = this.#hit(ray, from);
    if (!hit || !grabbed) return [];
    // Constrained before snapping, so it snaps to where the piece can actually go.
    let target = constrainFurniture(
      { ...grabbed, position: add(hit, this.#grabOffset) },
      simulator.scene.room,
    ).position;
    let guides: readonly Guide[] = [];
    if (snap) {
      ({ position: target, guides } = snapPosition(
        target,
        this.#snapAxes(target),
        this.#others(),
        snap,
      ));
    }
    const options = { mergeKey: this.#mergeKey };
    simulator.updateFurniture(this.#grabbedId, { position: target }, options);

    // Others follow where the grabbed one actually went, after its constraints.
    const moved = this.#piece(this.#grabbedId)!.position;
    const dx = moved.x - from.x;
    const dz = moved.z - from.z;
    for (const [id, start] of this.#start) {
      if (id === this.#grabbedId || !this.#piece(id)) continue;
      const position = { x: start.x + dx, y: start.y, z: start.z + dz };
      simulator.updateFurniture(id, { position }, options);
    }
    return guides;
  }

  #hit(ray: Ray, position: Vec3): Vec3 | null {
    const { room } = this.#simulator.scene;
    if (this.#onWall) return wallSlideHit(ray, position, room);
    const hit = horizontalHit(ray, this.#grabHeight);
    return hit && { ...hit, y: 0 };
  }

  /** On the floor, across the room; on a wall, along it and up. */
  #snapAxes(position: Vec3): MoveAxis[] {
    if (!this.#onWall) return ['x', 'z'];
    const across = wallNormalAxis(position, this.#simulator.scene.room);
    return [across === 'x' ? 'z' : 'x', 'y'];
  }

  /** Positions of the pieces not being moved, to line up with. */
  #others(): Vec3[] {
    return this.#simulator.scene.furniture
      .filter((f) => !this.#start.has(f.id))
      .map((f) => f.position);
  }

  /** Undo or a delete during the drag can remove pieces; they're skipped. */
  #piece(id: string): Furniture | undefined {
    return this.#simulator.scene.furniture.find((f) => f.id === id);
  }
}

function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function subtract(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}
