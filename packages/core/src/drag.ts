// Moving luminaires by dragging them in the viewport. Rays are plain data, so
// this runs without three.js and is unit-tested in Node. See ADR 0038.

import { mountSurfaceHit, type Ray } from './placement';
import type { Simulator } from './simulator';
import type { Product, Vec3 } from './types';

const NO_OFFSET: Vec3 = { x: 0, y: 0, z: 0 };

/**
 * One drag in progress. The grabbed luminaire follows the ray along the
 * surface it's mounted on, keeping the offset from the point first grabbed so
 * it doesn't jump to the pointer. The rest of the group moves by the same
 * horizontal offset. All the moves of one drag are a single undo step.
 */
export class LuminaireDrag {
  readonly #simulator: Simulator;
  readonly #grabbedId: string;
  readonly #product: Product;
  /** Where each luminaire of the group started, by id. */
  readonly #start = new Map<string, Vec3>();
  /** From the grabbed point on the mount surface to the luminaire's position. */
  readonly #grabOffset: Vec3;
  readonly #mergeKey = `drag-${crypto.randomUUID()}`;

  /**
   * Starts dragging `grabbedId`, with every luminaire in `groupIds` moving along.
   * `ray` points at where it was grabbed. Throws if the luminaire or its product is unknown.
   */
  constructor(simulator: Simulator, grabbedId: string, groupIds: readonly string[], ray: Ray) {
    const { luminaires, room } = simulator.scene;
    const grabbed = luminaires.find((l) => l.id === grabbedId);
    const product = grabbed && simulator.catalog.get(grabbed.productId);
    if (!grabbed || !product) throw new Error(`Cannot drag luminaire "${grabbedId}"`);
    this.#simulator = simulator;
    this.#grabbedId = grabbedId;
    this.#product = product;
    for (const id of new Set([grabbedId, ...groupIds])) {
      const luminaire = luminaires.find((l) => l.id === id);
      if (luminaire) this.#start.set(id, luminaire.position);
    }
    const grabbedPoint = mountSurfaceHit(ray, product, grabbed.position, room);
    this.#grabOffset = grabbedPoint ? subtract(grabbed.position, grabbedPoint) : NO_OFFSET;
  }

  /** Moves the group to where `ray` points. A ray that misses the mount surface is ignored. */
  moveTo(ray: Ray): void {
    const simulator = this.#simulator;
    const from = this.#start.get(this.#grabbedId)!;
    const hit = mountSurfaceHit(ray, this.#product, from, simulator.scene.room);
    if (!hit || !this.#exists(this.#grabbedId)) return;
    const options = { mergeKey: this.#mergeKey };
    simulator.updateLuminaire(this.#grabbedId, { position: add(hit, this.#grabOffset) }, options);

    // Others follow where the grabbed one actually went, after its mount constraints.
    const moved = this.#position(this.#grabbedId)!;
    const dx = moved.x - from.x;
    const dz = moved.z - from.z;
    for (const [id, start] of this.#start) {
      if (id === this.#grabbedId || !this.#exists(id)) continue;
      const position = { x: start.x + dx, y: start.y, z: start.z + dz };
      simulator.updateLuminaire(id, { position }, options);
    }
  }

  /** Undo or a delete during the drag can remove luminaires; they're skipped. */
  #exists(id: string): boolean {
    return this.#position(id) !== undefined;
  }

  #position(id: string): Vec3 | undefined {
    return this.#simulator.scene.luminaires.find((l) => l.id === id)?.position;
  }
}

function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function subtract(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}
