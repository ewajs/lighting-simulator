import { describe, expect, it } from 'vitest';
import { illuminanceStats } from './stats';

describe('illuminanceStats', () => {
  it('gives Ē, Emin, Emax, U₀ = Emin / Ē and Emin / Emax', () => {
    // Ē = (200 + 300 + 400 + 500) / 4 = 350; U₀ = 200 / 350; Emin / Emax = 200 / 500.
    expect(illuminanceStats([300, 200, 500, 400])).toEqual({
      averageLx: 350,
      minLx: 200,
      maxLx: 500,
      uniformity: 200 / 350,
      minToMax: 0.4,
    });
  });

  it('gives ratios of 0 rather than dividing by zero in the dark', () => {
    expect(illuminanceStats([0, 0])).toMatchObject({ uniformity: 0, minToMax: 0 });
  });

  it('refuses an empty grid', () => {
    expect(() => illuminanceStats([])).toThrow(RangeError);
  });
});
