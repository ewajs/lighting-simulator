// Each feature must earn its place (ADR 0061): added to the steps before it,
// it mustn't make any reference room worse on the whole.
import { DEFAULT_CALCULATION_OPTIONS } from '@luxstudio/core';
import { expect, it } from 'vitest';
import { FEATURE_STEPS, featureStudy } from './features';
import { IES_FILES, REFERENCES } from './inputs';

/**
 * How much worse, in percentage points of the mean bright-point error, a
 * feature may leave a room it doesn't help: Radiance's own noise is about 0.3 %
 * a point. Splitting openings moves some averages by a few hundredths.
 */
const SLACK = 0.005;

it('starts from nothing and ends with every feature the calculation has', () => {
  const first = FEATURE_STEPS[0]!.options;
  const last = FEATURE_STEPS[FEATURE_STEPS.length - 1]!.options;
  const features = (o: typeof first) => [
    o.splitOpenings,
    o.furnitureShadows,
    o.bouncedLight,
    o.furnitureInBouncedLight,
  ];
  expect(features(first)).toEqual([false, false, false, false]);
  expect(last).toEqual(DEFAULT_CALCULATION_OPTIONS);
});

for (const [name, reference] of Object.entries(REFERENCES)) {
  it(`${name}: no feature makes the mean bright-point error worse`, () => {
    const results = featureStudy(reference, IES_FILES);
    // A half step (black furniture, ADR 0063) is shown because it's worse;
    // the step after it is held to the one before it.
    let previous = results[0]!;
    for (let k = 1; k < results.length; k++) {
      if (FEATURE_STEPS[k]!.blackFurniture) continue;
      expect(results[k]!.meanPointError, results[k]!.step).toBeLessThan(
        previous.meanPointError + SLACK,
      );
      previous = results[k]!;
    }
  });
}
