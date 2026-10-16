// Lux Studio's direct illuminance against Radiance's, room by room (ADR 0058).
// The tolerances are regression bounds set from the measured agreement; the
// figures themselves are in accuracy/REPORT.md (`npm run accuracy:report`).
import { describe, expect, it } from 'vitest';
import { compareReference, summarize } from './compare';
import { IES_FILES, REFERENCES } from './inputs';

/** Each surface's average: measured worst 0.56 % (the wall sconce's ceiling). */
const AVERAGE_TOLERANCE = 0.01;
/** Bright points at least 1 m from a luminaire: measured worst 3.0 % (near the sconce's box). */
const FAR_TOLERANCE = 0.035;
/**
 * Bright points nearer than 1 m: measured worst 12.7 %, on the wall right behind
 * the sconce. Radiance makes its 51 cm box's surface glow; Lux Studio spreads
 * the light over 10 cm cells inside it. Neither is the luminaire's true near
 * field, which an IES file doesn't describe.
 */
const NEAR_TOLERANCE = 0.15;

describe('Lux Studio against Radiance', () => {
  it('has the five reference rooms', () => {
    expect(Object.keys(REFERENCES).sort()).toEqual([
      'downlights-and-wall-washer',
      'linear-pendant-over-table',
      'single-downlight',
      'track-spots',
      'wall-sconce',
    ]);
  });

  for (const [name, reference] of Object.entries(REFERENCES)) {
    it(`${name}: averages within 1 %, bright points within 3.5 % (15 % within 1 m of a luminaire)`, () => {
      const points = compareReference(reference, IES_FILES);
      const origins = reference.room.luminaires.map((luminaire) => luminaire.origin);
      for (const summary of summarize(points, origins)) {
        const where = `${name} ${summary.surface}`;
        expect(Math.abs(summary.averageError), `${where}: average`).toBeLessThan(AVERAGE_TOLERANCE);
        expect(summary.worstFar, `${where}: points ≥ 1 m away`).toBeLessThan(FAR_TOLERANCE);
        expect(summary.worstNear, `${where}: points < 1 m away`).toBeLessThan(NEAR_TOLERANCE);
      }
    });
  }
});
