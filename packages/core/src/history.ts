/** Maximum undo steps kept. Older entries are dropped. */
export const HISTORY_LIMIT = 200;

/**
 * Snapshot undo/redo history (ADR 0016). Immutable: every function returns a
 * new History.
 */
export interface History<T> {
  readonly past: readonly T[];
  readonly future: readonly T[];
  /** Merge key of the most recent recorded edit, if any. */
  readonly lastMergeKey: string | undefined;
}

export function emptyHistory<T>(): History<T> {
  return { past: [], future: [], lastMergeKey: undefined };
}

/**
 * Records `previous` as an undo step before a change. Consecutive edits with
 * the same `mergeKey` share one step: only the state before the first is kept.
 */
export function record<T>(history: History<T>, previous: T, mergeKey?: string): History<T> {
  const merges = mergeKey !== undefined && mergeKey === history.lastMergeKey;
  const past = merges ? history.past : [...history.past, previous].slice(-HISTORY_LIMIT);
  return { past, future: [], lastMergeKey: mergeKey };
}

/** Steps back. Returns undefined when there is nothing to undo. */
export function undo<T>(
  history: History<T>,
  current: T,
): { history: History<T>; state: T } | undefined {
  const state = history.past.at(-1);
  if (state === undefined) return undefined;
  return {
    state,
    history: {
      past: history.past.slice(0, -1),
      future: [current, ...history.future],
      lastMergeKey: undefined,
    },
  };
}

/** Steps forward again. Returns undefined when there is nothing to redo. */
export function redo<T>(
  history: History<T>,
  current: T,
): { history: History<T>; state: T } | undefined {
  const [state, ...future] = history.future;
  if (state === undefined) return undefined;
  return { state, history: { past: [...history.past, current], future, lastMergeKey: undefined } };
}
