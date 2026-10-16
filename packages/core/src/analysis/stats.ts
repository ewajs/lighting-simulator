// Summary figures for a calculation grid, as lighting standards and tools
// report them (EN 12464-1; DIALux and Relux reports).

/** Illuminance figures for one surface, in lx except the ratios. */
export interface IlluminanceStats {
  /** Ē: the mean over the grid's points, which stand for equal areas. */
  readonly averageLx: number;
  readonly minLx: number;
  readonly maxLx: number;
  /** U₀ = Emin / Ē, the uniformity standards set targets for. 0 when Ē is 0. */
  readonly uniformity: number;
  /** Emin / Emax, which some reports add. 0 when Emax is 0. */
  readonly minToMax: number;
}

/**
 * The figures for a grid's illuminance values.
 *
 * @throws RangeError for an empty grid, which has no figures.
 */
export function illuminanceStats(valuesLx: readonly number[]): IlluminanceStats {
  if (valuesLx.length === 0) throw new RangeError('No points to summarise');
  let sum = 0;
  let minLx = Infinity;
  let maxLx = -Infinity;
  for (const value of valuesLx) {
    sum += value;
    minLx = Math.min(minLx, value);
    maxLx = Math.max(maxLx, value);
  }
  const averageLx = sum / valuesLx.length;
  return {
    averageLx,
    minLx,
    maxLx,
    uniformity: averageLx > 0 ? minLx / averageLx : 0,
    minToMax: maxLx > 0 ? minLx / maxLx : 0,
  };
}
