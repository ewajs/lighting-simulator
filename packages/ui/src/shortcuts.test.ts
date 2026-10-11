import { describe, expect, it } from 'vitest';
import { shortcutAction, type KeyPress } from './shortcuts';

const press = (key: string, modifiers: Partial<KeyPress> = {}): KeyPress => ({
  key,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  ...modifiers,
});

describe('shortcutAction', () => {
  it('maps undo and redo with ⌘ or Ctrl', () => {
    expect(shortcutAction(press('z', { metaKey: true }))).toEqual({ type: 'undo' });
    expect(shortcutAction(press('Z', { ctrlKey: true, shiftKey: true }))).toEqual({ type: 'redo' });
    expect(shortcutAction(press('y', { ctrlKey: true }))).toEqual({ type: 'redo' });
  });

  it('maps editing keys', () => {
    expect(shortcutAction(press('Delete'))).toEqual({ type: 'delete' });
    expect(shortcutAction(press('Backspace'))).toEqual({ type: 'delete' });
    expect(shortcutAction(press('d', { metaKey: true }))).toEqual({ type: 'duplicate' });
    expect(shortcutAction(press('a', { ctrlKey: true }))).toEqual({ type: 'select-all' });
    expect(shortcutAction(press('Escape'))).toEqual({ type: 'deselect' });
    expect(shortcutAction(press('h'))).toEqual({ type: 'toggle-on' });
    expect(shortcutAction(press('f'))).toEqual({ type: 'frame' });
  });

  it('maps render modes and views', () => {
    expect(shortcutAction(press('2'))).toEqual({ type: 'render-mode', mode: 'clay' });
    expect(shortcutAction(press('7'))).toEqual({ type: 'view', view: 'top' });
    expect(shortcutAction(press('0'))).toEqual({ type: 'view', view: 'perspective' });
  });

  it('ignores unmapped keys and Alt combinations', () => {
    expect(shortcutAction(press('q'))).toBeNull();
    expect(shortcutAction(press('d'))).toBeNull(); // plain D is not duplicate
    expect(shortcutAction(press('z', { metaKey: true, altKey: true }))).toBeNull();
  });
});
