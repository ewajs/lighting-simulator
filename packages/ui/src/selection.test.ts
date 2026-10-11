import { describe, expect, it } from 'vitest';
import { DEFAULT_ROOM, type Luminaire } from '@luxstudio/core';
import { pruneSelection, selectionAfterPick } from './selection';

describe('selectionAfterPick', () => {
  it('replaces the selection on a plain click', () => {
    expect(selectionAfterPick(['a', 'b'], 'c', false)).toEqual(['c']);
  });

  it('clears on a plain click on empty space', () => {
    expect(selectionAfterPick(['a'], null, false)).toEqual([]);
  });

  it('adds and removes with toggle', () => {
    expect(selectionAfterPick(['a'], 'b', true)).toEqual(['a', 'b']);
    expect(selectionAfterPick(['a', 'b'], 'a', true)).toEqual(['b']);
  });

  it('keeps the selection on a toggle click on empty space', () => {
    const current = ['a'];
    expect(selectionAfterPick(current, null, true)).toBe(current);
  });
});

describe('pruneSelection', () => {
  const luminaire = (id: string) => ({ id }) as Luminaire;
  const scene = { room: DEFAULT_ROOM, luminaires: [luminaire('a')] };

  it('drops ids that left the scene', () => {
    expect(pruneSelection(['a', 'gone'], scene)).toEqual(['a']);
  });

  it('returns the same array when nothing changed', () => {
    const selection = ['a'];
    expect(pruneSelection(selection, scene)).toBe(selection);
  });
});
