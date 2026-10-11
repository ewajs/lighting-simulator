// Display data the host gives the UI (ADR 0024). Items point into core's
// Catalog, which stays the single source of simulation data. Names and labels
// arrive already in the active language.

import type { Scene } from '@lighting-sim/core';

export interface CatalogCategory {
  readonly id: string;
  readonly label: string;
}

export interface CatalogItem {
  /** Id of the product in core's Catalog. */
  readonly productId: string;
  readonly name: string;
  readonly categoryId: string;
  /** Optional image shown on the product card. */
  readonly thumbnailUrl?: string;
}

/** What the catalog panel shows. Category order is display order. */
export interface DisplayCatalog {
  readonly categories: readonly CatalogCategory[];
  readonly items: readonly CatalogItem[];
}

export const EMPTY_DISPLAY_CATALOG: DisplayCatalog = { categories: [], items: [] };

/** Items matching a search query (accent- and case-insensitive) and an optional category. */
export function filterItems(
  items: readonly CatalogItem[],
  query: string,
  categoryId: string | null,
): readonly CatalogItem[] {
  const needle = normalize(query.trim());
  return items.filter(
    (item) =>
      (categoryId === null || item.categoryId === categoryId) &&
      normalize(item.name).includes(needle),
  );
}

/**
 * A readable name per luminaire: the product's display name plus a number
 * counting luminaires of that product in scene order ("Downlight 7 W 2").
 * Falls back to the product id when the catalog has no display item.
 */
export function luminaireNames(scene: Scene, catalog: DisplayCatalog): ReadonlyMap<string, string> {
  const nameByProduct = new Map(catalog.items.map((item) => [item.productId, item.name]));
  const counts = new Map<string, number>();
  const names = new Map<string, string>();
  for (const { id, productId } of scene.luminaires) {
    const count = (counts.get(productId) ?? 0) + 1;
    counts.set(productId, count);
    names.set(id, `${nameByProduct.get(productId) ?? productId} ${count}`);
  }
  return names;
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}
