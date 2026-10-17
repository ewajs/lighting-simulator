// The illuminance calculation's tuning and its features (ADR 0060, 0061): how
// finely it splits things, when it stops, and which parts of the physics it
// counts. Plain data passed through the calculation, with defaults, so any of
// it can become a user setting by wiring alone.

/** How finely the calculation works, when it stops, and what it counts. */
export interface CalculationOptions {
  /**
   * The largest cell a luminous opening is split into, in m (ADR 0057). Against
   * the exact illuminance of a glowing panel, cells are within 1 % from two
   * cells away (area-source.test.ts). 10 cm by default: 5 cm makes points in
   * the penumbra between furniture closer to Radiance, but a light edit takes
   * up to three times as long with linear luminaires (ADR 0069,
   * accuracy/SOURCE-CELL.md), so the Analysis panel offers it as a choice.
   */
  readonly sourceCellM: number;
  /** The largest patch a room surface is split into for bounced light, in m (ADR 0060). */
  readonly patchSizeM: number;
  /**
   * When to stop iterating bounced light: once no patch's exitance changes by
   * more than this share of the brightest patch's.
   */
  readonly tolerance: number;
  /**
   * Split luminous openings into cells of `sourceCellM`. Off, each luminaire
   * is one point of light: faster, and wrong close to a large luminaire.
   */
  readonly splitOpenings: boolean;
  /** Furniture casts shadows on direct light. */
  readonly furnitureShadows: boolean;
  /**
   * Count the light the floor, ceiling and walls reflect, every bounce of it.
   * Off, only direct light: in a typical room, a third or more too dark.
   */
  readonly bouncedLight: boolean;
  /**
   * Furniture takes part in bounced light: it hides it (a floor under a
   * table doesn't see the ceiling) and its faces reflect it, as their finish
   * does (ADR 0063). Needs `bouncedLight` and `furnitureShadows`.
   */
  readonly furnitureInBouncedLight: boolean;
}

/** The defaults: everything counted, sizes chosen by measurement (ADRs 0060, 0069; accuracy/PATCH-SIZE.md, SOURCE-CELL.md). */
export const DEFAULT_CALCULATION_OPTIONS: CalculationOptions = {
  sourceCellM: 0.1,
  patchSizeM: 0.25,
  tolerance: 1e-4,
  splitOpenings: true,
  furnitureShadows: true,
  bouncedLight: true,
  furnitureInBouncedLight: true,
};

/**
 * Checks options that may come from a user: sizes positive and finite, the
 * tolerance between 0 and 1, and no feature on without those it needs.
 *
 * @throws RangeError naming the first bad value.
 */
export function checkCalculationOptions(options: CalculationOptions): void {
  for (const name of ['sourceCellM', 'patchSizeM'] as const) {
    const value = options[name];
    if (!(value > 0) || !Number.isFinite(value)) {
      throw new RangeError(`${name} must be a positive size in m, not ${value}`);
    }
  }
  if (!(options.tolerance > 0 && options.tolerance < 1)) {
    throw new RangeError(`tolerance must be between 0 and 1, not ${options.tolerance}`);
  }
  if (options.furnitureInBouncedLight && !(options.bouncedLight && options.furnitureShadows)) {
    throw new RangeError('furnitureInBouncedLight needs bouncedLight and furnitureShadows');
  }
}
