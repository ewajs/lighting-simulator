// The illuminance calculation (ADR 0057) against the demo's real
// manufacturer IES files and models: values read by hand from the files,
// conservation of each file's flux, and where each model's light comes from.
import {
  DEFAULT_ROOM,
  directIlluminance,
  directLight,
  modelLayout,
  parseIes,
  totalFlux,
  type AnalysisInputs,
  type Luminaire,
  type Photometry,
  type PointSource,
  type Room,
  type Vec3,
} from '@luxstudio/core';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { describe, expect, it } from 'vitest';
import wallWasher from '../public/ies/C3L10935NZ10U-C3RLWCC.ies?raw';
import upDown from '../public/ies/CB3326-L35K-H.ies?raw';
import linear from '../public/ies/HP-2-ID-4ft-H-B-835-ITL85132.008.ies?raw';
import downlight from '../public/ies/LX6C15D010-EX6C159030-6LBMH.ies?raw';
import trackSpot from '../public/ies/qg63_b35q.ies?raw';
import downlightModel from '../public/models/ies-downlight.glb?inline';
import linearModel from '../public/models/ies-linear-pendant.glb?inline';
import trackModel from '../public/models/ies-track-spot.glb?inline';
import upDownModel from '../public/models/ies-wall-up-down.glb?inline';
import wallWasherModel from '../public/models/ies-wall-washer.glb?inline';
import { sampleCatalog } from './sample-catalog';

const FILES: Record<string, Photometry> = {
  'ies-downlight': parseIes(downlight),
  'ies-track-spot': parseIes(trackSpot),
  'ies-linear-pendant': parseIes(linear),
  'ies-wall-washer': parseIes(wallWasher),
  'ies-wall-up-down': parseIes(upDown),
};

const MODELS: Record<string, string> = {
  'ies-downlight': downlightModel,
  'ies-track-spot': trackModel,
  'ies-linear-pendant': linearModel,
  'ies-wall-washer': wallWasherModel,
  'ies-wall-up-down': upDownModel,
};

/** A model imported with `?inline`: a base64 data URL, back to its bytes. */
function bytes(dataUrl: string): ArrayBuffer {
  const binary = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0)).buffer;
}

const room: Room = DEFAULT_ROOM;
const UP: Vec3 = { x: 0, y: 1, z: 0 };
const FULL = { workPlaneHeightM: 0.8, borderM: 0.5, maintenanceFactor: 1 };

const placed = (productId: string, position: Vec3, tiltDeg = 0, panDeg = 0): Luminaire => ({
  id: productId,
  productId,
  position,
  aim: { tiltDeg, panDeg },
  dimming: 1,
  on: true,
  cct: 3000,
});

/** The demo's catalog and IES files, with no models: lights at the placeholders' positions. */
const inputs: AnalysisInputs = {
  catalog: sampleCatalog,
  photometry: (id) => FILES[id],
  modelFile: () => undefined,
};

describe('the luminous openings in the demo’s files', () => {
  it('are converted from feet, with their shapes', () => {
    expect(FILES['ies-downlight']!.luminousOpening).toMatchObject({ round: true, heightM: 0 });
    expect(FILES['ies-downlight']!.luminousOpening.widthM).toBeCloseTo(0.1524, 12); // −0.5 ft
    expect(FILES['ies-wall-washer']!.luminousOpening.widthM).toBeCloseTo(0.0762, 12); // −0.25 ft
    const pendant = FILES['ies-linear-pendant']!.luminousOpening; // 0.177 × 4 ft
    expect(pendant.lengthM).toBeCloseTo(1.2192, 12);
    expect(pendant.widthM).toBeCloseTo(0.05397, 5);
    const sconce = FILES['ies-wall-up-down']!.luminousOpening; // 0.77 × 0.43 × 1.67 ft
    expect([sconce.widthM, sconce.lengthM, sconce.heightM]).toEqual([
      0.77 * 0.3048,
      0.43 * 0.3048,
      1.67 * 0.3048,
    ]);
  });

  it('are kept in metres when the file says so', () => {
    expect(FILES['ies-track-spot']!.luminousOpening).toEqual({
      widthM: 0.095,
      lengthM: 0.095,
      heightM: 0,
      round: true,
    });
  });
});

describe('the Cooper downlight, by hand from its file', () => {
  // Its light sits 3 cm below the fixture (the placeholder's and the model's
  // `light` node): placed at 2.73 m, it shines from 2.70 m above the floor.
  const light = directLight(
    { room, luminaires: [placed('ies-downlight', { x: 0, y: 2.73, z: 0 })], furniture: [] },
    inputs,
    FULL,
  );
  const at = (x: number) => directIlluminance({ x, y: 0, z: 0 }, UP, light.sources, light.blockers);

  // Its 15 cm opening is split into four cells 5.4 cm off centre (sources.ts),
  // each of which sees these points about 1° off where a single point would,
  // so the values land within 0.3 % of the single-point hand values.
  const WITHIN = 0.003;

  it('gives I(0°) / h² straight below: 1142.1 / 2.7² = 156.67 lx', () => {
    expect(Math.abs(at(0) / (1142.1 / 2.7 ** 2) - 1)).toBeLessThan(WITHIN);
  });

  it('gives I(θ) · cos θ / d² 1 m to the side: 98.15 lx', () => {
    // θ = atan(1 / 2.7) = 20.32°, between the file's 873.4 cd at 20° and 828.9 cd
    // at 22.5°: I = 867.65 cd. d² = 1 + 2.7² = 8.29, cos θ = 2.7 / √8.29.
    const expected = (867.648 * (2.7 / Math.sqrt(8.29))) / 8.29;
    expect(Math.abs(at(1) / expected - 1)).toBeLessThan(WITHIN);
  });
});

