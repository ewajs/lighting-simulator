import { constrainPosition, defaultPosition } from './placement';
import type { Catalog, FloorPoint, Luminaire, Product, Scene } from './types';
import { assertFinite, assertInRange, assertPositive } from './validate';

/** How far a duplicate is offset from its source along x, in m. */
export const DUPLICATE_OFFSET = 0.5;

/** The luminaire fields a host may change. */
export type LuminairePatch = Partial<
  Pick<Luminaire, 'position' | 'aim' | 'dimming' | 'on' | 'cct'>
>;

/** Adds a luminaire for `product`, at its mount height above `at` (default: room centre). */
export function addLuminaire(scene: Scene, product: Product, id: string, at?: FloorPoint): Scene {
  assertProduct(product);
  const luminaire: Luminaire = {
    id,
    productId: product.id,
    position: defaultPosition(product, scene.room, at),
    aim: { tiltDeg: 0, panDeg: 0 },
    dimming: 1,
    on: true,
    cct: product.cct,
  };
  return { ...scene, luminaires: [...scene.luminaires, luminaire] };
}

/** Applies `patch` to one luminaire. A new position is constrained to the product's mount type. */
export function updateLuminaire(
  scene: Scene,
  id: string,
  patch: LuminairePatch,
  catalog: Catalog,
): Scene {
  const current = findLuminaire(scene, id);
  const next = { ...current, ...patch };
  assertLuminaire(next);
  const position = constrainPosition(next.position, catalog.get(next.productId), scene.room);
  return {
    ...scene,
    luminaires: scene.luminaires.map((l) => (l.id === id ? { ...next, position } : l)),
  };
}

/** Removes the given luminaires. Unknown ids are an error. */
export function removeLuminaires(scene: Scene, ids: readonly string[]): Scene {
  ids.forEach((id) => findLuminaire(scene, id));
  const removed = new Set(ids);
  return { ...scene, luminaires: scene.luminaires.filter((l) => !removed.has(l.id)) };
}

/** Copies the given luminaires, offset by DUPLICATE_OFFSET. `newIds[i]` is the id of the copy of `ids[i]`. */
export function duplicateLuminaires(
  scene: Scene,
  ids: readonly string[],
  newIds: readonly string[],
  catalog: Catalog,
): Scene {
  if (newIds.length !== ids.length) {
    throw new Error(
      `duplicateLuminaires: got ${newIds.length} new ids for ${ids.length} luminaires`,
    );
  }
  const copies = ids.map((id, i) => {
    const source = findLuminaire(scene, id);
    const position = { ...source.position, x: source.position.x + DUPLICATE_OFFSET };
    return {
      ...source,
      id: newIds[i]!,
      position: constrainPosition(position, catalog.get(source.productId), scene.room),
    };
  });
  return { ...scene, luminaires: [...scene.luminaires, ...copies] };
}

export function assertProduct(product: Product): void {
  const name = `product "${product.id}"`;
  assertFinite(`${name} power`, product.power);
  assertFinite(`${name} flux`, product.flux);
  assertPositive(`${name} cct`, product.cct);
  assertInRange(`${name} beamDeg`, product.beamDeg, 0, 360);
  if (product.suspension !== undefined) assertFinite(`${name} suspension`, product.suspension);
}

export function assertLuminaire(luminaire: Luminaire): void {
  const name = `luminaire "${luminaire.id}"`;
  const { position, aim } = luminaire;
  assertFinite(`${name} position.x`, position.x);
  assertFinite(`${name} position.y`, position.y);
  assertFinite(`${name} position.z`, position.z);
  assertFinite(`${name} aim.tiltDeg`, aim.tiltDeg);
  assertFinite(`${name} aim.panDeg`, aim.panDeg);
  assertInRange(`${name} dimming`, luminaire.dimming, 0, 1);
  assertPositive(`${name} cct`, luminaire.cct);
}

function findLuminaire(scene: Scene, id: string): Luminaire {
  const luminaire = scene.luminaires.find((l) => l.id === id);
  if (!luminaire) throw new Error(`Unknown luminaire "${id}"`);
  return luminaire;
}
