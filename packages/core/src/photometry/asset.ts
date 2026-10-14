// Products' IES files as an asset kind: parsed on arrival. See ADR 0034.

import type { AssetKind } from '../asset-cache';
import type { Photometry } from '../types';
import { beamAngleDeg, totalFlux } from './distribution';
import { parseIes } from './ies';

/** Called when a product's photometry has loaded. */
export type PhotometryListener = (productId: string, photometry: Photometry) => void;

/** Parsed IES photometry, by product id. */
export const PHOTOMETRY_ASSET: AssetKind<string, Photometry> = {
  area: '[photometry]',
  noun: 'IES file',
  fallback: 'generic light',
  convert: parseIes,
  describe,
};

/** A one-line summary of a distribution, e.g. for the log. */
function describe(photometry: Photometry): string {
  const { verticalDeg, horizontalDeg, candela, keywords } = photometry;
  const name = keywords['LUMINAIRE'] ?? keywords['LUMCAT'] ?? 'unnamed';
  const peak = Math.max(...candela.flat());
  const planes =
    horizontalDeg.length === 1
      ? 'symmetric about the vertical'
      : `${horizontalDeg.length} C-planes`;
  return [
    name,
    `${verticalDeg.length} angles × ${planes}`,
    `peak ${Math.round(peak)} cd`,
    `${Math.round(totalFlux(photometry))} lm`,
    `beam ${Math.round(beamAngleDeg(photometry))}°`,
  ].join(', ');
}
