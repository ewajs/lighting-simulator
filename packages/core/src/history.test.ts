import { describe, expect, it } from 'vitest';
import { emptyHistory, HISTORY_LIMIT, record, redo, undo } from './history';

describe('history', () => {
  it('undoes and redoes in order', () => {
    // States 1 → 2 → 3.
    let history = record(record(emptyHistory<number>(), 1), 2);
    const back = undo(history, 3);
    expect(back?.state).toBe(2);
    history = back!.history;
    expect(redo(history, 2)?.state).toBe(3);
  });

  it('returns undefined when there is nothing to undo or redo', () => {
    expect(undo(emptyHistory<number>(), 1)).toBeUndefined();
    expect(redo(emptyHistory<number>(), 1)).toBeUndefined();
  });

  it('merges consecutive edits with the same key', () => {
    // 1 → 2 → 3 → 4 where the last two edits share a key: one undo goes back to 2.
    let history = record(emptyHistory<number>(), 1);
    history = record(history, 2, 'drag');
    history = record(history, 3, 'drag');
    expect(history.past).toEqual([1, 2]);
    expect(undo(history, 4)?.state).toBe(2);
  });

  it('does not merge across an undo', () => {
    let history = record(emptyHistory<number>(), 1, 'drag');
    history = undo(history, 2)!.history;
    history = record(history, 1, 'drag');
    expect(history.past).toEqual([1]);
    expect(history.future).toEqual([]);
  });

  it('keeps at most HISTORY_LIMIT steps', () => {
    let history = emptyHistory<number>();
    for (let i = 0; i < HISTORY_LIMIT + 10; i++) history = record(history, i);
    expect(history.past).toHaveLength(HISTORY_LIMIT);
    expect(history.past[0]).toBe(10);
  });
});
