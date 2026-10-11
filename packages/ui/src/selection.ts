// Selection rules for the UI (ADR 0019: the host owns selection). Pure, so
// they're unit-tested without a browser.

import type { Scene } from '@luxstudio/core';

/**
 * Selection after a click. A plain click selects only the hit luminaire (or
 * nothing). With `toggle` (Shift) the hit luminaire is added or removed and
 * a click on empty space keeps the selection.
 */
export function selectionAfterPick(
  current: readonly string[],
  luminaireId: string | null,
  toggle: boolean,
): readonly string[] {
  if (!toggle) return luminaireId ? [luminaireId] : [];
  if (!luminaireId) return current;
  return current.includes(luminaireId)
    ? current.filter((id) => id !== luminaireId)
    : [...current, luminaireId];
}

/** Drops ids that are no longer in the scene (after delete or undo). Keeps the same array if nothing changed. */
export function pruneSelection(selection: readonly string[], scene: Scene): readonly string[] {
  const kept = selection.filter((id) => scene.luminaires.some((l) => l.id === id));
  return kept.length === selection.length ? selection : kept;
}
