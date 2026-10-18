// The false-colour scales for illuminance (DESIGN.md, ADR 0066): dark blue
// through cyan, green, yellow, orange and red to white, their stops roughly
// logarithmic and at levels EN 12464-1 asks for (100, 200, 300, 500 lx). One
// scale for the luminaires' light, up to 2000 lx; by day, one up to 10 000 lx,
// as daylight is several times brighter (ADR 0080). The 3D view and its
// legend read the same one, so they can't differ.

import type { IlluminanceAnalysis } from './analyse';

/** A colour on the scale: the illuminance it marks, and its sRGB colour as 0–255 channels. */
export interface FalseColourStop {
  readonly lx: number;
  readonly rgb: readonly [number, number, number];
}

/** The scale's stops, ascending. Above the last, the last colour. */
export const FALSE_COLOUR_STOPS: readonly FalseColourStop[] = [
  { lx: 0, rgb: [11, 26, 74] },
  { lx: 50, rgb: [20, 80, 180] },
  { lx: 100, rgb: [24, 179, 201] },
  { lx: 200, rgb: [76, 207, 92] },
  { lx: 300, rgb: [242, 227, 58] },
  { lx: 500, rgb: [245, 138, 31] },
  { lx: 1000, rgb: [229, 50, 45] },
  { lx: 2000, rgb: [255, 246, 230] },
];

/** The scale by day: the same colours, from 0 to 10 000 lx. */
export const DAYLIGHT_FALSE_COLOUR_STOPS: readonly FalseColourStop[] = [
  { lx: 0, rgb: [11, 26, 74] },
  { lx: 100, rgb: [20, 80, 180] },
  { lx: 300, rgb: [24, 179, 201] },
  { lx: 500, rgb: [76, 207, 92] },
  { lx: 1000, rgb: [242, 227, 58] },
  { lx: 2000, rgb: [245, 138, 31] },
  { lx: 5000, rgb: [229, 50, 45] },
  { lx: 10_000, rgb: [255, 246, 230] },
];

/** The scale for a calculation's results: the daylight one when any daylight came in. */
export function falseColourStops(analysis: IlluminanceAnalysis): readonly FalseColourStop[] {
  const byDay = analysis.surfaces.some((surface) => surface.daylightLx.some((lx) => lx > 0));
  return byDay ? DAYLIGHT_FALSE_COLOUR_STOPS : FALSE_COLOUR_STOPS;
}

/** The colour for an illuminance in lx on a scale: blended between the stops around it, as sRGB 0–255 channels. */
export function falseColour(
  lx: number,
  stops: readonly FalseColourStop[] = FALSE_COLOUR_STOPS,
): [number, number, number] {
  if (!(lx > stops[0]!.lx)) return [...stops[0]!.rgb];
  for (let k = 1; k < stops.length; k++) {
    const upper = stops[k]!;
    if (lx <= upper.lx) {
      const lower = stops[k - 1]!;
      const t = (lx - lower.lx) / (upper.lx - lower.lx);
      return [0, 1, 2].map((c) =>
        Math.round(lower.rgb[c]! + t * (upper.rgb[c]! - lower.rgb[c]!)),
      ) as [number, number, number];
    }
  }
  return [...stops[stops.length - 1]!.rgb];
}
