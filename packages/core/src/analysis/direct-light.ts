// A scene's direct light, ready to be read at any point (ADR 0057): its
// luminaires as point sources and its furniture as boxes that cast shadows.

import { fixtureLayout } from '../fixture-layout';
import { luminaireFrame } from '../luminaire-frame';
import type { Scene } from '../types';
import { furnitureBlockers, type Blocker } from './occlusion';
import {
  checkCalculationOptions,
  DEFAULT_CALCULATION_OPTIONS,
  type CalculationOptions,
} from './options';
import {
  checkSettings,
  DEFAULT_ANALYSIS_SETTINGS,
  type AnalysisInputs,
  type AnalysisSettings,
} from './settings';
import { distributionOf, luminaireSources, type PointSource } from './sources';

/**
 * A scene's light, ready to be read at any point with `directIlluminance`:
 * its luminaires as point sources (maintained, dimmed, split into cells) and
 * its furniture as boxes that cast shadows.
 */
export interface DirectLight {
  readonly sources: readonly PointSource[];
  readonly blockers: readonly Blocker[];
  /** Luminaires lit by an estimate, for want of an IES file: their figures are rough. */
  readonly estimatedLuminaires: readonly string[];
  /** Luminaires left out because the catalog doesn't know their product. */
  readonly unknownLuminaires: readonly string[];
}

/**
 * Prepares a scene's light for `directIlluminance`. Its values are
 * maintained: multiplied by the settings' maintenance factor. The options
 * say whether openings are split into cells and furniture casts shadows.
 *
 * @throws RangeError if the settings don't fit the room, or an option is out of range.
 */
export function directLight(
  scene: Scene,
  inputs: AnalysisInputs,
  settings: AnalysisSettings = DEFAULT_ANALYSIS_SETTINGS,
  options: CalculationOptions = DEFAULT_CALCULATION_OPTIONS,
): DirectLight {
  checkSettings(settings, scene.room.height);
  checkCalculationOptions(options);
  // One cell as large as any opening: the luminaire as a single point.
  const cellM = options.splitOpenings ? options.sourceCellM : Number.POSITIVE_INFINITY;
  const estimatedLuminaires: string[] = [];
  const unknownLuminaires: string[] = [];
  const sources: PointSource[] = [];
  for (const luminaire of scene.luminaires) {
    const product = inputs.catalog.get(luminaire.productId);
    if (!product) {
      unknownLuminaires.push(luminaire.id);
      continue;
    }
    const photometry = inputs.photometry(product.id);
    if (!photometry) estimatedLuminaires.push(luminaire.id);
    const layout = fixtureLayout(product, inputs.modelFile(product.id));
    const frame = luminaireFrame(luminaire, product.mount, scene.room, layout);
    const level = luminaire.on ? luminaire.dimming : 0;
    sources.push(
      ...luminaireSources(
        frame,
        distributionOf(product, photometry),
        photometry?.luminousOpening,
        level * settings.maintenanceFactor,
        cellM,
      ),
    );
  }
  const blockers = options.furnitureShadows ? furnitureBlockers(scene.furniture) : [];
  return { sources, blockers, estimatedLuminaires, unknownLuminaires };
}
