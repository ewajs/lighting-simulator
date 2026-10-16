import { describe, expect, it } from 'vitest';
import { distance, length, rotateX, rotateY, scale, wrapDeg } from './math';

describe('wrapDeg', () => {
  it('wraps into [−180, 180)', () => {
    expect(wrapDeg(190)).toBe(-170);
    expect(wrapDeg(-190)).toBe(170);
    expect(wrapDeg(180)).toBe(-180);
    expect(wrapDeg(45)).toBe(45);
  });
});

describe('vectors', () => {
  it('scale, measure and compare', () => {
    expect(scale({ x: 1, y: -2, z: 3 }, 2)).toEqual({ x: 2, y: -4, z: 6 });
    expect(length({ x: 3, y: 4, z: 12 })).toBe(13);
    expect(distance({ x: 1, y: 1, z: 1 }, { x: 4, y: 5, z: 1 })).toBe(5);
  });

  it('turn as three.js does: about x, +y towards +z; about y, +z towards +x', () => {
    const quarter = Math.PI / 2;
    const y = rotateX({ x: 0, y: 1, z: 0 }, quarter);
    expect([y.x, y.y, y.z].map((v) => Math.round(v * 1e12) / 1e12)).toEqual([0, 0, 1]);
    const z = rotateY({ x: 0, y: 0, z: 1 }, quarter);
    expect([z.x, z.y, z.z].map((v) => Math.round(v * 1e12) / 1e12)).toEqual([1, 0, 0]);
  });
});
