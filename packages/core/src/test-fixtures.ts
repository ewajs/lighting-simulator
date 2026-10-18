// Shared test data: synthetic products, one per mount type. Not exported from the package.
import { DEFAULT_ROOM } from './room';
import type {
  Catalog,
  LuminousOpening,
  MountType,
  Photometry,
  Product,
  Room,
  Scene,
} from './types';
import { DEFAULT_DAYLIGHT } from './daylight';

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

export const emptyScene: Scene = {
  room,
  luminaires: [],
  furniture: [],
  windows: [],
  daylight: DEFAULT_DAYLIGHT,
};

/** A point source's opening: what most IES files state. */
export const POINT_OPENING: LuminousOpening = { widthM: 0, lengthM: 0, heightM: 0, round: false };

/** Photometry from a candela table, one row per horizontal angle. */
export function photometry(
  verticalDeg: readonly number[],
  horizontalDeg: readonly number[],
  candela: readonly (readonly number[])[],
  luminousOpening: LuminousOpening = POINT_OPENING,
): Photometry {
  return { verticalDeg, horizontalDeg, candela, power: 10, luminousOpening, keywords: {} };
}

/** The same intensity, `cd`, in every direction: its flux is 4π · cd. */
export function isotropic(
  cd: number,
  luminousOpening: LuminousOpening = POINT_OPENING,
): Photometry {
  return photometry([0, 180], [0], [[cd, cd]], luminousOpening);
}
