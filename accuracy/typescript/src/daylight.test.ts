// Lux Studio's daylight against Radiance's (ADR 0081): rooms by day, their
// windows open to gensky's CIE skies at the levels Lux Studio sets. First the
// two sides' descriptions must agree: where the sun is, how bright the sky
// and the sun are, and how much the glass lets through, each worked out on
// its own by the Python. Then the light: daylight's first arrival, and the
// total with every bounce. The tolerances are regression bounds set from the
// measured agreement.
import { COVERINGS, GLAZINGS, skyFor, sunPosition } from '@luxstudio/core';
import { describe, expect, it } from 'vitest';
import { compareReference, summarize, type Light } from './compare';
import { DAYLIGHT_REFERENCES, IES_FILES } from './inputs';

/**
 * Each surface's average and its worst bright point, by light. Measured:
 * daylight's first arrival, averages 0.99 % (the side-window room's far
 * wall), points 2.9 %; total, averages 0.98 %, points 7.8 %: at single points
 * Radiance's total samples the sky through the window with 4096 rays and
 * varies by several percent, where its first arrival, with 65 536, agrees
 * within 3 %.
 */
const BOUNDS: Record<Exclude<Light, 'direct' | 'bounced'>, { average: number; worst: number }> = {
  daylight: { average: 0.015, worst: 0.04 },
  total: { average: 0.015, worst: 0.085 },
};

/**
 * Surfaces with a known, explained gap, held just above it. The sunny room's
 * left wall: 12 cm above the floor's 69 klx sun patch, its bounced light comes
 * from 25 cm patches that spread the patch's brightness over its edge (+10.2 %;
 * its daylight's first arrival agrees, −0.3 %), as with the wall-wash room's pools.
 */
const KNOWN_GAPS: Record<string, number> = { 'daylight-sun wall-x-': 0.11 };

describe('Lux Studio against Radiance, by day', () => {
  it('has the four daylight rooms', () => {
    expect(Object.keys(DAYLIGHT_REFERENCES).sort()).toEqual([
      'daylight-and-lamps',
      'daylight-side-window',
      'daylight-skylight',
      'daylight-sun',
    ]);
  });

  for (const [name, reference] of Object.entries(DAYLIGHT_REFERENCES)) {
    const daylight = reference.room.daylight!;

    it(`${name}: the Python's sun, sky and glass are Lux Studio's`, () => {
      const sun = sunPosition(daylight);
      expect(reference.daylight!.sun.altitudeDeg).toBeCloseTo(sun.altitudeDeg, 4);
      expect(reference.daylight!.sun.azimuthDeg).toBeCloseTo(sun.azimuthDeg, 4);
      const sky = skyFor(daylight)!;
      expect(reference.daylight!.horizontalSkyLx / sky.horizontalLx).toBeCloseTo(1, 6);
      expect(reference.daylight!.sunNormalLx).toBeCloseTo(sky.sun?.normalLx ?? 0, 2);
      for (const window of reference.room.windows ?? []) {
        const transmittance =
          GLAZINGS[window.glazing].transmittance * COVERINGS[window.covering].transmittance;
        expect(reference.daylight!.transmittance).toBe(transmittance);
      }
    });

    const points = compareReference(reference, IES_FILES);
    const origins = reference.room.luminaires.map((luminaire) => luminaire.origin);
    for (const light of ['daylight', 'total'] as const) {
      const { average, worst } = BOUNDS[light];
      it(`${name}, ${light}: averages within ${average * 100} %, bright points within ${worst * 100} %`, () => {
        for (const s of summarize(points, origins, light)) {
          const where = `${name} ${s.surface}`;
          expect(Math.abs(s.averageError), `${where}: average`).toBeLessThan(average);
          const bound = (light === 'total' && KNOWN_GAPS[where]) || worst;
          expect(Math.max(s.worstFar, s.worstNear), `${where}: worst`).toBeLessThan(bound);
        }
      });
    }
  }
});
