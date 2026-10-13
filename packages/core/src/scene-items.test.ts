import { describe, expect, it } from 'vitest';
import { addFurniture } from './furniture';
import { addLuminaire } from './luminaires';
import { duplicateItems, findItem, removeItems } from './scene-items';
import { catalog, emptyScene, product } from './test-fixtures';

/** Luminaire "a" at (1, 2.7, 1) and a chair "f" at the room centre. */
const scene = addFurniture(
  addLuminaire(emptyScene, product('recessed'), 'a', { x: 1, z: 1 }),
  'chair',
  'f',
);

describe('findItem', () => {
  it('finds luminaires and furniture by id, with their kind', () => {
    expect(findItem(scene, 'a')).toEqual({ kind: 'luminaire', item: scene.luminaires[0] });
    expect(findItem(scene, 'f')).toEqual({ kind: 'furniture', item: scene.furniture[0] });
    expect(findItem(scene, 'gone')).toBeUndefined();
  });
});

describe('removeItems', () => {
  it('removes luminaires and furniture together', () => {
    const removed = removeItems(scene, ['f', 'a']);
    expect(removed.luminaires).toEqual([]);
    expect(removed.furniture).toEqual([]);
  });

  it('rejects unknown ids', () => {
    expect(() => removeItems(scene, ['a', 'nope'])).toThrow(/nope/);
  });
});

describe('duplicateItems', () => {
  it('copies each item into its own list, beside its source', () => {
    const copied = duplicateItems(scene, ['f', 'a'], ['f2', 'a2'], catalog);
    expect(copied.luminaires.map((l) => l.id)).toEqual(['a', 'a2']);
    expect(copied.furniture.map((f) => f.id)).toEqual(['f', 'f2']);
    expect(copied.luminaires[1]?.position).toEqual({ x: 1.5, y: 2.7, z: 1 });
    expect(copied.furniture[1]?.position).toEqual({ x: 0.5, y: 0, z: 0 });
  });

  it('rejects unknown ids and a wrong number of new ids', () => {
    expect(() => duplicateItems(scene, ['nope'], ['x'], catalog)).toThrow(/nope/);
    expect(() => duplicateItems(scene, ['a'], [], catalog)).toThrow(/new ids/);
  });
});
