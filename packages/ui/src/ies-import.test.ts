import type { Photometry } from '@luxstudio/core';
import { describe, expect, it } from 'vitest';
import { importedCct, importedName, suggestedMount } from './ies-import';

function photometry(verticalDeg: number[], values: number[]): Photometry {
  return { verticalDeg, horizontalDeg: [0], candela: [values], power: 10, keywords: {} };
}

describe('importedName', () => {
  it('prefers [LUMINAIRE], then [LUMCAT], then the file name', () => {
    expect(importedName({ LUMINAIRE: 'Downlight', LUMCAT: 'DL-1' }, 'a.ies')).toBe('Downlight');
    expect(importedName({ LUMCAT: 'DL-1' }, 'a.ies')).toBe('DL-1');
    expect(importedName({ LUMINAIRE: '' }, 'my file.v2.IES')).toBe('my file.v2');
  });
});

describe('importedCct', () => {
  it('reads a colour-temperature keyword', () => {
    expect(importedCct({ _SEARCH_COLORTEMP: '3000' })).toBe(3000);
  });

  it('finds a kelvin value in free text', () => {
    expect(importedCct({ LUMINAIRE: 'Spot - 40.2W 2916lm - 3000K - CRI 97' })).toBe(3000);
    expect(importedCct({ LAMP: 'LED 3500 K' })).toBe(3500);
  });

  it('ignores implausible values and files without one', () => {
    expect(importedCct({ LUMINAIRE: 'Model 0100K', LUMCAT: 'HP-2-835' })).toBeUndefined();
    expect(importedCct({})).toBeUndefined();
  });
});

describe('suggestedMount', () => {
  it('is recessed for downward light and pendant when any light goes up', () => {
    expect(suggestedMount(photometry([0, 90], [100, 0]))).toBe('recessed');
    expect(suggestedMount(photometry([0, 90, 180], [100, 0, 0]))).toBe('recessed');
    expect(suggestedMount(photometry([0, 90, 180], [100, 0, 5]))).toBe('pendant');
  });
});
