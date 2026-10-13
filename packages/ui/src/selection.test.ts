import { describe, expect, it } from 'vitest';
import { DEFAULT_ROOM, type Furniture, type Luminaire, type Scene } from '@luxstudio/core';
import { pruneSelection, selectionAfterPick, selectionForMove, selectionKind } from './selection';

const luminaire = (id: string) => ({ id }) as Luminaire;
const piece = (id: string) => ({ id }) as Furniture;
/** Luminaires a, b, c and pieces of furniture f, g. */
const scene: Scene = {
  room: DEFAULT_ROOM,
  luminaires: ['a', 'b', 'c'].map(luminaire),
  furniture: ['f', 'g'].map(piece),
};

describe('selectionKind', () => {
  it('tells luminaires from furniture', () => {
    expect(selectionKind(['a'], scene)).toBe('luminaire');
    expect(selectionKind(['g', 'f'], scene)).toBe('furniture');
    expect(selectionKind(['gone'], scene)).toBeUndefined();
    expect(selectionKind([], scene)).toBeUndefined();
  });
});

describe('selectionForMove', () => {
  it('keeps the selection when moving a selected item', () => {
    const current = ['a', 'b'];
    expect(selectionForMove(current, 'b')).toBe(current);
  });

  it('selects only an unselected item that starts moving', () => {
    expect(selectionForMove(['a', 'b'], 'c')).toEqual(['c']);
    expect(selectionForMove(['a', 'b'], 'f')).toEqual(['f']);
  });
});

describe('selectionAfterPick', () => {
  it('replaces the selection on a plain click', () => {
    expect(selectionAfterPick(['a', 'b'], 'c', false, scene)).toEqual(['c']);
    expect(selectionAfterPick(['a', 'b'], 'f', false, scene)).toEqual(['f']);
  });

  it('clears on a plain click on empty space', () => {
    expect(selectionAfterPick(['a'], null, false, scene)).toEqual([]);
  });

  it('adds and removes with toggle', () => {
    expect(selectionAfterPick(['a'], 'b', true, scene)).toEqual(['a', 'b']);
    expect(selectionAfterPick(['a', 'b'], 'a', true, scene)).toEqual(['b']);
    expect(selectionAfterPick(['f'], 'g', true, scene)).toEqual(['f', 'g']);
  });

  it('starts over when toggling in the other kind', () => {
    expect(selectionAfterPick(['a', 'b'], 'f', true, scene)).toEqual(['f']);
    expect(selectionAfterPick(['f'], 'a', true, scene)).toEqual(['a']);
  });

  it('keeps the selection on a toggle click on empty space', () => {
    const current = ['a'];
    expect(selectionAfterPick(current, null, true, scene)).toBe(current);
  });
});

describe('pruneSelection', () => {
  it('drops ids that left the scene', () => {
    expect(pruneSelection(['a', 'gone'], scene)).toEqual(['a']);
    expect(pruneSelection(['f', 'gone'], scene)).toEqual(['f']);
  });

  it('returns the same array when nothing changed', () => {
    const selection = ['a'];
    expect(pruneSelection(selection, scene)).toBe(selection);
  });
});
