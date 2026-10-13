// Selection rules for the UI (ADR 0019: the host owns selection). Pure, so
// they're unit-tested without a browser.

import { findItem, type ItemKind, type Scene } from '@luxstudio/core';

/**
 * What the selection holds, or undefined when it is empty. A selection holds
 * luminaires or furniture, never both (ADR 0047).
 */
export function selectionKind(selection: readonly string[], scene: Scene): ItemKind | undefined {
  const [first] = selection;
  return first === undefined ? undefined : findItem(scene, first)?.kind;
}

/**
 * Selection after a click. A plain click selects only the hit item (or
 * nothing). With `toggle` (Shift) the hit item is added or removed and a
 * click on empty space keeps the selection. Luminaires and furniture aren't
 * mixed: toggling in the other kind starts a new selection with it.
 */
export function selectionAfterPick(
  current: readonly string[],
  pickedId: string | null,
  toggle: boolean,
  scene: Scene,
): readonly string[] {
  if (!toggle) return pickedId ? [pickedId] : [];
  if (!pickedId) return current;
  if (current.includes(pickedId)) return current.filter((id) => id !== pickedId);
  const sameKind = selectionKind(current, scene) === findItem(scene, pickedId)?.kind;
  return sameKind ? [...current, pickedId] : [pickedId];
}

/**
 * Selection when dragging something starts: a selected item moves with the
 * rest of the selection, an unselected one becomes the only selection.
 */
export function selectionForMove(current: readonly string[], movedId: string): readonly string[] {
  return current.includes(movedId) ? current : [movedId];
}

/** Drops ids that are no longer in the scene (after delete or undo). Keeps the same array if nothing changed. */
export function pruneSelection(selection: readonly string[], scene: Scene): readonly string[] {
  const kept = selection.filter((id) => findItem(scene, id));
  return kept.length === selection.length ? selection : kept;
}
