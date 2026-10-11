/**
 * Detail of `lxs-change`, fired by the form field elements. Consecutive
 * changes from one gesture (a slider drag, a focus session of arrow presses)
 * share a `mergeKey`, so the Simulator records them as one undo step (ADR 0018).
 */
export interface FieldChange {
  readonly value: number;
  readonly mergeKey: string;
}

export const newMergeKey = (): string => crypto.randomUUID();

export function fieldChangeEvent(detail: FieldChange): CustomEvent<FieldChange> {
  return new CustomEvent('lxs-change', { detail, bubbles: true, composed: true });
}

declare global {
  interface HTMLElementEventMap {
    'lxs-change': CustomEvent<FieldChange>;
  }
}
