// How a placed luminaire is turned, and where its light leaves from and
// points, in the world. The renderer applies `fixturePose` to its three.js
// objects; the illuminance calculation uses `luminaireFrame`. Both come from
// here so the picture and the numbers can't drift apart (ADR 0057).
//
// Rotations follow three.js: about y, a positive angle turns +z towards +x;
// about x, it turns +y towards +z. The aim tilts the light from straight down
// towards its local +z, then pans it about the vertical (Euler order YXZ).

import type { FixtureLayout } from './fixture-layout';
import { add, DEG, dot } from './math';
import { typeCAngles } from './render/lighting';
import type { Luminaire, MountType, Room, Vec3 } from './types';

/**
 * The turns that place a fixture, as the renderer applies them, in radians.
 * The light's rotation is `(−tiltRad, lightPanRad)` in Euler order YXZ.
 */
export interface FixturePose {
  /** The whole fixture about the vertical: away from its wall, plus pan when it has no head. */
  readonly rootYawRad: number;
  /** The head's turn, for fixtures with one: rotation `(−tiltRad, panRad)`, order YXZ. */
  readonly head?: { readonly tiltRad: number; readonly panRad: number };
  readonly tiltRad: number;
  /** The light's own pan: the aim's when a head carries it, else 0 (the root has it). */
  readonly lightPanRad: number;
  /** Where the light sits in the fixture's turned frame (the root's), in m. */
  readonly lightPosition: Vec3;
}

/**
 * A luminaire's light in the world: where it leaves from and its Type C axes
 * (ADR 0036), as unit vectors. Vertical 0° is `down`, horizontal 0° is
 * `forward`, horizontal 90° is `side`.
 */
export interface LuminaireFrame {
  readonly origin: Vec3;
  readonly down: Vec3;
  readonly forward: Vec3;
  readonly side: Vec3;
}

/**
 * How a luminaire's fixture is turned. A head (track spot) turns on its own,
 * carrying the light about its pivot. Without one, pan turns the whole
 * fixture, its installed orientation, so a model's asymmetric parts follow
 * its light (ADR 0043); tilt is then the light's alone.
 */
export function fixturePose(
  luminaire: Luminaire,
  mount: MountType,
  room: Room,
  layout: FixtureLayout,
): FixturePose {
  const tiltRad = luminaire.aim.tiltDeg * DEG;
  const panRad = luminaire.aim.panDeg * DEG;
  const wallYaw = mount === 'wall' ? yawAwayFromWall(luminaire.position, room) : 0;
  const { headPivot, lightOrigin } = layout;
  if (!headPivot) {
    return { rootYawRad: wallYaw + panRad, tiltRad, lightPanRad: 0, lightPosition: lightOrigin };
  }
  const arm = turn(
    {
      x: lightOrigin.x - headPivot.x,
      y: lightOrigin.y - headPivot.y,
      z: lightOrigin.z - headPivot.z,
    },
    tiltRad,
    panRad,
  );
  return {
    rootYawRad: wallYaw,
    head: { tiltRad, panRad },
    tiltRad,
    lightPanRad: panRad,
    lightPosition: add(headPivot, arm),
  };
}

/** Where a luminaire's light leaves from, and its Type C axes, in the world. */
export function luminaireFrame(
  luminaire: Luminaire,
  mount: MountType,
  room: Room,
  layout: FixtureLayout,
): LuminaireFrame {
  const pose = fixturePose(luminaire, mount, room, layout);
  const toWorld = (v: Vec3) => rotateY(turn(v, pose.tiltRad, pose.lightPanRad), pose.rootYawRad);
  return {
    origin: add(luminaire.position, rotateY(pose.lightPosition, pose.rootYawRad)),
    down: toWorld({ x: 0, y: -1, z: 0 }),
    forward: toWorld({ x: 0, y: 0, z: 1 }),
    side: toWorld({ x: 1, y: 0, z: 0 }),
  };
}

/** The Type C angles, in degrees, of a world direction leaving a luminaire with this frame. */
export function frameAngles(
  frame: LuminaireFrame,
  direction: Vec3,
): { verticalDeg: number; horizontalDeg: number } {
  const local = {
    x: dot(direction, frame.side),
    y: -dot(direction, frame.down),
    z: dot(direction, frame.forward),
  };
  return typeCAngles(local);
}

/**
 * The turn about the vertical, in radians, that faces a wall fixture away
 * from the wall it sits on (its local +z points into the room): the nearest wall.
 */
export function yawAwayFromWall(position: Vec3, room: Room): number {
  const distances: [number, number][] = [
    [position.z + room.depth / 2, 0],
    [room.depth / 2 - position.z, Math.PI],
    [position.x + room.width / 2, Math.PI / 2],
    [room.width / 2 - position.x, -Math.PI / 2],
  ];
  return distances.reduce((best, next) => (next[0] < best[0] ? next : best))[1];
}

/** `v` tilted by `tiltRad` about x (as rotation −tilt), then panned by `panRad` about y: order YXZ. */
function turn(v: Vec3, tiltRad: number, panRad: number): Vec3 {
  return rotateY(rotateX(v, -tiltRad), panRad);
}

/** `v` turned about the y axis by `angle` radians: +z towards +x. */
function rotateY(v: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: v.x * c + v.z * s, y: v.y, z: -v.x * s + v.z * c };
}

/** `v` turned about the x axis by `angle` radians: +y towards +z. */
function rotateX(v: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: v.x, y: v.y * c - v.z * s, z: v.y * s + v.z * c };
}
