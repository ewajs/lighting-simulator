// Orientation checks that depend on neither program (ADR 0071): where light
// should land, worked out by hand from the room files and the documented
// conventions, asserted on Radiance's points and on Lux Studio's. Agreement
// between the two can't catch a mistake in the room description they share,
// such as a luminaire turned the wrong way; these can.
//
// The conventions (ADR 0043, luminaire-frame.ts): the IES C0 plane is the
// fixture's front, +z; the aim tilts the light from straight down towards +z,
// then pans it about the vertical, a positive pan turning +z towards +x. So
// tilt t and pan p aim the light along (sin t · sin p, −cos t, sin t · cos p).
import { parseIes, type Photometry, type Vec3 } from '@luxstudio/core';
import { describe, expect, it } from 'vitest';
import { compareReference, type PointComparison } from './compare';
import { IES_FILES, REFERENCES } from './inputs';

const DEG = Math.PI / 180;
/** Points brighter than this share of the surface's brightest make up a beam's pool. */
const POOL_SHARE = 0.25;

type Side = 'radiance' | 'ours';
const direct = (p: PointComparison, side: Side) =>
  side === 'radiance' ? p.radianceDirectLx : p.oursDirectLx;

/** The illuminance-weighted centre of a surface's pool of light. */
function poolCentre(points: readonly PointComparison[], surface: string, side: Side): Vec3 {
  const on = points.filter((p) => p.surface === surface);
  const brightest = Math.max(...on.map((p) => direct(p, side)));
  const pool = on.filter((p) => direct(p, side) >= POOL_SHARE * brightest);
  const weight = pool.reduce((sum, p) => sum + direct(p, side), 0);
  const mean = (axis: 'x' | 'y' | 'z') =>
    pool.reduce((sum, p) => sum + p.position[axis] * direct(p, side), 0) / weight;
  return { x: mean('x'), y: mean('y'), z: mean('z') };
}

describe('track spots: each beam lands where its tilt and pan say', () => {
  const points = compareReference(REFERENCES['track-spots']!, IES_FILES);

  for (const side of ['radiance', 'ours'] as const) {
    it(`${side}: the floor spot, 45° tilt, 200° pan, from (1, 2.5, 1)`, () => {
      // Its beam's vertical plane runs from the foot (1, 1) along
      // (sin 200°, cos 200°) = (−0.342, −0.940); the axis meets the floor
      // 2.5 · tan 45° = 2.5 m along it. A round beam's pool is symmetric
      // about that plane, so its centre lies on it; at a slant, the pool's
      // centre sits a little short of the axis, nearer the spot.
      const centre = poolCentre(points, 'floor', side);
      const [dx, dz] = [centre.x - 1, centre.z - 1];
      const [ax, az] = [Math.sin(200 * DEG), Math.cos(200 * DEG)];
      const across = dx * az - dz * ax;
      const along = dx * ax + dz * az;
      // Measured, both programs: 0.6 cm across, 2.29 m along.
      expect(Math.abs(across), 'off the beam plane').toBeLessThan(0.05);
      expect(along).toBeGreaterThan(2.5 - 0.3);
      expect(along).toBeLessThan(2.5);
    });

    it(`${side}: the wall spot, 60° tilt, −60° pan, from (−1.5, 2.5, −1)`, () => {
      // Aimed along (sin 60° sin(−60°), −cos 60°, sin 60° cos(−60°)) =
      // (−0.75, −0.5, 0.433): 1 m across to the wall at x = −2.5 takes 1.333
      // of it, so the axis meets the wall at z = −1 + 0.577 = −0.423 and
      // y = 2.5 − 0.667 = 1.833. The beam's vertical plane meets the wall at
      // that z.
      const centre = poolCentre(points, 'wall-x-', side);
      // Measured, both programs: z −0.45, y 1.88.
      expect(Math.abs(centre.z - -0.423), 'off the beam plane').toBeLessThan(0.05);
      expect(Math.abs(centre.y - 1.833)).toBeLessThan(0.3);
    });
  }
});

