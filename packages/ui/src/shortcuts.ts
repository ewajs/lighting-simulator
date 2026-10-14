import type { HandleMode, RenderMode, ViewName } from '@luxstudio/core';

/** The handles the app switches between; `none` is only for hosts that want no handle. */
export type EditTool = Exclude<HandleMode, 'none'>;

/** What a keyboard shortcut asks the app to do. */
export type ShortcutAction =
  | { readonly type: 'undo' | 'redo' | 'delete' | 'duplicate' | 'select-all' | 'deselect' }
  | { readonly type: 'save' | 'open' }
  | { readonly type: 'toggle-on' | 'frame' }
  | { readonly type: 'render-mode'; readonly mode: RenderMode }
  | { readonly type: 'tool'; readonly tool: EditTool }
  | { readonly type: 'view'; readonly view: ViewName };

/** The parts of a KeyboardEvent the mapping looks at. */
export type KeyPress = Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey'>;

const RENDER_MODE_KEYS: Record<string, RenderMode> = { '1': 'realistic', '2': 'clay' };
const TOOL_KEYS: Record<string, EditTool> = { w: 'move', e: 'aim' };
const VIEW_KEYS: Record<string, ViewName> = {
  '0': 'perspective',
  '7': 'top',
  '8': 'front',
  '9': 'side',
};

/**
 * Maps a key press to an app action (docs/SPEC.md §5), or null. ⌘ on macOS
 * and Ctrl elsewhere are treated alike.
 */
export function shortcutAction({
  key,
  metaKey,
  ctrlKey,
  shiftKey,
  altKey,
}: KeyPress): ShortcutAction | null {
  if (altKey) return null;
  const k = key.toLowerCase();
  if (metaKey || ctrlKey) {
    if (k === 'z') return { type: shiftKey ? 'redo' : 'undo' };
    if (k === 'y') return { type: 'redo' };
    if (k === 'd') return { type: 'duplicate' };
    if (k === 'a') return { type: 'select-all' };
    if (k === 's') return { type: 'save' };
    if (k === 'o') return { type: 'open' };
    return null;
  }
  if (k === 'delete' || k === 'backspace') return { type: 'delete' };
  if (k === 'escape') return { type: 'deselect' };
  if (k === 'h') return { type: 'toggle-on' };
  if (k === 'f') return { type: 'frame' };
  const tool = TOOL_KEYS[k];
  if (tool) return { type: 'tool', tool };
  const mode = RENDER_MODE_KEYS[k];
  if (mode) return { type: 'render-mode', mode };
  const view = VIEW_KEYS[k];
  if (view) return { type: 'view', view };
  return null;
}

/** True when the key press happened while typing in a field, where shortcuts must not fire. */
export function isTyping(event: Event): boolean {
  return event
    .composedPath()
    .some(
      (target) =>
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable),
    );
}
