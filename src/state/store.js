/**
 * Single observable store with undo/redo.
 *
 * State is treated as immutable: every change produces a new object, so
 * subscribers can detect changes by reference (`state.room !== prev.room`).
 *
 * Only the *document* (what gets saved: project, room, luminaires) is tracked
 * in history. UI and view state (selection, panels, render mode) are not undoable.
 */
const DOC_KEYS = ['project', 'room', 'luminaires'];
const HISTORY_LIMIT = 200;
const COALESCE_MS = 600;

export function createStore(initial) {
  let state = initial;
  const listeners = new Set();
  const undoStack = [];
  const redoStack = [];
  let last = { key: null, time: 0 };

  const pickDoc = (s) => Object.fromEntries(DOC_KEYS.map((k) => [k, s[k]]));

  function emit(prev) {
    for (const fn of listeners) fn(state, prev);
  }

  function set(next) {
    const prev = state;
    state = { ...state, ...next };
    emit(prev);
  }

  /**
   * Apply a document change and record it for undo.
   * Calls sharing a `coalesce` key in quick succession (slider drags, typing)
   * collapse into a single history entry.
   */
  function commit(label, next, { coalesce } = {}) {
    const now = performance.now();
    const merge = coalesce && last.key === coalesce && now - last.time < COALESCE_MS;
    if (!merge) {
      undoStack.push({ label, doc: pickDoc(state) });
      if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
    }
    redoStack.length = 0;
    last = { key: coalesce ?? null, time: now };
    set(next);
  }

  function restore(from, to) {
    const entry = from.pop();
    if (!entry) return;
    to.push({ label: entry.label, doc: pickDoc(state) });
    last = { key: null, time: 0 };
    const ids = new Set(entry.doc.luminaires.map((l) => l.id));
    set({ ...entry.doc, selection: state.selection.filter((id) => ids.has(id)) });
  }

  return {
    get: () => state,
    set,
    commit,
    undo: () => restore(undoStack, redoStack),
    redo: () => restore(redoStack, undoStack),
    canUndo: () => undoStack.length > 0,
    canRedo: () => redoStack.length > 0,
    /** Subscribe to every change. Returns an unsubscribe function. */
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
