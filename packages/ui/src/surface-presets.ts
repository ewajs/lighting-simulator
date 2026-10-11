import { msg } from '@lit/localize';
import type { Surface } from '@lighting-sim/core';

/** A named room finish offered as a one-click preset. */
export interface SurfacePreset extends Surface {
  readonly name: string;
}

/**
 * Generic interior finishes with typical diffuse reflectances. A function so
 * names are translated at render time.
 */
export const surfacePresets = (): readonly SurfacePreset[] => [
  { name: msg('White paint'), color: '#f2f0ec', reflectance: 0.8 },
  { name: msg('Warm grey'), color: '#cbc3b8', reflectance: 0.6 },
  { name: msg('Concrete'), color: '#9a9893', reflectance: 0.4 },
  { name: msg('Oak'), color: '#8a6a4a', reflectance: 0.3 },
  { name: msg('Charcoal'), color: '#2d2d2f', reflectance: 0.1 },
];
