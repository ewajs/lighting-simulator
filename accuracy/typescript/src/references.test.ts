// Lux Studio's illuminance against Radiance's, room by room: direct light
// (ADR 0058), and total light with every bounce (ADR 0060). The tolerances
// are regression bounds set from the measured agreement; the figures
// themselves are in accuracy/REPORT.md (`npm run accuracy:report`).
import { describe, expect, it } from 'vitest';
import { brightPointsOff, compareReference, summarize, type SurfaceSummary } from './compare';
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
 * Total light, every room as it is, furniture and all (ADR 0060, 0063), and
 * furnished rooms again with the furniture taken out on both sides. Measured
 * worsts: averages 3.29 % and near points 15.09 % (the wall sconce), far
 * points 6.54 % (the furnished living room's work plane); elsewhere averages
 * within 0.7 %.
 */
const TOTAL = { average: 0.04, far: 0.075, near: 0.16 };

/**
 * Rooms whose worst points are in penumbrae (ADR 0068), bounded by how few of
 * their bright points are off by over OFF rather than by the worst one. In the
 * busy open-plan room, floor points between furniture see a downlight only
 * past an edge: Radiance sees a sliver of its 15 cm opening, while each of
 * Lux Studio's 7.6 cm cells is seen or not, so the point reads 0 or double.
 * Measured: 2.7 % of bright points off in direct light, 1.6 % in total;
 * worst 68.4 % and 44.9 %. Averages keep the bounds above.
 */
const PENUMBRAE: Record<string, { readonly share: number; readonly worst: number }> = {
  'busy-open-plan': { share: 0.035, worst: 0.75 },
};
/** A point "off", for PENUMBRAE's share. */
const OFF = 0.1;

describe('Lux Studio against Radiance', () => {
  it('has the seven reference rooms', () => {
    expect(Object.keys(REFERENCES).sort()).toEqual([
      'busy-open-plan',
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
    const penumbrae = PENUMBRAE[name];
    const direct = { average: AVERAGE_TOLERANCE, far: FAR_TOLERANCE, near: NEAR_TOLERANCE };

    it(`${name}, direct: averages within 1 %, bright points within 3.5 % (15 % within 1 m of a luminaire)`, () => {
      expectWithin(name, summarize(points, origins, 'direct'), direct, penumbrae?.worst);
    });

    it(`${name}, total: averages within 4 %, bright points within 7.5 % (16 % within 1 m of a luminaire)`, () => {
      expectWithin(name, summarize(points, origins, 'total'), TOTAL, penumbrae?.worst);
    });

    if (penumbrae) {
      it(`${name}: few bright points off by over 10 %, in penumbrae`, () => {
        for (const light of ['direct', 'total'] as const) {
          const { off, bright } = brightPointsOff(points, light, OFF);
          expect(off / bright, light).toBeLessThan(penumbrae.share);
        }
      });
    }

    if (reference.withoutFurniture) {
      it(`${name}, total without its furniture, on both sides: within the same bounds`, () => {
        const empty = compareReference(reference, IES_FILES, undefined, false);
        expectWithin(name, summarize(empty, origins, 'total'), TOTAL);
      });
    }
  }
});

/** Checks each surface against `bounds`; with `worst`, a room in PENUMBRAE, its points against that instead. */
function expectWithin(
  name: string,
  summaries: readonly SurfaceSummary[],
  bounds: { average: number; far: number; near: number },
  worst?: number,
) {
  for (const summary of summaries) {
    const where = `${name} ${summary.surface}`;
    expect(Math.abs(summary.averageError), `${where}: average`).toBeLessThan(bounds.average);
    expect(summary.worstFar, `${where}: points ≥ 1 m away`).toBeLessThan(worst ?? bounds.far);
    expect(summary.worstNear, `${where}: points < 1 m away`).toBeLessThan(worst ?? bounds.near);
  }
}
