import { describe, expect, it } from 'vitest';
import { datedFileName } from './format';

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
