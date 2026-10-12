import { describe, expect, it } from 'vitest';
import { parseIes } from './ies';

/**
 * A hand-made LM-63-2002 file: 1 lamp of 1000 lm, multiplier 2, vertical
 * 0/45/90°, horizontal 0/90° (quadrant symmetric), ballast factor 0.9,
 * 12 W. Candela values wrap across lines and mix commas and spaces.
 */
const QUADRANT_2002 = `IESNA:LM-63-2002
[TEST] Hand-made fixture
[LUMINAIRE] Test downlight
[MORE] with a second line
[LUMCAT] TD-01
TILT=NONE
1 1000 2 3 2 1 2 0.1 0.1 0
0.9 1 12
0 45 90
0 90
100, 50,
0
200 100 0
`;

describe('parseIes', () => {
  it('reads angles, scaled candela values, power and keywords', () => {
    const photometry = parseIes(QUADRANT_2002);
    expect(photometry.verticalDeg).toEqual([0, 45, 90]);
    expect(photometry.horizontalDeg).toEqual([0, 90]);
    // Scaled by multiplier 2 × ballast factor 0.9 = 1.8.
    expect(photometry.candela).toEqual([
      [180, 90, 0],
      [360, 180, 0],
    ]);
    expect(photometry.power).toBe(12);
    expect(photometry.keywords).toEqual({
      TEST: 'Hand-made fixture',
      LUMINAIRE: 'Test downlight with a second line',
      LUMCAT: 'TD-01',
    });
  });

  it('accepts CRLF line endings and a byte order mark', () => {
    const windows = `\uFEFF${QUADRANT_2002.replace(/\n/g, '\r\n')}`;
    expect(parseIes(windows)).toEqual(parseIes(QUADRANT_2002));
  });

  it('applies the ballast-lamp factor in 1995 files', () => {
    const photometry = parseIes(`IESNA:LM-63-1995
[TEST] T
TILT=NONE
1 -1 1 2 1 1 2 0 0 0
1 0.5 10
0 90
0
100 40
`);
    expect(photometry.candela).toEqual([[50, 20]]);
  });

  it('ignores the file generation type in 2019 files', () => {
    const photometry = parseIes(`IES:LM-63-2019
[TEST] T
[FILEGENINFO] Simulated
TILT=NONE
1 -1 1 2 1 1 2 0 0 0
1 1.10000 10
0 90
0
100 40
`);
    expect(photometry.candela).toEqual([[100, 40]]);
  });

  it('reads 1986 files with a free-text header and no keywords', () => {
    const photometry = parseIes(`Some lab, test 1234
A downlight
TILT=NONE
1 1000 1 2 1 1 1 0 0 0
1 1 10
0 90
0
100 0
`);
    expect(photometry.keywords).toEqual({});
    expect(photometry.candela).toEqual([[100, 0]]);
  });

  it('skips included tilt data', () => {
    const photometry = parseIes(`IESNA:LM-63-2002
TILT=INCLUDE
1
3
0 45 90
1 0.95 0.9
1 1000 1 2 1 1 2 0 0 0
1 1 10
0 90
0
100 0
`);
    expect(photometry.candela).toEqual([[100, 0]]);
  });

  it('ignores a tilt file reference', () => {
    const photometry = parseIes(`IESNA:LM-63-2002
TILT=lamp_tilt.dat
1 1000 1 2 1 1 2 0 0 0
1 1 10
0 90
0
100 0
`);
    expect(photometry.candela).toEqual([[100, 0]]);
  });

  it('keeps the first value of a repeated keyword', () => {
    const photometry = parseIes(QUADRANT_2002.replace('[LUMCAT] TD-01', '[TEST] Again'));
    expect(photometry.keywords['TEST']).toBe('Hand-made fixture');
  });

  describe('rejects', () => {
    it('text without a TILT line', () => {
      expect(() => parseIes('not an IES file')).toThrow(/no TILT= line/);
    });

    it('Type A and B photometry', () => {
      const typeB = QUADRANT_2002.replace('1 1000 2 3 2 1 2', '1 1000 2 3 2 2 2');
      expect(() => parseIes(typeB)).toThrow(/Type B photometry is not supported/);
      const typeA = QUADRANT_2002.replace('1 1000 2 3 2 1 2', '1 1000 2 3 2 3 2');
      expect(() => parseIes(typeA)).toThrow(/Type A photometry is not supported/);
    });

    it('truncated data', () => {
      expect(() => parseIes(QUADRANT_2002.replace('200 100 0\n', '200 100\n'))).toThrow(
        /ends before the candela values at horizontal angle 90°/,
      );
    });

    it('a value that is not a number, naming its line', () => {
      expect(() => parseIes(QUADRANT_2002.replace('0 45 90', '0 4x5 90'))).toThrow(
        /line 9: vertical angles must be a number, got "4x5"/,
      );
    });

    it('angles out of order', () => {
      expect(() => parseIes(QUADRANT_2002.replace('0 45 90', '0 90 45'))).toThrow(
        /vertical angles must be in ascending order/,
      );
    });

    it('vertical angles outside 0–180°', () => {
      expect(() => parseIes(QUADRANT_2002.replace('0 45 90', '-90 0 90'))).toThrow(/within 0–180°/);
    });

    it('horizontal angles that match no symmetry', () => {
      expect(() => parseIes(QUADRANT_2002.replace('\n0 90\n', '\n0 45\n'))).toThrow(
        /match no Type C symmetry/,
      );
    });

    it('a negative candela value', () => {
      expect(() => parseIes(QUADRANT_2002.replace('200 100 0', '200 -1 0'))).toThrow(
        /negative candela value -1/,
      );
    });

    it('a distribution with no light', () => {
      const dark = QUADRANT_2002.replace('100, 50,', '0, 0,').replace('200 100 0', '0 0 0');
      expect(() => parseIes(dark)).toThrow(/all candela values are zero/);
    });

    it('a zero candela multiplier', () => {
      expect(() => parseIes(QUADRANT_2002.replace('1 1000 2 3', '1 1000 0 3'))).toThrow(
        /candela multiplier must be greater than 0/,
      );
    });

    it('with a SyntaxError', () => {
      expect(() => parseIes('')).toThrow(SyntaxError);
    });
  });
});
