import type { Catalog, Product } from '@luxstudio/core';

/**
 * Generic sample products for the demo. Values are typical for each kind of
 * fixture, not taken from any manufacturer. Real catalogs are injected by the
 * host app in the same way.
 */
export const SAMPLE_PRODUCTS: readonly Product[] = [
  { id: 'downlight-7w', mount: 'recessed', power: 7, flux: 560, cct: 3000, beamDeg: 36 },
  {
    id: 'pendant-48w',
    mount: 'pendant',
    power: 48,
    flux: 4200,
    cct: 3000,
    beamDeg: 140,
    suspension: 0.9,
  },
  { id: 'track-spot-12w', mount: 'track', power: 12, flux: 1000, cct: 4000, beamDeg: 24 },
  { id: 'wall-light-6w', mount: 'wall', power: 6, flux: 420, cct: 2700, beamDeg: 50 },
  { id: 'floor-lamp-9w', mount: 'floor', power: 9, flux: 806, cct: 2700, beamDeg: 160 },
  { id: 'table-lamp-5w', mount: 'table', power: 5, flux: 470, cct: 2700, beamDeg: 160 },
];

const byId = new Map(SAMPLE_PRODUCTS.map((product) => [product.id, product]));

export const sampleCatalog: Catalog = { get: (id) => byId.get(id) };
