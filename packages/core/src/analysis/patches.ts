// The surfaces that reflect light, split into patches for the bounced-light
// solve (ADR 0060). A patch is a general flat polygon with its own normal and
// reflectance, not a piece of a box, so furniture faces, openings and other
// room shapes can become patches later without changing the solve.

import { add, rotateY, scale } from '../math';
import type { Room, Vec3 } from '../types';
import type { Blocker } from './occlusion';

/** A flat piece of a reflecting surface. */
export interface Patch {
  /** Its corners, in order round its edge. */
  readonly vertices: readonly Vec3[];
  readonly centre: Vec3;
  /** The way it faces, into the room: a unit vector. */
  readonly normal: Vec3;
  /** In m². */
  readonly area: number;
  /** The share of the light reaching it that it reflects, diffusely: 0–1. */
  readonly reflectance: number;
  /** The longer of its sides, in m: how close counts as close (radiosity.ts). */
  readonly sizeM: number;
  /** Points spread over it, for averaging what it receives or sees. */
  readonly samples: readonly Vec3[];
}

/** Samples along each side of a patch: 2 × 2 points at the centres of equal cells. */
const SAMPLES_PER_SIDE = 2;

/**
 * Patches covering a rectangle: `corner` plus up to `lengthU` along the unit
 * vector `u` and `lengthV` along `v`, at most `sizeM` on a side.
 */
export function rectanglePatches(
  corner: Vec3,
  u: Vec3,
  v: Vec3,
  lengthU: number,
  lengthV: number,
  normal: Vec3,
  reflectance: number,
  sizeM: number,
): Patch[] {
  const columns = Math.max(1, Math.ceil(lengthU / sizeM));
  const rows = Math.max(1, Math.ceil(lengthV / sizeM));
  const du = lengthU / columns;
  const dv = lengthV / rows;
  const at = (a: number, b: number) => add(corner, add(scale(u, a), scale(v, b)));
  const patches: Patch[] = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < columns; i++) {
      const [a0, b0] = [i * du, j * dv];
      const samples: Vec3[] = [];
      for (let sj = 0; sj < SAMPLES_PER_SIDE; sj++) {
        for (let si = 0; si < SAMPLES_PER_SIDE; si++) {
          samples.push(
            at(
              a0 + ((si + 0.5) / SAMPLES_PER_SIDE) * du,
              b0 + ((sj + 0.5) / SAMPLES_PER_SIDE) * dv,
            ),
          );
        }
      }
      patches.push({
        vertices: [at(a0, b0), at(a0 + du, b0), at(a0 + du, b0 + dv), at(a0, b0 + dv)],
        centre: at(a0 + du / 2, b0 + dv / 2),
        normal,
        area: du * dv,
        reflectance,
        sizeM: Math.max(du, dv),
        samples,
      });
    }
  }
  return patches;
}

/** A rectangular room's floor, ceiling and four walls as patches, facing in. */
export function roomPatches(room: Room, sizeM: number): Patch[] {
  const { width, depth, height, surfaces } = room;
  const [x0, z0] = [-width / 2, -depth / 2];
  const X = { x: 1, y: 0, z: 0 };
  const Y = { x: 0, y: 1, z: 0 };
  const Z = { x: 0, y: 0, z: 1 };
  const flip = (n: Vec3) => scale(n, -1);
  const floor = surfaces.floor.reflectance;
  const ceiling = surfaces.ceiling.reflectance;
  const walls = surfaces.walls.reflectance;
  return [
    ...rectanglePatches({ x: x0, y: 0, z: z0 }, X, Z, width, depth, Y, floor, sizeM),
    ...rectanglePatches({ x: x0, y: height, z: z0 }, X, Z, width, depth, flip(Y), ceiling, sizeM),
    ...rectanglePatches({ x: x0, y: 0, z: z0 }, Z, Y, depth, height, X, walls, sizeM),
    ...rectanglePatches({ x: -x0, y: 0, z: z0 }, Z, Y, depth, height, flip(X), walls, sizeM),
    ...rectanglePatches({ x: x0, y: 0, z: z0 }, X, Y, width, height, Z, walls, sizeM),
    ...rectanglePatches({ x: x0, y: 0, z: -z0 }, X, Y, width, height, flip(Z), walls, sizeM),
  ];
}

/** A box face this close to the floor rests on it: it neither receives nor sends light, in m. */
const ON_FLOOR_M = 1e-6;

/**
 * A furniture box's faces as patches, facing out, with its reflectance
 * (ADR 0063): the top, the four sides, and the bottom when it's off the floor
 * (a table top's underside).
 */
export function boxPatches(blocker: Blocker, sizeM: number): Patch[] {
  const { centre, half, yawRad, reflectance } = blocker;
  // The box's own axes in the room: x across, y up, z front to back.
  const ax = rotateY({ x: 1, y: 0, z: 0 }, yawRad);
  const ay = { x: 0, y: 1, z: 0 };
  const az = rotateY({ x: 0, y: 0, z: 1 }, yawRad);
  const point = (x: number, y: number, z: number) =>
    add(centre, add(scale(ax, x), add(scale(ay, y), scale(az, z))));
  const neg = (v: Vec3) => scale(v, -1);
  const [hx, hy, hz] = [half.x, half.y, half.z];
  const face = (corner: Vec3, u: Vec3, v: Vec3, lu: number, lv: number, normal: Vec3) =>
    rectanglePatches(corner, u, v, lu, lv, normal, reflectance, sizeM);
  const faces = [
    face(point(-hx, hy, -hz), ax, az, 2 * hx, 2 * hz, ay),
    face(point(hx, -hy, -hz), az, ay, 2 * hz, 2 * hy, ax),
    face(point(-hx, -hy, -hz), az, ay, 2 * hz, 2 * hy, neg(ax)),
    face(point(-hx, -hy, hz), ax, ay, 2 * hx, 2 * hy, az),
    face(point(-hx, -hy, -hz), ax, ay, 2 * hx, 2 * hy, neg(az)),
  ];
  if (centre.y - hy > ON_FLOOR_M)
    faces.push(face(point(-hx, -hy, -hz), ax, az, 2 * hx, 2 * hz, neg(ay)));
  return faces.flat();
}
