// The aim handle's logic: where a beam lands, aiming at a point, and turning
// around the vertical. Rays are plain data, so this runs without three.js.
// See ADR 0040.

import type { Ray } from './placement';
import { roomSurfaceHit } from './placement';
import type { Simulator } from './simulator';
import { snapPan, type SnapOptions } from './snap';
import type { Aim, Luminaire, MountType, Product, Room, Vec3 } from './types';

/** Mounts with an adjustable head, which the aim handle can turn. */
export const AIMABLE_MOUNTS: readonly MountType[] = ['recessed', 'track'];
/** Steepest tilt the aim handle sets: level with the ceiling, as in the inspector. */
export const MAX_TILT_DEG = 90;

const DEG = Math.PI / 180;
/** Horizontal reach below which the beam points straight down and pan can't be read from it, in m. */
const VERTICAL_EPSILON = 1e-9;

/** Whether the aim handle applies to this product. */
export function isAimable(product: Product): boolean {
  return AIMABLE_MOUNTS.includes(product.mount);
}

/**
 * The unit vector a luminaire points along: straight down at zero tilt,
 * tilted towards +z, then turned around the vertical by pan (the renderer's
 * Euler order YXZ).
 */
export function aimDirection({ tiltDeg, panDeg }: Aim): Vec3 {
  const tilt = tiltDeg * DEG;
  const pan = panDeg * DEG;
  return {
    x: Math.sin(tilt) * Math.sin(pan),
    y: -Math.cos(tilt),
    z: Math.sin(tilt) * Math.cos(pan),
  };
}

/**
 * Where a luminaire's beam centre meets the room, leaving from `position`
 * inside it. Falls back to `position` if the direction leaves no room to travel.
 */
export function beamHit(position: Vec3, aim: Aim, room: Room): Vec3 {
  const direction = aimDirection(aim);
  const halfWidth = room.width / 2;
  const halfDepth = room.depth / 2;
  // Distance to the far side of the room along each axis the beam moves on.
  const exits: number[] = [];
  const exit = (from: number, step: number, min: number, max: number) => {
    if (step > VERTICAL_EPSILON) exits.push((max - from) / step);
    if (step < -VERTICAL_EPSILON) exits.push((min - from) / step);
  };
  exit(position.x, direction.x, -halfWidth, halfWidth);
  exit(position.y, direction.y, 0, room.height);
  exit(position.z, direction.z, -halfDepth, halfDepth);
  const t = Math.max(0, Math.min(...exits));
  return {
    x: position.x + t * direction.x,
    y: position.y + t * direction.y,
    z: position.z + t * direction.z,
  };
}

/**
 * The aim that points from `position` at `target`, with tilt limited to
 * MAX_TILT_DEG. A target straight below keeps `currentPanDeg`, since any pan
 * points there.
 */
export function aimAt(position: Vec3, target: Vec3, currentPanDeg: number): Aim {
  const dx = target.x - position.x;
  const dz = target.z - position.z;
  const horizontal = Math.hypot(dx, dz);
  const tiltDeg = Math.min(MAX_TILT_DEG, Math.atan2(horizontal, position.y - target.y) / DEG);
  const panDeg = horizontal < VERTICAL_EPSILON ? currentPanDeg : Math.atan2(dx, dz) / DEG;
  return { tiltDeg, panDeg };
}

/** An angle in degrees wrapped into [−180, 180). */
export function wrapDeg(deg: number): number {
  return ((((deg + 180) % 360) + 360) % 360) - 180;
}

/**
 * The bearing of a ray around a vertical axis through `center`, in degrees,
 * measured like pan (0 towards +z, 90 towards +x). Read on the horizontal
 * plane through `center`; null if the ray runs parallel to it or away.
 */
export function bearingAround(ray: Ray, center: Vec3): number | null {
  const { origin, direction } = ray;
  if (Math.abs(direction.y) < VERTICAL_EPSILON) return null;
  const t = (center.y - origin.y) / direction.y;
  if (t <= 0) return null;
  const x = origin.x + t * direction.x - center.x;
  const z = origin.z + t * direction.z - center.z;
  return Math.atan2(x, z) / DEG;
}

/** One drag of the aim point: the luminaire turns to point where the ray meets the room. */
export class AimPointDrag {
  readonly #simulator: Simulator;
  readonly #id: string;
  readonly #mergeKey = `aim-point-${crypto.randomUUID()}`;

  constructor(simulator: Simulator, id: string) {
    this.#simulator = simulator;
    this.#id = id;
  }

  /** Aims at where `ray` meets the room. Rays that miss it are ignored. */
  moveTo(ray: Ray): void {
    const luminaire = findLuminaire(this.#simulator, this.#id);
    const target = luminaire && roomSurfaceHit(ray, this.#simulator.scene.room);
    if (!luminaire || !target) return;
    const aim = aimAt(luminaire.position, target, luminaire.aim.panDeg);
    this.#simulator.updateLuminaire(this.#id, { aim }, { mergeKey: this.#mergeKey });
  }
}

/** One drag around the rotation ring: pan follows the pointer's turn, tilt stays. Snaps to PAN_STEP_DEG. */
export class PanDrag {
  readonly #simulator: Simulator;
  readonly #id: string;
  readonly #startPanDeg: number;
  /** The pointer's bearing when grabbed; null if the grab ray missed the ring's plane. */
  readonly #grabbedDeg: number | null;
  readonly #mergeKey = `pan-${crypto.randomUUID()}`;

  /** `ray` points at where the ring was grabbed. */
  constructor(simulator: Simulator, id: string, ray: Ray) {
    const luminaire = findLuminaire(simulator, id);
    this.#simulator = simulator;
    this.#id = id;
    this.#startPanDeg = luminaire?.aim.panDeg ?? 0;
    this.#grabbedDeg = luminaire ? bearingAround(ray, luminaire.position) : null;
  }

  /**
   * Turns by as much as the pointer has turned around the luminaire since the
   * grab, in PAN_STEP_DEG steps unless `snap` is null.
   */
  moveTo(ray: Ray, snap: SnapOptions | null = null): void {
    const luminaire = findLuminaire(this.#simulator, this.#id);
    const bearing = luminaire && bearingAround(ray, luminaire.position);
    if (!luminaire || bearing === null || bearing === undefined || this.#grabbedDeg === null) {
      return;
    }
    const freePanDeg = wrapDeg(this.#startPanDeg + bearing - this.#grabbedDeg);
    const panDeg = snap ? snapPan(freePanDeg) : freePanDeg;
    this.#simulator.updateLuminaire(
      this.#id,
      { aim: { ...luminaire.aim, panDeg } },
      { mergeKey: this.#mergeKey },
    );
  }
}

function findLuminaire(simulator: Simulator, id: string): Luminaire | undefined {
  return simulator.scene.luminaires.find((l) => l.id === id);
}
