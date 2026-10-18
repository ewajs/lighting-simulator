import { describe, expect, it } from 'vitest';
import { datedFileName, formatHour, monthName } from './format';

describe('datedFileName', () => {
  it('stamps the local date and time, zero-padded', () => {
    expect(datedFileName('escena', '.png', new Date(2026, 0, 5, 9, 7))).toBe(
      'escena-2026-01-05-0907.png',
    );
    expect(datedFileName('scene', '.luxstudio.json', new Date(2026, 9, 14, 18, 30))).toBe(
      'scene-2026-10-14-1830.luxstudio.json',
    );
  });
});

describe('formatHour', () => {
  it('reads hours as a clock does', () => {
    expect(formatHour(9.5)).toBe('9:30');
    expect(formatHour(12)).toBe('12:00');
    expect(formatHour(16.25)).toBe('16:15');
    // Rounded to the minute: 59.9 min is the next hour.
    expect(formatHour(8.999)).toBe('9:00');
  });
});

describe('monthName', () => {
  it('names the month, capitalised, in the active locale', () => {
    // Tests run in the source locale, en.
    expect(monthName(3)).toBe('March');
    expect(monthName(12)).toBe('December');
  });
});
