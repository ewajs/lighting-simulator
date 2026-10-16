// The light of a product without an IES file, estimated from its catalog
// values (SPEC §4.3): its flux spread evenly over its beam, or over the whole
// sphere for a wide beam. The renderer and the illuminance calculation share it.

import type { Product } from '../types';

/** Products with a wider beam than this are lit as isotropic point lights. */
export const WIDE_BEAM_DEG = 120;

/** Whether a product is drawn as a spotlight (true) or an isotropic point light. */
export function isSpot(product: Product): boolean {
  return product.beamDeg <= WIDE_BEAM_DEG;
}

/**
 * Luminous intensity in cd. A spot spreads all its flux evenly over its beam
 * cone (solid angle 2π(1 − cos(beam/2))); a wide product over the full sphere (4π).
 */
export function candela(product: Product): number {
  if (!isSpot(product)) return product.flux / (4 * Math.PI);
  const halfAngle = ((product.beamDeg / 2) * Math.PI) / 180;
  return product.flux / (2 * Math.PI * (1 - Math.cos(halfAngle)));
}
