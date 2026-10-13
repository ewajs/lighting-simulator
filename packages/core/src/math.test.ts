import { describe, expect, it } from 'vitest';
import { wrapDeg } from './math';

describe('wrapDeg', () => {
  it('wraps into [−180, 180)', () => {
    expect(wrapDeg(190)).toBe(-170);
    expect(wrapDeg(-190)).toBe(170);
    expect(wrapDeg(180)).toBe(-180);
    expect(wrapDeg(45)).toBe(45);
  });
});
