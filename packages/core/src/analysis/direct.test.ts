// Direct illuminance against values worked out by hand: E = I · cos α / d².
import { describe, expect, it } from 'vitest';
import type { FixtureLayout } from '../fixture-layout';
import { luminaireFrame } from '../luminaire-frame';
import { isotropic, photometry, product, room } from '../test-fixtures';
import type { Aim, Photometry, Vec3 } from '../types';
import { directIlluminance } from './direct';
import { furnitureBlockers } from './occlusion';
import { distributionOf, luminaireSources } from './sources';

const UP: Vec3 = { x: 0, y: 1, z: 0 };
const AT_ORIGIN: FixtureLayout = { lightOrigin: { x: 0, y: 0, z: 0 } };

/** A recessed luminaire's sources with its light exactly at `position`. */
function sourcesAt(
  position: Vec3,
  file: Photometry,
  aim: Aim = { tiltDeg: 0, panDeg: 0 },
  level = 1,
) {
  const placed = {
    id: 'l',
    productId: 'test-recessed',
    position,
    aim,
    dimming: 1,
    on: true,
    cct: 3000,
  };
  const frame = luminaireFrame(placed, 'recessed', room, AT_ORIGIN);
  return luminaireSources(
    frame,
    distributionOf(product('recessed'), file),
    file.luminousOpening,
    level,
  );
}

describe('directIlluminance: an isotropic 1000 cd source', () => {
  const sources = sourcesAt({ x: 0, y: 2, z: 0 }, isotropic(1000));

  it('gives I / h² straight below: 1000 / 2² = 250 lx', () => {
    expect(directIlluminance({ x: 0, y: 0, z: 0 }, UP, sources, [])).toBeCloseTo(250, 9);
  });

  it('gives I · h / d³ off to the side: 1000 · 2 / 5^1.5 = 178.885 lx at 1 m', () => {
    // d² = 1² + 2² = 5 and cos α = h / d = 2 / √5.
    expect(directIlluminance({ x: 1, y: 0, z: 0 }, UP, sources, [])).toBeCloseTo(178.8854382, 6);
  });

  it('falls with the square of the distance', () => {
    const near = sourcesAt({ x: 0, y: 1, z: 0 }, isotropic(1000));
    expect(directIlluminance({ x: 0, y: 0, z: 0 }, UP, near, [])).toBeCloseTo(1000, 9);
  });

  it('lights a wall facing it square on: 1000 / 1² = 1000 lx at 1 m', () => {
    expect(directIlluminance({ x: -1, y: 2, z: 0 }, { x: 1, y: 0, z: 0 }, sources, [])).toBeCloseTo(
      1000,
      9,
    );
  });

  it('gives nothing to a surface facing away', () => {
    expect(directIlluminance({ x: -1, y: 2, z: 0 }, { x: -1, y: 0, z: 0 }, sources, [])).toBe(0);
  });

  it('scales with the level: dimmed to 50 %, 125 lx', () => {
    const dimmed = sourcesAt({ x: 0, y: 2, z: 0 }, isotropic(1000), undefined, 0.5);
    expect(directIlluminance({ x: 0, y: 0, z: 0 }, UP, dimmed, [])).toBeCloseTo(125, 9);
  });

  it('gives nothing where furniture blocks the light', () => {
    const table = furnitureBlockers([
      {
        id: 't',
        kind: 'dining-table',
        position: { x: 0, y: 0, z: 0 },
        rotationDeg: 0,
        size: { width: 1, depth: 1, height: 0.75 },
        finish: { main: 'oak', accent: 'oak' },
      },
    ]);
    expect(directIlluminance({ x: 0, y: 0, z: 0 }, UP, sources, table)).toBe(0);
    // Beside the table the light still lands: 1 m out, 178.885 lx as above.
    expect(directIlluminance({ x: 1, y: 0, z: 0 }, UP, sources, table)).toBeCloseTo(178.8854382, 6);
  });
});

describe('directIlluminance: a downlight distribution', () => {
  // Rotationally symmetric: 1000 cd at nadir, 800 at 30°, 300 at 60°, 0 at 90°.
  const downlight = photometry([0, 30, 60, 90], [0], [[1000, 800, 300, 0]]);

  it('reads the table at the point’s angle: 800 · cos 30° / (2 / cos 30°)² = 129.904 lx', () => {
    // 2 m below and 2 · tan 30° to the side: the point is 30° off the nadir.
    const sources = sourcesAt({ x: 0, y: 2, z: 0 }, downlight);
    const x = 2 * Math.tan(Math.PI / 6);
    expect(directIlluminance({ x, y: 0, z: 0 }, UP, sources, [])).toBeCloseTo(129.9038106, 6);
  });

  it('interpolates between rows: 15° is halfway, 900 cd', () => {
    // 900 · cos 15° / (2 / cos 15°)² = 225 · cos³ 15°.
    const sources = sourcesAt({ x: 0, y: 2, z: 0 }, downlight);
    const x = 2 * Math.tan(Math.PI / 12);
    expect(directIlluminance({ x, y: 0, z: 0 }, UP, sources, [])).toBeCloseTo(
      225 * Math.cos(Math.PI / 12) ** 3,
      6,
    );
  });

  it('follows the aim: tilted 30°, straight below is 30° off its axis, 800 / 2² = 200 lx', () => {
    const sources = sourcesAt({ x: 0, y: 2, z: 0 }, downlight, { tiltDeg: 30, panDeg: 0 });
    expect(directIlluminance({ x: 0, y: 0, z: 0 }, UP, sources, [])).toBeCloseTo(200, 6);
  });
});

describe('directIlluminance: an asymmetric distribution', () => {
  // Bilateral (0–180°): at 45° below the horizon, 1000 cd forward (0°), 500 cd
  // to the sides (90°) and 200 cd backward (180°).
  const asymmetric = photometry(
    [0, 45, 90],
    [0, 90, 180],
    [
      [600, 1000, 0],
      [600, 500, 0],
      [600, 200, 0],
    ],
  );
  // The point (0, 0, 2) is 45° below a source at (0, 2, 0): d² = 8, cos α = 1/√2.
  const point = { x: 0, y: 0, z: 2 };

  it('sends its forward intensity along +z: 1000 / (8 √2) = 88.388 lx', () => {
    const sources = sourcesAt({ x: 0, y: 2, z: 0 }, asymmetric);
    expect(directIlluminance(point, UP, sources, [])).toBeCloseTo(1000 / (8 * Math.SQRT2), 6);
  });

  it('turns with pan: panned 90°, +z is its side, 500 / (8 √2) = 44.194 lx', () => {
    const sources = sourcesAt({ x: 0, y: 2, z: 0 }, asymmetric, { tiltDeg: 0, panDeg: 90 });
    expect(directIlluminance(point, UP, sources, [])).toBeCloseTo(500 / (8 * Math.SQRT2), 6);
  });

  it('turned round, sends its backward intensity: 200 / (8 √2) = 17.678 lx', () => {
    const sources = sourcesAt({ x: 0, y: 2, z: 0 }, asymmetric, { tiltDeg: 0, panDeg: 180 });
    expect(directIlluminance(point, UP, sources, [])).toBeCloseTo(200 / (8 * Math.SQRT2), 6);
  });
});
