import { describe, expect, it } from 'vitest';
import { FALSE_COLOUR_STOPS, falseColour } from './false-colour';

describe('falseColour', () => {
  it('gives each stop its own colour', () => {
    for (const stop of FALSE_COLOUR_STOPS) expect(falseColour(stop.lx)).toEqual([...stop.rgb]);
  });

  it('blends between stops: halfway from 100 to 200 lx is halfway between their colours', () => {
    expect(falseColour(150)).toEqual([50, 193, 147]);
  });

  it('holds the ends: nothing below 0, white above 2000 lx', () => {
    expect(falseColour(-5)).toEqual([11, 26, 74]);
    expect(falseColour(Number.NaN)).toEqual([11, 26, 74]);
    expect(falseColour(5000)).toEqual([255, 246, 230]);
  });

  it('has its stops ascending', () => {
    const lx = FALSE_COLOUR_STOPS.map((s) => s.lx);
    expect([...lx].sort((a, b) => a - b)).toEqual(lx);
  });
});
