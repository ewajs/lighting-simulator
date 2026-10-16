// The aim handle's logic: where a beam lands and aiming at a point. Its
// ring turns pan through turn.ts. Rays are plain data, so this runs without three.js.
// See ADR 0040.

import { DEG, rotateX, rotateY } from './math';
import type { Ray } from './placement';
import { roomSurfaceHit } from './placement';
import type { Simulator } from './simulator';
import type { Aim, Luminaire, MountType, Product, Room, Vec3 } from './types';

/** Mounts with an adjustable head, which the aim handle can turn. */
export const AIMABLE_MOUNTS: readonly MountType[] = ['recessed', 'track'];
/** Steepest tilt the aim handle sets: level with the ceiling, as in the inspector. */
export const MAX_TILT_DEG = 90;

/** Horizontal reach below which the beam points straight down and pan can't be read from it, in m. */
const VERTICAL_EPSILON = 1e-9;

/** Whether the aim handle applies to this product. */
export function isAimable(product: Product): boolean {
  return AIMABLE_MOUNTS.includes(product.mount);
}

/**
 * `v` turned by an aim, as the renderer turns a light: tilted from straight
 * down towards +z (a turn of −tilt about x), then panned about the vertical
 * (three.js' Euler order YXZ).
 */
export function aimed(v: Vec3, { tiltDeg, panDeg }: Aim): Vec3 {
  return rotateY(rotateX(v, -tiltDeg * DEG), panDeg * DEG);
}

/** The unit vector a luminaire points along: straight down, turned by its aim. */
export function aimDirection(aim: Aim): Vec3 {
  return aimed(STRAIGHT_DOWN, aim);
}

const STRAIGHT_DOWN: Vec3 = { x: 0, y: -1, z: 0 };

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

function findLuminaire(simulator: Simulator, id: string): Luminaire | undefined {
  return simulator.scene.luminaires.find((l) => l.id === id);
}
