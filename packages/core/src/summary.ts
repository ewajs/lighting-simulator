import type { Catalog, Scene } from './types';

/** Totals for a scene, as shown in a bill of materials or status bar. */
export interface SceneSummary {
  /** Number of luminaires, including those switched off. */
  readonly fixtures: number;
  /** Electrical power in W at the current dimming levels. */
  readonly power: number;
  /** Luminous flux in lm at the current dimming levels. */
  readonly flux: number;
  /** Power per floor area in W/m². */
  readonly powerDensity: number;
}

/**
 * Sums power and flux over the scene. Dimming is treated as linear for both
 * (an approximation: real drivers are less efficient when dimmed). Luminaires
 * that are off contribute nothing; products missing from the catalog are skipped.
 */
export function summarizeScene(scene: Scene, catalog: Catalog): SceneSummary {
  let power = 0;
  let flux = 0;
  for (const luminaire of scene.luminaires) {
    const product = catalog.get(luminaire.productId);
    if (!product || !luminaire.on) continue;
    power += product.power * luminaire.dimming;
    flux += product.flux * luminaire.dimming;
  }
  const floorArea = scene.room.width * scene.room.depth;
  return { fixtures: scene.luminaires.length, power, flux, powerDensity: power / floorArea };
}
