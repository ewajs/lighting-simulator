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
 * Total light, every room as it is, furniture and all (ADR 0060, 0063), with
 * luminaire bodies hiding bounced light (ADR 0075), and furnished rooms again
 * with the furniture taken out on both sides. Measured worsts: averages 0.8 %
 * (the busy and white rooms), far points 6.7 % (the furnished living room's
 * work plane), near points 10.9 % (the wall behind the sconce).
 */
const TOTAL = { average: 0.015, far: 0.075, near: 0.12 };

/**
 * Rooms whose worst points are in penumbrae (ADR 0068), bounded by how few of
 * their bright points are off by over OFF rather than by the worst one. In the
 * busy open-plan room, floor points between furniture see a downlight only
 * past an edge: Radiance sees a sliver of its 15 cm opening, while each of
 * Lux Studio's 7.6 cm cells is seen or not, so the point reads 0 or double.
 * Measured: 2.1 % of bright points off in direct light, 1.8 % in total;
 * worst 63.1 % and 46.8 %. Averages keep the bounds above.
 */
const PENUMBRAE: Record<string, { readonly share: number; readonly worst: number }> = {
  'busy-open-plan': { share: 0.035, worst: 0.75 },
};
/**
 * Emin and U₀ in total light (ADR 0072), over the points the app counts:
 * those covered by furniture are left out (ADR 0074). Measured worsts: Emin
 * 6.9 % (the wall-wash room's floor: bright pools spread by 25 cm patches),
 * 6.6 % (the busy room's floor, in a piece's shadow). MIN_EXCEPTIONS are left
 * out, with why.
 */
const MIN_TOLERANCE = 0.075;
const MIN_EXCEPTIONS: Record<string, string> = {
  // Its least-lit point is right above a downlight, 3 cm below it, whose
  // glowing body hides the room from it. With bodies (ADR 0075) it's +94 %
  // (was +130 %): ours is the square of the disc's area, seen 4 rays a patch.
  'busy-open-plan ceiling': 'a luminaire body',
  // The same, above the bathroom's downlight: +55 % (was +77 %).
  'small-bathroom ceiling': 'a luminaire body',
};

/** What a room's surfaces are held to: average, far points, near points. */
interface Bounds {
  readonly average: number;
  readonly far: number;
  readonly near: number;
}

/**
 * Rooms with a known, explained gap (ADR 0073), held to bounds just above
 * what they measure, so a regression still shows. Each says why.
 */
const KNOWN_GAPS: Record<
  string,
  {
    readonly why: string;
    readonly direct?: Partial<Bounds>;
    readonly total?: Partial<Bounds>;
  }
> = {
  'small-bathroom': {
    // With luminaire bodies (ADR 0075) it agrees like the others (averages
    // 0.3 %), but for the ceiling right above the downlight, 3 cm under it.
    // There Radiance's body is a disc and also shades the wall light's uplight
    // in direct light (34 %); ours is the square of the same area, hiding
    // bounced light only, sampled 4 rays a patch: +55 % in total.
    why: 'the ceiling over the downlight',
    direct: { near: 0.4 },
    total: { near: 0.6 },
  },
  'wall-wash': {
    // The ceiling gets only the spots' light far off their axis, from 20 cm
    // below: there each program models the 9.5 cm opening differently
    // (direct average −4.5 %, a small share of its total, which is −0.3 %).
    // The bright pools on the walls are spread by 25 cm patches, so the
    // least-lit points get up to 6.9 % too much bounced light (within MIN_TOLERANCE).
    why: 'grazing light, bright pools',
    direct: { average: 0.05 },
  },
};

/** A point "off", for PENUMBRAE's share. */
const OFF = 0.1;

describe('Lux Studio against Radiance', () => {
  it('has the twelve reference rooms', () => {
    expect(Object.keys(REFERENCES).sort()).toEqual([
      'busy-open-plan',
      'dark-room',
      'downlights-and-wall-washer',
      'furnished-living',
      'linear-pendant-over-table',
      'single-downlight',
      'small-bathroom',
      'tall-hall',
      'track-spots',
      'wall-sconce',
      'wall-wash',
      'white-room',
    ]);
  });

  for (const [name, reference] of Object.entries(REFERENCES)) {
    const points = compareReference(reference, IES_FILES);
    const origins = reference.room.luminaires.map((luminaire) => luminaire.origin);
    const penumbrae = PENUMBRAE[name];
    const gap = KNOWN_GAPS[name];
    const known = gap ? ` (known gap: ${gap.why})` : '';
    const direct = { average: AVERAGE_TOLERANCE, far: FAR_TOLERANCE, near: NEAR_TOLERANCE };

    it(`${name}, direct: averages within 1 %, bright points within 3.5 % (15 % within 1 m of a luminaire)${known}`, () => {
      const bounds = { ...direct, ...gap?.direct };
      expectWithin(name, summarize(points, origins, 'direct'), bounds, penumbrae?.worst);
    });

    it(`${name}, total: averages within 1.5 %, bright points within 7.5 % (12 % within 1 m of a luminaire)${known}`, () => {
      const bounds = { ...TOTAL, ...gap?.total };
      expectWithin(name, summarize(points, origins, 'total'), bounds, penumbrae?.worst);
    });

    it(`${name}, total: Emin and U₀ within 7.5 % where they can be compared${known}`, () => {
      for (const s of summarize(points, origins, 'total')) {
        const where = `${name} ${s.surface}`;
        if (MIN_EXCEPTIONS[where] || s.minError === null || s.uniformityError === null) continue;
        expect(Math.abs(s.minError), `${where}: Emin`).toBeLessThan(MIN_TOLERANCE);
        expect(Math.abs(s.uniformityError), `${where}: U₀`).toBeLessThan(MIN_TOLERANCE);
      }
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
  bounds: Bounds,
  worst?: number,
) {
  for (const summary of summaries) {
    const where = `${name} ${summary.surface}`;
    expect(Math.abs(summary.averageError), `${where}: average`).toBeLessThan(bounds.average);
    expect(summary.worstFar, `${where}: points ≥ 1 m away`).toBeLessThan(worst ?? bounds.far);
    expect(summary.worstNear, `${where}: points < 1 m away`).toBeLessThan(worst ?? bounds.near);
  }
}
