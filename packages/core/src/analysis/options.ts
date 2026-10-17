// The illuminance calculation's tuning: how finely it splits things and when
// it stops (ADR 0060). Plain data passed through the calculation, with
// defaults, so it can become a user setting by wiring alone.

/** How finely the calculation works, and when it stops. */
export interface CalculationOptions {
  /**
   * The largest cell a luminous opening is split into, in m. The inverse-
   * square law is within about 1 % beyond five times a source's size (the
   * "five-times rule", IES Lighting Handbook), so 10 cm cells hold from 0.5 m
   * away (ADR 0057).
   */
  readonly sourceCellM: number;
  /** The largest patch a room surface is split into for bounced light, in m (ADR 0060). */
  readonly patchSizeM: number;
  /**
   * When to stop iterating bounced light: once no patch's exitance changes by
   * more than this share of the brightest patch's.
   */
  readonly tolerance: number;
}

/** The defaults, chosen by measurement against Radiance (ADR 0060, accuracy/REPORT.md). */
export const DEFAULT_CALCULATION_OPTIONS: CalculationOptions = {
  sourceCellM: 0.1,
  patchSizeM: 0.25,
  tolerance: 1e-4,
};
