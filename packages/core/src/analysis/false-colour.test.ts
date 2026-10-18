import { describe, expect, it } from 'vitest';
import { DAYLIGHT_FALSE_COLOUR_STOPS, FALSE_COLOUR_STOPS, falseColour } from './false-colour';

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
    for (const stops of [FALSE_COLOUR_STOPS, DAYLIGHT_FALSE_COLOUR_STOPS]) {
      const lx = stops.map((s) => s.lx);
      expect([...lx].sort((a, b) => a - b)).toEqual(lx);
    }
  });

  it('reads another scale when given one: by day, white only from 10 000 lx', () => {
    expect(falseColour(5000, DAYLIGHT_FALSE_COLOUR_STOPS)).toEqual([229, 50, 45]);
    expect(falseColour(20_000, DAYLIGHT_FALSE_COLOUR_STOPS)).toEqual([255, 246, 230]);
  });
});
