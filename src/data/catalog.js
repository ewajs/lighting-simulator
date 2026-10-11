/**
 * Sample catalog for development. Names come from the Leuk catalogue. The
 * photometric values (lm, beam) are PLACEHOLDERS until real IES files are
 * attached; `ies` will point to /ies/<file>.ies.
 * Later this is fetched from leuk-api (see docs/SPEC.md §4.6).
 *
 * mount:        recessed | pendant | track | wall | floor | table
 * distribution: spot (directional, uses beam) | wide (diffuse, near-omni)
 */
export const CATEGORIES = [
  { id: 'recessed', name: 'Recessed' },
  { id: 'pendant', name: 'Pendants' },
  { id: 'track', name: 'Track' },
  { id: 'wall', name: 'Wall & exterior' },
  { id: 'floor', name: 'Floor & table' },
];

export const PRODUCTS = [
  { id: 'seb-1-negro', name: 'SEB 1', finish: 'Black', category: 'recessed', mount: 'recessed', watts: 7, lumens: 560, cct: 3000, cri: 90, beam: 36, distribution: 'spot', ies: null },
  { id: 'mila-3-blanco', name: 'MILA 3', finish: 'White', category: 'recessed', mount: 'recessed', watts: 3 * 12, lumens: 3 * 850, cct: 3000, cri: 90, beam: 24, distribution: 'spot', ies: null },
  { id: 'yasas-negro', name: 'YASAS', finish: 'Black', category: 'pendant', mount: 'pendant', watts: 48, lumens: 4200, cct: 3000, cri: 85, beam: 110, distribution: 'wide', drop: 0.9, ies: null },
  { id: 'baco', name: 'BACO', finish: 'Natural bamboo', category: 'pendant', mount: 'pendant', watts: 9, lumens: 806, cct: 2700, cri: 80, beam: 140, distribution: 'wide', drop: 0.8, ies: null },
  { id: 'riel-spot', name: 'RIEL SPOT', finish: 'Black / White', category: 'track', mount: 'track', watts: 12, lumens: 1000, cct: 4000, cri: 90, beam: 24, distribution: 'spot', ies: null },
  { id: 'plevres', name: 'PLEVRES', finish: 'Black, IP44', category: 'wall', mount: 'wall', watts: 6, lumens: 420, cct: 3000, cri: 80, beam: 50, distribution: 'spot', ies: null },
  { id: 'indo', name: 'INDO', finish: 'Natural bamboo', category: 'floor', mount: 'floor', watts: 9, lumens: 806, cct: 2700, cri: 80, beam: 160, distribution: 'wide', height: 1.57, ies: null },
  { id: 'pinaka', name: 'PINAKA', finish: 'Gold & glass', category: 'floor', mount: 'table', watts: 10, lumens: 750, cct: 3000, cri: 85, beam: 160, distribution: 'wide', height: 0.44, ies: null },
];

const byId = new Map(PRODUCTS.map((p) => [p.id, p]));
export const getProduct = (id) => byId.get(id);
