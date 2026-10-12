import type { Catalog, Product } from '@luxstudio/core';

/**
 * Sample products for the demo. Real catalogs are injected by the host app in
 * the same way.
 *
 * The generic products have typical values for each kind of fixture and no
 * IES file, so they show the fallback lighting. The `ies-*` products have
 * real manufacturer files (see sample-photometry.ts); their power, flux, CCT
 * and beam angle are copied from those files.
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
  { id: 'ies-downlight', mount: 'recessed', power: 15.8, flux: 1153, cct: 3000, beamDeg: 62 },
  { id: 'ies-track-spot', mount: 'track', power: 40.2, flux: 2913, cct: 3000, beamDeg: 17 },
  {
    id: 'ies-linear-pendant',
    mount: 'pendant',
    power: 46.7,
    flux: 4599,
    cct: 3500,
    // Measured around the zenith: 64 % of its light goes up.
    beamDeg: 101,
    suspension: 0.6,
  },
  { id: 'ies-wall-washer', mount: 'recessed', power: 14, flux: 777, cct: 3500, beamDeg: 82 },
  { id: 'ies-wall-up-down', mount: 'wall', power: 18.2, flux: 1648, cct: 3500, beamDeg: 332 },
];

const byId = new Map(SAMPLE_PRODUCTS.map((product) => [product.id, product]));

export const sampleCatalog: Catalog = { get: (id) => byId.get(id) };