/** Integration cells for the flux check, in m: these files land within 0.06 % at this size. */
const FLUX_CELL_M = 0.05;
const AXES = { x: { x: 1, y: 0, z: 0 }, y: UP, z: { x: 0, y: 0, z: 1 } };

/** Light landing on the room's six surfaces, in lm: illuminance × area over FLUX_CELL_M cells. */
function fluxOnRoom(sources: readonly PointSource[]): number {
  const { width: w, depth: d, height: h } = room;
  const neg = (v: Vec3) => ({ x: -v.x, y: -v.y, z: -v.z });
  const faces = [
    { origin: { x: -w / 2, y: 0, z: -d / 2 }, u: AXES.x, v: AXES.z, lu: w, lv: d, n: AXES.y },
    { origin: { x: -w / 2, y: h, z: -d / 2 }, u: AXES.x, v: AXES.z, lu: w, lv: d, n: neg(AXES.y) },
    { origin: { x: -w / 2, y: 0, z: -d / 2 }, u: AXES.z, v: AXES.y, lu: d, lv: h, n: AXES.x },
    { origin: { x: w / 2, y: 0, z: -d / 2 }, u: AXES.z, v: AXES.y, lu: d, lv: h, n: neg(AXES.x) },
    { origin: { x: -w / 2, y: 0, z: -d / 2 }, u: AXES.x, v: AXES.y, lu: w, lv: h, n: AXES.z },
    { origin: { x: -w / 2, y: 0, z: d / 2 }, u: AXES.x, v: AXES.y, lu: w, lv: h, n: neg(AXES.z) },
  ];
  let lumens = 0;
  for (const { origin, u, v, lu, lv, n } of faces) {
    const nu = Math.round(lu / FLUX_CELL_M);
    const nv = Math.round(lv / FLUX_CELL_M);
    const area = (lu / nu) * (lv / nv);
    for (let i = 0; i < nu; i++) {
      for (let j = 0; j < nv; j++) {
        const a = ((i + 0.5) / nu) * lu;
        const b = ((j + 0.5) / nv) * lv;
        const point = {
          x: origin.x + u.x * a + v.x * b,
          y: origin.y + u.y * a + v.y * b,
          z: origin.z + u.z * a + v.z * b,
        };
        lumens += directIlluminance(point, n, sources, []) * area;
      }
    }
  }
  return lumens;
}

describe('each real file’s flux lands on the room', () => {
  // Hung mid-room so no surface is closer than the 5 × 10 cm the cells are good for.
  const aims = [
    [0, 0],
    [40, 65],
    [80, -150],
  ] as const;
  for (const id of Object.keys(FILES)) {
    it(`${id}, at every aim: illuminance × area adds up to the file's flux`, () => {
      const file = FILES[id]!;
      for (const [tilt, pan] of aims) {
        const position =
          id === 'ies-wall-up-down' ? { x: 0.6, y: 1.35, z: -0.4 } : { x: 0.3, y: 1.35, z: 0.2 };
        const light = directLight(
          { room, luminaires: [placed(id, position, tilt, pan)], furniture: [] },
          {
            ...inputs,
            catalog: { get: (pid) => ({ ...sampleCatalog.get(pid)!, mount: 'recessed' }) },
          },
          FULL,
        );
        expect(Math.abs(fluxOnRoom(light.sources) / totalFlux(file) - 1)).toBeLessThan(0.002);
      }
    });
  }
});

describe('the demo’s models', () => {
  for (const [id, dataUrl] of Object.entries(MODELS)) {
    it(`${id}: core reads its light and head where three.js does`, async () => {
      const file = bytes(dataUrl);
      const { scene } = await new GLTFLoader().parseAsync(file, '');
      scene.updateMatrixWorld(true);
      const worldPosition = (name: string) => {
        const node = scene.getObjectByName(name);
        if (!node) return undefined;
        const { x, y, z } = node.getWorldPosition(new THREE.Vector3());
        return { x, y, z };
      };
      const layout = modelLayout(file);
      const light = worldPosition('light') ?? { x: 0, y: 0, z: 0 };
      for (const axis of ['x', 'y', 'z'] as const) {
        expect(layout.lightOrigin[axis]).toBeCloseTo(light[axis], 6);
      }
      const head = worldPosition('head');
      expect(layout.headPivot === undefined).toBe(head === undefined);
      if (head && layout.headPivot) {
        for (const axis of ['x', 'y', 'z'] as const) {
          expect(layout.headPivot[axis]).toBeCloseTo(head[axis], 6);
        }
      }
    });
  }
});
