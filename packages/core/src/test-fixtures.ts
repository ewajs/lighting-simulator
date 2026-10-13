// Shared test data: synthetic products, one per mount type. Not exported from the package.
import { DEFAULT_ROOM } from './room';
import type { Catalog, MountType, Product, Room, Scene } from './types';

export function product(mount: MountType, extra: Partial<Product> = {}): Product {
  return { id: `test-${mount}`, mount, power: 10, flux: 800, cct: 3000, beamDeg: 36, ...extra };
}

export const PRODUCTS: readonly Product[] = [
  product('recessed'),
  product('pendant', { suspension: 0.7 }),
  product('track'),
  product('wall'),
  product('floor'),
  product('table'),
];

export const catalog: Catalog = {
  get: (id) => PRODUCTS.find((p) => p.id === id),
};

/** DEFAULT_ROOM is 5 × 4 × 2.7 m: x ∈ [−2.5, 2.5], z ∈ [−2, 2]. */
export const room: Room = DEFAULT_ROOM;

export const emptyScene: Scene = { room, luminaires: [], furniture: [] };
