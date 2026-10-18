// The calculation's features, added one at a time, each measured against
// Radiance's full light (ADR 0061): what each feature buys, room by room. A
// step that makes things worse shows it.
import { DEFAULT_CALCULATION_OPTIONS, type CalculationOptions } from '@luxstudio/core';
import { BRIGHT_SHARE, compareReference, summarize, type Reference } from './compare';

/** One step of the story: its features, each one added to the step before. */
export interface FeatureStep {
  /** A stable name for the manual's labels: `point-sources` and so on. */
  readonly id: string;
  readonly options: CalculationOptions;
  /** The reference's furniture made black: it hides bounced light but reflects none. */
  readonly blackFurniture?: boolean;
}

const NOTHING = {
  ...DEFAULT_CALCULATION_OPTIONS,
  splitOpenings: false,
  furnitureShadows: false,
  bouncedLight: false,
  furnitureInBouncedLight: false,
  luminaireBodies: false,
};

/** Everything up to furniture in bounced light: the default, before luminaire bodies (ADR 0075). */
const NO_BODIES = { ...DEFAULT_CALCULATION_OPTIONS, luminaireBodies: false };

/**
 * From the simplest calculation, each luminaire one point of direct light, to
 * everything, the feature that matters most first: bounced light is a third
 * or more of a room's light, and would hide what the others do.
 */
export const FEATURE_STEPS: readonly FeatureStep[] = [
  { id: 'point-sources', options: NOTHING },
  { id: 'bounced-light', options: { ...NOTHING, bouncedLight: true } },
  { id: 'split-openings', options: { ...NOTHING, bouncedLight: true, splitOpenings: true } },
  {
    id: 'furniture-shadows',
    options: { ...NOTHING, bouncedLight: true, splitOpenings: true, furnitureShadows: true },
  },
  // Half a feature, shown because it makes things worse: furniture that hides
  // bounced light without reflecting any is a set of black boxes (ADR 0063).
  { id: 'furniture-hides-bounce', options: NO_BODIES, blackFurniture: true },
  { id: 'furniture-in-bounce', options: NO_BODIES },
  { id: 'luminaire-bodies', options: DEFAULT_CALCULATION_OPTIONS },
];

/** How one step compares with Radiance's full light in one room. */
export interface FeatureResult {
  readonly step: string;
  /** The largest |ours / Radiance − 1| among the room's surface averages. */
  readonly worstAverage: number;
  /** The mean |ours / Radiance − 1| over the room's bright points (see BRIGHT_SHARE). */
  readonly meanPointError: number;
  /** The largest |ours / Radiance − 1| among bright points at least 1 m from a luminaire. */
  readonly worstFar: number;
  /** The same among bright points nearer than 1 m; 0 if none. */
  readonly worstNear: number;
  /** Each surface's ours / Radiance − 1, signed: below 0, too dark. */
  readonly surfaces: readonly { readonly surface: string; readonly averageError: number }[];
}

/**
 * Every feature step in one reference room, against Radiance's total light
 * with the room as it is, furniture and all: what a light meter would read.
 *
 * @param iesFiles The IES files' text by file name.
 */
export function featureStudy(
  reference: Reference,
  iesFiles: Readonly<Record<string, string>>,
): FeatureResult[] {
  const origins = reference.room.luminaires.map((luminaire) => luminaire.origin);
  return FEATURE_STEPS.map(({ id, options, blackFurniture }) => {
    const points = compareReference(reference, iesFiles, options, true, blackFurniture);
    const surfaces = summarize(points, origins, 'total');
    const brightest = Math.max(...points.map((p) => p.radianceTotalLx));
    const bright = points.filter((p) => p.radianceTotalLx >= BRIGHT_SHARE * brightest);
    const meanPointError =
      bright.reduce((sum, p) => sum + Math.abs(p.oursTotalLx / p.radianceTotalLx - 1), 0) /
      bright.length;
    return {
      step: id,
      worstAverage: Math.max(...surfaces.map((s) => Math.abs(s.averageError))),
      meanPointError,
      worstFar: Math.max(...surfaces.map((s) => s.worstFar)),
      worstNear: Math.max(...surfaces.map((s) => s.worstNear)),
      surfaces: surfaces.map(({ surface, averageError }) => ({ surface, averageError })),
    };
  });
}
