// Luminaires as point sources of light for the illuminance calculation
// (ADR 0057). A luminaire whose luminous opening is larger than SOURCE_CELL_M
// is split into a grid of cells, each a point source with an equal share of
// the intensity, as DIALux and Relux do: the inverse-square law then holds
// close to large luminaires too.

import { candelaAt } from '../photometry/distribution';
import { candela, isSpot } from '../photometry/estimate';
import type { LuminaireFrame } from '../luminaire-frame';
import { add, scale } from '../math';
import type { LuminousOpening, Photometry, Product, Vec3 } from '../types';

/**
 * The largest cell a luminous opening is split into, in m. The inverse-square
 * law is within about 1 % of the truth beyond five times a source's size (the
 * "five-times rule", IES Lighting Handbook), so 10 cm cells hold from 0.5 m
 * away: closer than any point a calculation needs.
 */
export const SOURCE_CELL_M = 0.1;

/** How a source's intensity varies with direction. */
export type Distribution =
  | { readonly kind: 'ies'; readonly photometry: Photometry }
  /**
   * No IES file: the renderer's estimate (lighting.ts), the product's flux
   * spread evenly over its beam, or over the whole sphere for a wide beam.
   */
  | { readonly kind: 'estimated'; readonly candela: number; readonly halfAngleDeg: number };

/** One point source: a luminaire, or one cell of its luminous opening. */
export interface PointSource {
  readonly position: Vec3;
  /** The luminaire's Type C axes, which set the directions its intensity is read in. */
  readonly frame: LuminaireFrame;
  readonly distribution: Distribution;
  /** Multiplies the distribution's intensity: dimming × this cell's share of the opening. */
  readonly scale: number;
}

/** The half-angle of an estimated distribution that lights every direction, in degrees. */
const WHOLE_SPHERE_DEG = 180;

/** The distribution of a product: its IES file's, or else the renderer's estimate. */
export function distributionOf(product: Product, photometry: Photometry | undefined): Distribution {
  if (photometry) return { kind: 'ies', photometry };
  const halfAngleDeg = isSpot(product) ? product.beamDeg / 2 : WHOLE_SPHERE_DEG;
  return { kind: 'estimated', candela: candela(product), halfAngleDeg };
}

/** Luminous intensity in cd towards Type C angles in the source's frame, before its scale. */
export function intensityAt(
  distribution: Distribution,
  verticalDeg: number,
  horizontalDeg: number,
): number {
  if (distribution.kind === 'ies') {
    return candelaAt(distribution.photometry, verticalDeg, horizontalDeg);
  }
  return verticalDeg <= distribution.halfAngleDeg ? distribution.candela : 0;
}

/**
 * A luminaire's point sources: one at its photometric centre, or one per cell
 * of its luminous opening when the opening is larger than SOURCE_CELL_M. A
 * round opening keeps the cells whose centres fall inside it. `level` is its
 * output, 0–1 (dimming, or 0 when off): none at 0.
 */
export function luminaireSources(
  frame: LuminaireFrame,
  distribution: Distribution,
  opening: LuminousOpening | undefined,
  level: number,
): PointSource[] {
  if (level <= 0) return [];
  const offsets = cellOffsets(opening);
  const share = level / offsets.length;
  return offsets.map(({ across, along }) => ({
    position: add(frame.origin, add(scale(frame.side, across), scale(frame.forward, along))),
    frame,
    distribution,
    scale: share,
  }));
}

/**
 * Cell centres across the opening's width (`across`, along the frame's side)
 * and length (`along`, its forward), in m from its centre. Height is not
 * split: openings are flat or close to it in the luminaires this is for.
 */
function cellOffsets(opening: LuminousOpening | undefined): { across: number; along: number }[] {
  const width = opening?.widthM ?? 0;
  const length = opening?.lengthM ?? 0;
  const columns = Math.max(1, Math.ceil(width / SOURCE_CELL_M));
  const rows = Math.max(1, Math.ceil(length / SOURCE_CELL_M));
  const cells: { across: number; along: number }[] = [];
  for (let i = 0; i < columns; i++) {
    for (let j = 0; j < rows; j++) {
      const across = width * ((i + 0.5) / columns - 0.5);
      const along = length * ((j + 0.5) / rows - 0.5);
      if (opening?.round && !insideEllipse(across, along, width / 2, length / 2)) continue;
      cells.push({ across, along });
    }
  }
  return cells.length > 0 ? cells : [{ across: 0, along: 0 }];
}

function insideEllipse(x: number, z: number, halfX: number, halfZ: number): boolean {
  return (x / halfX) ** 2 + (z / halfZ) ** 2 <= 1;
}
