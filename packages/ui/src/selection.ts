// Selection rules for the UI (ADR 0019: the host owns selection). Pure, so
// they're unit-tested without a browser.

import type { Scene } from '@luxstudio/core';

/** What a selection holds: luminaires or furniture, never both (ADR 0047). */
export type SelectionKind = 'luminaire' | 'furniture';

/** Whether `id` is a luminaire or a piece of furniture in `scene`; undefined if neither. */
export function kindOf(id: string, scene: Scene): SelectionKind | undefined {
  if (scene.luminaires.some((l) => l.id === id)) return 'luminaire';
  if (scene.furniture.some((f) => f.id === id)) return 'furniture';
  return undefined;
}

/** What the selection holds, or undefined when it is empty. */
export function selectionKind(
  selection: readonly string[],
  scene: Scene,
): SelectionKind | undefined {
  const [first] = selection;
  return first === undefined ? undefined : kindOf(first, scene);
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
  const sameKind = selectionKind(current, scene) === kindOf(pickedId, scene);
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
  const kept = selection.filter((id) => kindOf(id, scene) !== undefined);
  return kept.length === selection.length ? selection : kept;
}
