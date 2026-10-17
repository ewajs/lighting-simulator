// Small helpers the diagram components draw with: scales, round tick values,
// and a colour ramp for illuminance maps. Plain functions, type-checked here
// rather than inside the .vue files, which tsc doesn't read (ADR 0059).

/** Maps a value from [d0, d1] to [r0, r1], linearly. */
export function scale(d0: number, d1: number, r0: number, r1: number): (value: number) => number {
  return (value) => r0 + ((value - d0) / (d1 - d0)) * (r1 - r0);
}

/**
 * Round tick values from 0 up to at least `max`: steps of 1, 2 or 5 × 10ⁿ,
 * about `count` of them.
 */
export function ticks(max: number, count = 5): number[] {
  const rough = max / count;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? 10 * magnitude;
  // Up to the first tick at or above max, so nothing drawn is cut off.
  const values: number[] = [0];
  while (values[values.length - 1]! < max) {
    values.push(Number((values.length * step).toPrecision(12)));
  }
  return values;
}

/**
 * Round tick values within [min, max]: multiples of a step of 1, 2 or 5 × 10ⁿ,
 * about `count` of them, so an axis from −3 to 3 shows 0 and not −3, −1, 1, 3.
 */
export function ticksBetween(min: number, max: number, count = 6): number[] {
  const step = ticks(max - min, count)[1]!;
  const values: number[] = [];
  for (let k = Math.ceil(min / step - 1e-9); k * step <= max + 1e-9; k++) {
    values.push(Number((k * step).toPrecision(12)));
  }
  return values;
}

/** An SVG path through points already in screen coordinates. */
export function path(points: readonly (readonly [number, number])[]): string {
  return points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(' ');
}

/**
 * The colour for a share of the maximum, 0–1, on a dark-to-bright ramp that
 * reads in both themes: deep blue, teal, green, yellow, white-hot. Like the
 * false-colour maps lighting tools use.
 */
export function rampColor(share: number): string {
  const stops: [number, [number, number, number]][] = [
    [0, [27, 30, 75]],
    [0.25, [33, 102, 172]],
    [0.5, [44, 162, 95]],
    [0.75, [240, 200, 60]],
    [1, [255, 250, 220]],
  ];
  const t = Math.min(1, Math.max(0, share));
  const upper = stops.findIndex(([at]) => at >= t);
  if (upper <= 0) return `rgb(${stops[0]![1].join(' ')})`;
  const [a, from] = stops[upper - 1]!;
  const [b, to] = stops[upper]!;
  const k = (t - a) / (b - a);
  const mix = from.map((c, i) => Math.round(c + k * (to[i]! - c)));
  return `rgb(${mix.join(' ')})`;
}

/** A number for a label, with the locale's decimal separator. */
export function formatNumber(value: number, lang: string, digits = 0): string {
  return value.toLocaleString(lang, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}
