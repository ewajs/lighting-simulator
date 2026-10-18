import * as THREE from 'three/webgpu';
import { describe, expect, it } from 'vitest';
import { placeholderLayout, type FixtureLayout } from './fixture-layout';
import { aimDirection } from './aim';
import { fixturePose, frameAngles, luminaireFrame, yawAwayFromWall } from './luminaire-frame';
import { LuminaireMeshes } from './render/LuminaireMeshes';
import { catalog, PRODUCTS, room } from './test-fixtures';
import type { Aim, Luminaire, MountType, Photometry, Vec3 } from './types';
import { DEFAULT_DAYLIGHT } from './daylight';

const expectClose = (actual: Vec3, expected: Vec3, digits = 9) => {
  expect(actual.x).toBeCloseTo(expected.x, digits);
  expect(actual.y).toBeCloseTo(expected.y, digits);
  expect(actual.z).toBeCloseTo(expected.z, digits);
};

const luminaire = (mount: MountType, position: Vec3, aim: Aim = { tiltDeg: 0, panDeg: 0 }) =>
  ({
    id: 'l',
    productId: `test-${mount}`,
    position,
    aim,
    dimming: 1,
    on: true,
    cct: 3000,
  }) satisfies Luminaire;

const AT_ORIGIN: FixtureLayout = { lightOrigin: { x: 0, y: 0, z: 0 } };

describe('luminaireFrame', () => {
  it('points straight down at rest, with horizontal 0° along +z and 90° along +x', () => {
    const frame = luminaireFrame(
      luminaire('recessed', { x: 1, y: 2.7, z: -1 }),
      'recessed',
      room,
      AT_ORIGIN,
    );
    expectClose(frame.origin, { x: 1, y: 2.7, z: -1 });
    expectClose(frame.down, { x: 0, y: -1, z: 0 });
    expectClose(frame.forward, { x: 0, y: 0, z: 1 });
    expectClose(frame.side, { x: 1, y: 0, z: 0 });
  });

  it('aims down where aimDirection says, for every tilt and pan', () => {
    for (const tiltDeg of [0, 15, 45, 90]) {
      for (const panDeg of [-135, -30, 0, 60, 180]) {
        const aim = { tiltDeg, panDeg };
        const frame = luminaireFrame(
          luminaire('recessed', { x: 0, y: 2.7, z: 0 }, aim),
          'recessed',
          room,
          AT_ORIGIN,
        );
        expectClose(frame.down, aimDirection(aim));
      }
    }
  });

  it('keeps the axes unit length and at right angles', () => {
    const frame = luminaireFrame(
      luminaire('track', { x: 0, y: 2.7, z: 0 }, { tiltDeg: 35, panDeg: 70 }),
      'track',
      room,
      placeholderLayout('track'),
    );
    const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;
    for (const axis of [frame.down, frame.forward, frame.side])
      expect(dot(axis, axis)).toBeCloseTo(1, 12);
    expect(dot(frame.down, frame.forward)).toBeCloseTo(0, 12);
    expect(dot(frame.down, frame.side)).toBeCloseTo(0, 12);
    expect(dot(frame.forward, frame.side)).toBeCloseTo(0, 12);
  });

  it('puts a recessed light 3 cm below its position, as the placeholder draws it', () => {
    const frame = luminaireFrame(
      luminaire('recessed', { x: 0, y: 2.7, z: 0 }),
      'recessed',
      room,
      placeholderLayout('recessed'),
    );
    expectClose(frame.origin, { x: 0, y: 2.67, z: 0 });
  });

  it('carries a track light round its head pivot as the head tilts', () => {
    // Pivot 0.1 m below the rail, light 0.08 m below the pivot. Tilted 90° towards +z,
    // the arm (0, −0.08, 0) swings to (0, 0, 0.08); panned 90°, to (0.08, 0, 0).
    const position = { x: 0, y: 2.7, z: 0 };
    const layout = placeholderLayout('track');
    const tilted = luminaireFrame(
      luminaire('track', position, { tiltDeg: 90, panDeg: 0 }),
      'track',
      room,
      layout,
    );
    expectClose(tilted.origin, { x: 0, y: 2.6, z: 0.08 });
    const panned = luminaireFrame(
      luminaire('track', position, { tiltDeg: 90, panDeg: 90 }),
      'track',
      room,
      layout,
    );
    expectClose(panned.origin, { x: 0.08, y: 2.6, z: 0 });
  });

  it('turns a wall light to face away from its wall, its light 5 cm into the room', () => {
    // On the wall at x = −2.5: turned +90°, so its local +z (forward) points along +x.
    const frame = luminaireFrame(
      luminaire('wall', { x: -2.5, y: 1.8, z: 0.5 }),
      'wall',
      room,
      placeholderLayout('wall'),
    );
    expectClose(frame.forward, { x: 1, y: 0, z: 0 });
    expectClose(frame.side, { x: 0, y: 0, z: -1 });
    expectClose(frame.origin, { x: -2.45, y: 1.73, z: 0.5 });
  });

  it('lifts a floor lamp’s light into its shade', () => {
    const frame = luminaireFrame(
      luminaire('floor', { x: 1, y: 0, z: 1 }),
      'floor',
      room,
      placeholderLayout('floor'),
    );
    expectClose(frame.origin, { x: 1, y: 1.275, z: 1 });
  });
});

