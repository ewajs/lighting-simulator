// The exact illuminance from a glowing rectangle: a check on splitting
// luminous openings into cells (ADR 0069) that doesn't depend on Radiance.
//
// A Lambertian rectangle of luminance L lights a small surface parallel to it
// with E = π · L · F, where F is the configuration factor from the surface to
// the rectangle. For a surface below one corner of an X·h × Y·h rectangle at
// distance h (Howell, "A Catalog of Radiation Heat Transfer Configuration
// Factors", case B-3):
//
//   F = 1/(2π) · [ X/√(1+X²) · atan(Y/√(1+X²)) + Y/√(1+Y²) · atan(X/√(1+Y²)) ]
//
// Any other foot point is a sum of four such corner rectangles, signed.

/** F from a surface below a corner of an `a` × `b` rectangle, `h` away, both parallel. */
function cornerFactor(a: number, b: number, h: number): number {
  const x = a / h;
  const y = b / h;
  const rx = Math.sqrt(1 + x * x);
  const ry = Math.sqrt(1 + y * y);
  return ((x / rx) * Math.atan(y / rx) + (y / ry) * Math.atan(x / ry)) / (2 * Math.PI);
}

/**
 * Illuminance in lx on a surface facing a Lambertian rectangle `widthM` ×
 * `lengthM` whose intensity straight out is `peakCd` (so its luminance is
 * peakCd / area), `distanceM` away, at an offset (`acrossM`, `alongM`) from
 * the point below its centre.
 */
export function rectangleIlluminance(
  peakCd: number,
  widthM: number,
  lengthM: number,
  distanceM: number,
  acrossM = 0,
  alongM = 0,
): number {
  const luminance = peakCd / (widthM * lengthM);
  let factor = 0;
  for (const x of [widthM / 2 - acrossM, widthM / 2 + acrossM]) {
    for (const y of [lengthM / 2 - alongM, lengthM / 2 + alongM]) {
      factor += Math.sign(x) * Math.sign(y) * cornerFactor(Math.abs(x), Math.abs(y), distanceM);
    }
  }
  return Math.PI * luminance * factor;
}
