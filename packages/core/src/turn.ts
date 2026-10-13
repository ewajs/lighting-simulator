// Turning a luminaire's pan or a piece of furniture around the vertical by
// dragging a ring around it. Rays are plain data, so this runs without
// three.js. See ADRs 0040 and 0049.

import { DEG, wrapDeg } from './math';
import type { Ray } from './placement';
import type { Simulator } from './simulator';
import { snapTurn, type SnapOptions } from './snap';
import type { PickTarget, Vec3 } from './types';

/** Below this, a ray runs level with the ring's plane and gives no bearing. */
const LEVEL_EPSILON = 1e-9;

/**
 * The bearing of a ray around a vertical axis through `center`, in degrees,
 * measured like pan and rotation (0 towards +z, 90 towards +x). Read on the
 * horizontal plane through `center`; null if the ray runs parallel to it or away.
 */
export function bearingAround(ray: Ray, center: Vec3): number | null {
  const { origin, direction } = ray;
  if (Math.abs(direction.y) < LEVEL_EPSILON) return null;
  const t = (center.y - origin.y) / direction.y;
  if (t <= 0) return null;
  const x = origin.x + t * direction.x - center.x;
  const z = origin.z + t * direction.z - center.z;
  return Math.atan2(x, z) / DEG;
}

/** What a turn changes: a luminaire's pan, or a piece's rotation. */
interface Turnable {
  /** Where it turns around, and its angle now; undefined once it's gone. */
  current(): { readonly center: Vec3; readonly angleDeg: number } | undefined;
  turn(angleDeg: number, options: { readonly mergeKey: string }): void;
}

/**
 * One drag around a rotation ring: a luminaire's pan (tilt stays) or a
 * piece's rotation follows the pointer's turn around it, as one undo step.
 * Snaps to TURN_STEP_DEG.
 */
export class TurnDrag {
  readonly #turnable: Turnable;
  readonly #startDeg: number;
  /** The pointer's bearing when grabbed; null if the grab ray missed the ring's plane. */
  readonly #grabbedDeg: number | null;
  readonly #mergeKey = `turn-${crypto.randomUUID()}`;

  /** `ray` points at where the ring around `target` was grabbed. */
  constructor(simulator: Simulator, target: PickTarget, ray: Ray) {
    this.#turnable = turnable(simulator, target.kind, target.id);
    const now = this.#turnable.current();
    this.#startDeg = now?.angleDeg ?? 0;
    this.#grabbedDeg = now ? bearingAround(ray, now.center) : null;
  }

  /**
   * Turns by as much as the pointer has turned around the item since the
   * grab, in TURN_STEP_DEG steps unless `snap` is null.
   */
  moveTo(ray: Ray, snap: SnapOptions | null = null): void {
    const now = this.#turnable.current();
    const bearing = now ? bearingAround(ray, now.center) : null;
    if (bearing === null || this.#grabbedDeg === null) return;
    const free = wrapDeg(this.#startDeg + bearing - this.#grabbedDeg);
    this.#turnable.turn(snap ? snapTurn(free) : free, { mergeKey: this.#mergeKey });
  }
}

function turnable(simulator: Simulator, kind: PickTarget['kind'], id: string): Turnable {
  if (kind === 'luminaire') {
    const luminaire = () => simulator.scene.luminaires.find((l) => l.id === id);
    return {
      current: () => {
        const found = luminaire();
        return found && { center: found.position, angleDeg: found.aim.panDeg };
      },
      turn: (panDeg, options) => {
        const found = luminaire();
        if (found) simulator.updateLuminaire(id, { aim: { ...found.aim, panDeg } }, options);
      },
    };
  }
  const piece = () => simulator.scene.furniture.find((f) => f.id === id);
  return {
    current: () => {
      const found = piece();
      return found && { center: found.position, angleDeg: found.rotationDeg };
    },
    turn: (rotationDeg, options) => {
      if (piece()) simulator.updateFurniture(id, { rotationDeg }, options);
    },
  };
}
