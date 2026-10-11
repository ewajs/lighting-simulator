import { describe, expect, it } from 'vitest';
import { DEFAULT_ROOM, type Luminaire } from '@lighting-sim/core';
import { filterItems, luminaireNames, type CatalogItem } from './display-catalog';

const items: CatalogItem[] = [
  { productId: 'a', name: 'Lámpara de pie', categoryId: 'floor' },
  { productId: 'b', name: 'Downlight 7 W', categoryId: 'recessed' },
  { productId: 'c', name: 'Downlight 12 W', categoryId: 'recessed' },
];

describe('filterItems', () => {
  it('matches without accents or case', () => {
    expect(filterItems(items, 'LAMPARA', null).map((i) => i.productId)).toEqual(['a']);
  });

  it('filters by category and query together', () => {
    expect(filterItems(items, '12', 'recessed').map((i) => i.productId)).toEqual(['c']);
    expect(filterItems(items, '', 'recessed')).toHaveLength(2);
  });

  it('returns everything for an empty query and no category', () => {
    expect(filterItems(items, '  ', null)).toHaveLength(3);
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
    };
    expect([...luminaireNames(scene, { categories: [], items }).values()]).toEqual([
      'Downlight 7 W 1',
      'Lámpara de pie 1',
      'Downlight 7 W 2',
      'zzz 1',
    ]);
  });
});
