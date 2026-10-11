import { describe, expect, it } from 'vitest';
import { screenshotFileName } from './format';

describe('screenshotFileName', () => {
  it('stamps the local date and time, zero-padded', () => {
    expect(screenshotFileName('escena', new Date(2026, 0, 5, 9, 7))).toBe(
      'escena-2026-01-05-0907.png',
    );
  });
});