/** Candela towards Type C (C, γ), bilinear in the table: this test's own lookup. */
function candela(file: Photometry, cDeg: number, gammaDeg: number): number {
  const { horizontalDeg: hs, verticalDeg: vs, candela: rows } = file;
  const c = hs.length === 1 ? hs[0]! : ((cDeg % 360) + 360) % 360;
  const bracket = (values: readonly number[], v: number) => {
    let i = 0;
    while (i < values.length - 2 && values[i + 1]! < v) i++;
    const span = values[i + 1]! - values[i]!;
    return [i, span === 0 ? 0 : (v - values[i]!) / span] as const;
  };
  const [vi, vt] = bracket(vs, gammaDeg);
  const at = (row: readonly number[]) => row[vi]! * (1 - vt) + row[vi + 1]! * vt;
  if (hs.length === 1) return at(rows[0]!);
  const [hi, ht] = bracket(hs, c);
  return at(rows[hi]!) * (1 - ht) + at(rows[hi + 1]!) * ht;
}

describe('downlights and wall washer: the washer faces its wall', () => {
  const reference = REFERENCES['downlights-and-wall-washer']!;
  const points = compareReference(reference, IES_FILES);
  const files = new Map(
    reference.room.luminaires.map((l) => [l.ies, parseIes(IES_FILES[l.ies]!)] as const),
  );

  /**
   * Direct light at a point on the wall at x = −2.5, facing +x, worked out by
   * hand: E = Σ I(C, γ) · cos α / d². The downlights are round, so C doesn't
   * matter for them. The washer is panned −90°, so its C0 front faces −x, the
   * wall; seen from above, C grows from there towards −z. Points within
   * 0.15 m of z = 0 are averaged in pairs, so which way C grows hardly
   * matters; a washer turned or facing the other way would. Measured: both
   * programs within 0.4 % at every height.
   */
  function byHand(point: Vec3): number {
    let lux = 0;
    for (const { ies, origin, panDeg = 0 } of reference.room.luminaires) {
      const v = { x: point.x - origin.x, y: point.y - origin.y, z: point.z - origin.z };
      const d = Math.hypot(v.x, v.y, v.z);
      const cosIncidence = -v.x / d;
      if (cosIncidence <= 0) continue;
      const gammaDeg = Math.acos(-v.y / d) / DEG;
      // The washer's front (C0) is −x; a downlight's C is irrelevant.
      const cDeg = panDeg === -90 ? Math.atan2(-v.z, -v.x) / DEG : 0;
      lux += (candela(files.get(ies)!, cDeg, gammaDeg) * cosIncidence) / d ** 2;
    }
    return lux;
  }

  const wall = points.filter(
    (p) =>
      p.surface === 'wall-x-' &&
      Math.abs(p.position.z) < 0.15 &&
      p.position.y > 0.5 &&
      p.position.y < 2.3,
  );

  for (const side of ['radiance', 'ours'] as const) {
    it(`${side}: matches the hand value on the wall in front of it, within 1 %`, () => {
      expect(wall.length).toBeGreaterThan(4);
      for (const y of new Set(wall.map((p) => p.position.y))) {
        const pair = wall.filter((p) => p.position.y === y);
        const measured = pair.reduce((s, p) => s + direct(p, side), 0);
        const hand = pair.reduce((s, p) => s + byHand(p.position), 0);
        expect(Math.abs(measured / hand - 1), `y ${y.toFixed(2)}`).toBeLessThan(0.01);
      }
    });
  }

  it('would not, turned to face the other way: the check can tell', () => {
    // Its back (C180) to the wall instead: the same sum, with C turned half
    // round. Measured: 12 % off, against the 0.4 % the right way round.
    const turned = (point: Vec3) => {
      const washer = reference.room.luminaires.find((l) => l.panDeg === -90)!;
      const v = {
        x: point.x - washer.origin.x,
        y: point.y - washer.origin.y,
        z: point.z - washer.origin.z,
      };
      const d = Math.hypot(v.x, v.y, v.z);
      const gammaDeg = Math.acos(-v.y / d) / DEG;
      const file = files.get(washer.ies)!;
      const ownDirect = (cDeg: number) => (candela(file, cDeg, gammaDeg) * (-v.x / d)) / d ** 2;
      const cDeg = Math.atan2(-v.z, -v.x) / DEG;
      return byHand(point) - ownDirect(cDeg) + ownDirect(cDeg + 180);
    };
    const p = wall[0]!;
    expect(Math.abs(turned(p.position) / p.radianceDirectLx - 1)).toBeGreaterThan(0.05);
  });
});
