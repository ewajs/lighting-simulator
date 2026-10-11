import { describe, expect, it } from 'vitest';
import { addLuminaire, updateLuminaire } from './luminaires';
import { summarizeScene } from './summary';
import { catalog, emptyScene, PRODUCTS } from './test-fixtures';

// Every fixture product is 10 W and 800 lm; the default room is 5 × 4 = 20 m².
const recessed = PRODUCTS[0]!;

describe('summarizeScene', () => {
  it('is all zeros for an empty scene', () => {
    expect(summarizeScene(emptyScene, catalog)).toEqual({
      fixtures: 0,
      power: 0,
      flux: 0,
      powerDensity: 0,
    });
  });

  it('sums power and flux, scaled by dimming, and skips luminaires that are off', () => {
    let scene = addLuminaire(emptyScene, recessed, 'a');
    scene = addLuminaire(scene, recessed, 'b');
    scene = addLuminaire(scene, recessed, 'c');
    scene = updateLuminaire(scene, 'b', { dimming: 0.5 }, catalog);
    scene = updateLuminaire(scene, 'c', { on: false }, catalog);
    // a: 10 W / 800 lm, b: 5 W / 400 lm, c: off. 15 W / 20 m² = 0.75 W/m².
    expect(summarizeScene(scene, catalog)).toEqual({
      fixtures: 3,
      power: 15,
      flux: 1200,
      powerDensity: 0.75,
    });
  });

  it('counts but does not sum luminaires whose product is missing', () => {
    const scene = addLuminaire(emptyScene, { ...recessed, id: 'gone' }, 'a');
    expect(summarizeScene(scene, catalog)).toMatchObject({ fixtures: 1, power: 0 });
  });
});
