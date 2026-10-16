// The demo's own files work with core: its IES files' luminous openings, and
// where core finds the light in each of its models (ADR 0057).
import { modelLayout, parseIes, type Photometry } from '@luxstudio/core';
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
