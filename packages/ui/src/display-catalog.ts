// Display data the host gives the UI (ADR 0024). Items point into core's
// Catalog, which stays the single source of simulation data. Names and labels
// arrive already in the active language.

import type { Catalog, MountType, Scene, SurfaceName } from '@luxstudio/core';

/** A catalog section, e.g. "Downlights". Defined by the host; `label` is in the active language. */
export interface CatalogCategory {
  readonly id: string;
  readonly label: string;
}

/** How a product appears in the catalog: its name, section and thumbnail (ADR 0024). */
export interface CatalogItem {
  /** Id of the product in core's Catalog. */
  readonly productId: string;
  readonly name: string;
  readonly categoryId: string;
  /** Optional image shown on the product card. */
  readonly thumbnailUrl?: string;
}

/**
 * A surface material the room panel offers (ADR 0050): a texture core loads
 * through the host's TextureProvider, with its name and swatch.
 */
export interface SurfaceMaterial {
  /** Id of the texture in core's TextureProvider. */
  readonly textureId: string;
  readonly name: string;
  /** Optional image shown on the swatch. */
  readonly thumbnailUrl?: string;
  /** Its typical diffuse reflectance ρ, 0–1 (exclusive of 1); picking the material sets it. */
  readonly reflectance: number;
  /** The surfaces it's offered for, e.g. only the floor for wooden planks. */
  readonly surfaces: readonly SurfaceName[];
}

/** What the catalog panel and the room panel show. Category order is display order. */
export interface DisplayCatalog {
  readonly categories: readonly CatalogCategory[];
  readonly items: readonly CatalogItem[];
  /** Surface materials, in display order. Without them, surfaces offer colours only. */
  readonly materials?: readonly SurfaceMaterial[];
}

export const EMPTY_DISPLAY_CATALOG: DisplayCatalog = { categories: [], items: [] };

/** What the catalog is filtered by. `null` means "any". */
export interface CatalogFilter {
  readonly query: string;
  readonly categoryId: string | null;
  readonly mount: MountType | null;
  readonly cct: number | null;
}

export const NO_FILTER: CatalogFilter = { query: '', categoryId: null, mount: null, cct: null };

/**
 * Items matching every part of the filter. The query is accent- and
 * case-insensitive. Mount and CCT come from the products in core's catalog;
 * items whose product is missing never match those two.
 */
export function filterItems(
  items: readonly CatalogItem[],
  filter: CatalogFilter,
  products: Catalog,
): readonly CatalogItem[] {
  const needle = normalize(filter.query.trim());
  return items.filter((item) => {
    if (filter.categoryId !== null && item.categoryId !== filter.categoryId) return false;
    if (!normalize(item.name).includes(needle)) return false;
    if (filter.mount === null && filter.cct === null) return true;
    const product = products.get(item.productId);
    return (
      !!product &&
      (filter.mount === null || product.mount === filter.mount) &&
      (filter.cct === null || product.cct === filter.cct)
    );
  });
}

/** The mount types and colour temperatures present in the catalog, sorted, for the filter menus. */
export function catalogFacets(
  items: readonly CatalogItem[],
  products: Catalog,
): { mounts: readonly MountType[]; ccts: readonly number[] } {
  const mounts = new Set<MountType>();
  const ccts = new Set<number>();
  for (const item of items) {
    const product = products.get(item.productId);
    if (!product) continue;
    mounts.add(product.mount);
    ccts.add(product.cct);
  }
  return {
    mounts: MOUNT_ORDER.filter((m) => mounts.has(m)),
    ccts: [...ccts].sort((a, b) => a - b),
  };
}

const MOUNT_ORDER: readonly MountType[] = [
  'recessed',
  'pendant',
  'track',
  'wall',
  'floor',
  'table',
];

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