describe('yawAwayFromWall', () => {
  it('faces each of the four walls into the room', () => {
    expect(yawAwayFromWall({ x: 0, y: 1.8, z: -2 }, room)).toBeCloseTo(0); // +z
    expect(yawAwayFromWall({ x: 0, y: 1.8, z: 2 }, room)).toBeCloseTo(Math.PI); // −z
    expect(yawAwayFromWall({ x: -2.5, y: 1.8, z: 0 }, room)).toBeCloseTo(Math.PI / 2); // +x
    expect(yawAwayFromWall({ x: 2.5, y: 1.8, z: 0 }, room)).toBeCloseTo(-Math.PI / 2); // −x
  });
});

describe('frameAngles', () => {
  const frame = luminaireFrame(
    luminaire('recessed', { x: 0, y: 2.7, z: 0 }),
    'recessed',
    room,
    AT_ORIGIN,
  );

  it('reads Type C angles: nadir 0°, horizontal 0° forward and 90° to the side', () => {
    expect(frameAngles(frame, { x: 0, y: -1, z: 0 }).verticalDeg).toBeCloseTo(0);
    expect(frameAngles(frame, { x: 0, y: 0, z: 1 })).toEqual({ verticalDeg: 90, horizontalDeg: 0 });
    const side = frameAngles(frame, { x: 1, y: 0, z: 0 });
    expect(side.verticalDeg).toBeCloseTo(90);
    expect(side.horizontalDeg).toBeCloseTo(90);
    expect(frameAngles(frame, { x: 0, y: 1, z: 0 }).verticalDeg).toBeCloseTo(180);
  });

  it('follows the aim: the aim itself reads as 0°', () => {
    const aimed = luminaireFrame(
      luminaire('recessed', { x: 0, y: 2.7, z: 0 }, { tiltDeg: 40, panDeg: 25 }),
      'recessed',
      room,
      AT_ORIGIN,
    );
    expect(frameAngles(aimed, aimDirection({ tiltDeg: 40, panDeg: 25 })).verticalDeg).toBeCloseTo(
      0,
      6,
    );
  });
});

/** A rotationally symmetric file, so the renderer builds an IES light, whose rotation is the aim. */
const PHOTOMETRY: Photometry = {
  verticalDeg: [0, 90],
  horizontalDeg: [0],
  candela: [[100, 0]],
  power: 10,
  luminousOpening: { widthM: 0, lengthM: 0, heightM: 0, round: false },
  keywords: {},
};

describe('the renderer and the calculation agree', () => {
  /** Draws one luminaire with the real LuminaireMeshes and reads its light back from three.js. */
  function drawnLight(placed: Luminaire) {
    const meshes = new LuminaireMeshes({
      catalog,
      ready: () => true,
      photometry: () => PHOTOMETRY,
      model: () => undefined,
      modelFile: () => undefined,
      logger: { debug() {}, info() {}, warn() {}, error() {} },
    });
    meshes.sync(
      { room, luminaires: [placed], furniture: [], windows: [], daylight: DEFAULT_DAYLIGHT },
      [],
      'realistic',
    );
    let light: THREE.Object3D | undefined;
    meshes.group.traverse((object) => {
      if ((object as THREE.Light).isLight) light = object;
    });
    meshes.group.updateMatrixWorld(true);
    const world = light!.matrixWorld;
    const column = (i: number) => new THREE.Vector3().setFromMatrixColumn(world, i).normalize();
    const toVec = (v: THREE.Vector3) => ({ x: v.x, y: v.y, z: v.z });
    meshes.dispose();
    return {
      origin: toVec(new THREE.Vector3().setFromMatrixPosition(world)),
      down: toVec(column(1).negate()),
      forward: toVec(column(2)),
      side: toVec(column(0)),
    };
  }

  const positions: Record<MountType, Vec3[]> = {
    recessed: [{ x: 0.4, y: 2.7, z: -0.3 }],
    track: [{ x: -1, y: 2.7, z: 1 }],
    pendant: [{ x: 0, y: 1.9, z: 0 }],
    wall: [
      { x: -2.5, y: 1.8, z: 0.5 },
      { x: 2.5, y: 1.8, z: -0.5 },
      { x: 1, y: 1.8, z: -2 },
      { x: -1, y: 1.8, z: 2 },
    ],
    floor: [{ x: 1, y: 0, z: 1 }],
    table: [{ x: -1, y: 0.75, z: 0 }],
  };
  const aims: Aim[] = [
    { tiltDeg: 0, panDeg: 0 },
    { tiltDeg: 30, panDeg: 45 },
    { tiltDeg: 75, panDeg: -120 },
  ];

  for (const { mount } of PRODUCTS) {
    it(`places and turns a ${mount} light the same way`, () => {
      for (const position of positions[mount]) {
        for (const aim of aims) {
          const placed = luminaire(mount, position, aim);
          const drawn = drawnLight(placed);
          const computed = luminaireFrame(placed, mount, room, placeholderLayout(mount));
          expectClose(drawn.origin, computed.origin, 6);
          expectClose(drawn.down, computed.down, 6);
          expectClose(drawn.forward, computed.forward, 6);
          expectClose(drawn.side, computed.side, 6);
        }
      }
    });
  }

  it('poses a head as the light moves', () => {
    const pose = fixturePose(
      luminaire('track', { x: 0, y: 2.7, z: 0 }, { tiltDeg: 20, panDeg: 10 }),
      'track',
      room,
      placeholderLayout('track'),
    );
    expect(pose.head).toEqual({ tiltRad: (20 * Math.PI) / 180, panRad: (10 * Math.PI) / 180 });
    expect(pose.rootYawRad).toBe(0);
  });
});
