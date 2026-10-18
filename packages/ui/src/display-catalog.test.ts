import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DAYLIGHT,
  DEFAULT_ROOM,
  type Catalog,
  type Luminaire,
  type Product,
} from '@luxstudio/core';
import {
  catalogFacets,
  filterItems,
  luminaireNames,
  NO_FILTER,
  type CatalogItem,
} from './display-catalog';

const items: CatalogItem[] = [
  { productId: 'a', name: 'Lámpara de pie', categoryId: 'floor' },
  { productId: 'b', name: 'Downlight 7 W', categoryId: 'recessed' },
  { productId: 'c', name: 'Downlight 12 W', categoryId: 'recessed' },
];

const product = (id: string, mount: Product['mount'], cct: number) =>
  ({ id, mount, cct, power: 1, flux: 1, beamDeg: 36 }) as Product;
const PRODUCTS: Record<string, Product> = {
  a: product('a', 'floor', 2700),
  b: product('b', 'recessed', 3000),
  c: product('c', 'recessed', 4000),
};
const products: Catalog = { get: (id) => PRODUCTS[id] };
const ids = (list: readonly CatalogItem[]) => list.map((i) => i.productId);

describe('filterItems', () => {
  it('matches the query without accents or case', () => {
    expect(ids(filterItems(items, { ...NO_FILTER, query: 'LAMPARA' }, products))).toEqual(['a']);
  });

  it('combines query and category', () => {
    const filter = { ...NO_FILTER, query: '12', categoryId: 'recessed' };
    expect(ids(filterItems(items, filter, products))).toEqual(['c']);
  });

  it('filters by mount and by colour temperature', () => {
    expect(ids(filterItems(items, { ...NO_FILTER, mount: 'recessed' }, products))).toEqual([
      'b',
      'c',
    ]);
    expect(
      ids(filterItems(items, { ...NO_FILTER, mount: 'recessed', cct: 4000 }, products)),
    ).toEqual(['c']);
    expect(ids(filterItems(items, { ...NO_FILTER, cct: 2700 }, products))).toEqual(['a']);
  });

  it('returns everything without a filter', () => {
    expect(filterItems(items, { ...NO_FILTER, query: '  ' }, products)).toHaveLength(3);
  });

  it('never matches mount or CCT filters for products missing from the catalog', () => {
    const orphan = [{ productId: 'zzz', name: 'Orphan', categoryId: 'x' }];
    expect(filterItems(orphan, NO_FILTER, products)).toHaveLength(1);
    expect(filterItems(orphan, { ...NO_FILTER, cct: 2700 }, products)).toHaveLength(0);
  });
});

describe('catalogFacets', () => {
  it('lists mounts in a fixed order and colour temperatures ascending', () => {
    expect(catalogFacets(items, products)).toEqual({
      mounts: ['recessed', 'floor'],
      ccts: [2700, 3000, 4000],
    });
  });
});

describe('luminaireNames', () => {
  const luminaire = (id: string, productId: string) => ({ id, productId }) as Luminaire;

  it('numbers luminaires per product in scene order', () => {
    const scene = {
      room: DEFAULT_ROOM,
      luminaires: [
        luminaire('1', 'b'),
        luminaire('2', 'a'),
        luminaire('3', 'b'),
        luminaire('4', 'zzz'),
      ],
      furniture: [],
      windows: [],
      daylight: DEFAULT_DAYLIGHT,
    };
    expect([...luminaireNames(scene, { categories: [], items }).values()]).toEqual([
      'Downlight 7 W 1',
      'Lámpara de pie 1',
      'Downlight 7 W 2',
      'zzz 1',
    ]);
  });
});
