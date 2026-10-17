// Lux Studio's illuminance against Radiance's, room by room: direct light
// (ADR 0058), and total light with every bounce (ADR 0060). The tolerances
// are regression bounds set from the measured agreement; the figures
// themselves are in accuracy/REPORT.md (`npm run accuracy:report`).
import { describe, expect, it } from 'vitest';
import { compareReference, summarize, type SurfaceSummary } from './compare';
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

/**
 * Total light, rooms without furniture (furnished rooms with it taken out, on
 * both sides), by the same measures (ADR 0060). Measured worsts: averages
 * 3.29 %, far points 4.26 %, near points 15.09 %, all by the wall sconce;
 * elsewhere averages within 0.7 % and far points within 3.8 %.
 */
const TOTAL = { average: 0.04, far: 0.05, near: 0.16 };
/**
 * Total light in furnished rooms as they are: Lux Studio's bounced light
 * passes through furniture, Radiance's doesn't (ADR 0060). Measured worsts:
 * averages 7.34 % (the ceiling over the pendant's table, missing the light the
 * table reflects), far points 43.7 % (on the wall at the furnished room's bookcase). A
 * regression bound for a known gap, to tighten when furniture blocks bounced light.
 */
const FURNISHED = { average: 0.08, far: 0.45, near: 0.16 };

describe('Lux Studio against Radiance', () => {
  it('has the six reference rooms', () => {
    expect(Object.keys(REFERENCES).sort()).toEqual([
      'downlights-and-wall-washer',
      'furnished-living',
      'linear-pendant-over-table',
      'single-downlight',
      'track-spots',
      'wall-sconce',
    ]);
  });

  for (const [name, reference] of Object.entries(REFERENCES)) {
    const points = compareReference(reference, IES_FILES);
    const origins = reference.room.luminaires.map((luminaire) => luminaire.origin);

    it(`${name}, direct: averages within 1 %, bright points within 3.5 % (15 % within 1 m of a luminaire)`, () => {
      for (const summary of summarize(points, origins, 'direct')) {
        const where = `${name} ${summary.surface}`;
        expect(Math.abs(summary.averageError), `${where}: average`).toBeLessThan(AVERAGE_TOLERANCE);
        expect(summary.worstFar, `${where}: points ≥ 1 m away`).toBeLessThan(FAR_TOLERANCE);
        expect(summary.worstNear, `${where}: points < 1 m away`).toBeLessThan(NEAR_TOLERANCE);
      }
    });

    it(`${name}, total: averages within 4 %, bright points within 5 % (16 % within 1 m of a luminaire)`, () => {
      const empty = reference.withoutFurniture
        ? compareReference(reference, IES_FILES, undefined, false)
        : points;
      expectWithin(name, summarize(empty, origins, 'total'), TOTAL);
    });

    if (reference.withoutFurniture) {
      it(`${name}, total with its furniture: within the known gap's bounds`, () => {
        expectWithin(name, summarize(points, origins, 'total'), FURNISHED);
      });
    }
  }
});

function expectWithin(
  name: string,
  summaries: readonly SurfaceSummary[],
  bounds: { average: number; far: number; near: number },
) {
  for (const summary of summaries) {
    const where = `${name} ${summary.surface}`;
    expect(Math.abs(summary.averageError), `${where}: average`).toBeLessThan(bounds.average);
    expect(summary.worstFar, `${where}: points ≥ 1 m away`).toBeLessThan(bounds.far);
    expect(summary.worstNear, `${where}: points < 1 m away`).toBeLessThan(bounds.near);
  }
}
