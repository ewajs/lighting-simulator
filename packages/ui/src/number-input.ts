// Pure helpers for numeric form fields. Kept DOM-free so they're unit-tested.

/**
 * Parses what a user typed in a number field. Either "," or "." is accepted as
 * the decimal separator (es-AR users type "2,70", others "2.70"); digit
 * grouping is not, since fields hold small values. Returns NaN when invalid.
 */
export function parseNumberInput(text: string): number {
  const trimmed = text.trim().replace(',', '.');
  return /^[-+]?(\d+\.?\d*|\.\d+)$/.test(trimmed) ? Number(trimmed) : Number.NaN;
}

/** Rounds to a number of decimals, avoiding float noise like 0.30000000000000004. */
export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * The value after an arrow-key step: `step` per press (×10 with Shift),
 * clamped to [min, max] and rounded to `decimals`.
 */
export function stepValue(
  value: number,
  direction: 1 | -1,
  {
    step,
    min,
    max,
    decimals,
    large,
  }: { step: number; min: number; max: number; decimals: number; large: boolean },
): number {
  const next = value + direction * step * (large ? 10 : 1);
  return roundTo(Math.min(max, Math.max(min, next)), decimals);
}
