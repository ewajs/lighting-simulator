import { describe, expect, it } from 'vitest';
import { parseNumberInput, roundTo, stepValue } from './number-input';

describe('parseNumberInput', () => {
  it('accepts comma or dot as decimal separator', () => {
    expect(parseNumberInput('2,70')).toBe(2.7);
    expect(parseNumberInput(' 2.70 ')).toBe(2.7);
    expect(parseNumberInput('-1,5')).toBe(-1.5);
    expect(parseNumberInput(',5')).toBe(0.5);
    expect(parseNumberInput('3')).toBe(3);
  });

  it('rejects text, grouping and empty input', () => {
    expect(parseNumberInput('abc')).toBeNaN();
    expect(parseNumberInput('1.000,5')).toBeNaN();
    expect(parseNumberInput('')).toBeNaN();
    expect(parseNumberInput('2 m')).toBeNaN();
  });
});

describe('roundTo', () => {
  it('removes float noise', () => {
    expect(roundTo(0.1 + 0.2, 2)).toBe(0.3);
  });
});

describe('stepValue', () => {
  const options = { step: 0.1, min: 0, max: 5, decimals: 2, large: false };

  it('steps by `step`, or ×10 with large', () => {
    expect(stepValue(2.7, 1, options)).toBe(2.8);
    expect(stepValue(2.7, -1, { ...options, large: true })).toBe(1.7);
  });

  it('clamps to the range', () => {
    expect(stepValue(4.95, 1, options)).toBe(5);
    expect(stepValue(0.05, -1, options)).toBe(0);
  });
});
