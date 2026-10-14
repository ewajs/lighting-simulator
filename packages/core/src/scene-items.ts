// Scene operations that work on luminaires and furniture alike, by id
// (ADR 0048). Ids are unique across both lists. Pure functions over plain data.

import { copyFurniture } from './furniture';
import { copyLuminaire } from './luminaires';
import type { Catalog, Scene, SceneItem, Vec3 } from './types';

/** The luminaire or piece of furniture with this id, or undefined if there is none. */
export function findItem(scene: Scene, id: string): SceneItem | undefined {
  const luminaire = scene.luminaires.find((l) => l.id === id);
  if (luminaire) return { kind: 'luminaire', item: luminaire };
  const piece = scene.furniture.find((f) => f.id === id);
  return piece && { kind: 'furniture', item: piece };
}

/**
 * The middle of an item: a luminaire's position; a piece's centre, half its
 * height above the floor (a wall piece's position already is its centre).
 */
export function itemCentre({ kind, item }: SceneItem): Vec3 {
  if (kind === 'luminaire' || item.position.y !== 0) return item.position;
  return { ...item.position, y: item.size.height / 2 };
}

/** Removes the given luminaires and pieces. Unknown ids are an error. */
export function removeItems(scene: Scene, ids: readonly string[]): Scene {
  ids.forEach((id) => mustFind(scene, id));
  const removed = new Set(ids);
  return {
    ...scene,
    luminaires: scene.luminaires.filter((l) => !removed.has(l.id)),
    furniture: scene.furniture.filter((f) => !removed.has(f.id)),
  };
}

/**
 * Copies the given luminaires and pieces, each beside its source (see
 * `copyLuminaire`, `copyFurniture`). `newIds[i]` is the id of the copy of `ids[i]`.
 */
export function duplicateItems(
  scene: Scene,
  ids: readonly string[],
  newIds: readonly string[],
  catalog: Catalog,
): Scene {
  if (newIds.length !== ids.length) {
    throw new Error(`duplicateItems: got ${newIds.length} new ids for ${ids.length} items`);
  }
  let next = scene;
  ids.forEach((id, i) => {
    const found = mustFind(scene, id);
    const newId = newIds[i]!;
    next =
      found.kind === 'luminaire'
        ? {
            ...next,
            luminaires: [...next.luminaires, copyLuminaire(found.item, newId, scene.room, catalog)],
          }
        : { ...next, furniture: [...next.furniture, copyFurniture(found.item, newId, scene.room)] };
  });
  return next;
}

function mustFind(scene: Scene, id: string): SceneItem {
  const found = findItem(scene, id);
  if (!found) throw new Error(`Unknown luminaire or piece of furniture "${id}"`);
  return found;
}
