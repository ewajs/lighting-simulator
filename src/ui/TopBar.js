import { h } from './dom.js';
import { icon } from './icons.js';
import { iconButton } from './controls.js';

export function TopBar({ store, actions, onScreenshot, onShare }) {
  const name = h('input.project-name', {
    'aria-label': 'Project name', spellcheck: 'false',
    value: store.get().project.name,
    oninput: () => actions.renameProject(name.value),
    onkeydown: (e) => e.key === 'Enter' && name.blur(),
  });

  const undo = iconButton('undo', 'Undo (⌘Z)', { onclick: actions.undo });
  const redo = iconButton('redo', 'Redo (⇧⌘Z)', { onclick: actions.redo });
  const theme = iconButton('sun', 'Toggle theme', {
    onclick: () => actions.setUi({ theme: store.get().ui.theme === 'dark' ? 'light' : 'dark' }),
  });
  const leftToggle = iconButton('panelLeft', 'Toggle library panel', { 'data-desktop': true,
    onclick: () => actions.setUi({ leftCollapsed: !store.get().ui.leftCollapsed }) });
  const rightToggle = iconButton('panelRight', 'Toggle inspector', { 'data-desktop': true,
    onclick: () => actions.setUi({ rightCollapsed: !store.get().ui.rightCollapsed }) });

  const el = h('header.topbar',
    h('div.topbar__left',
      h('div.brand', h('span.brand__dot'), 'LEUK', h('span.brand__sub', 'Lighting Simulator')),
      h('span.topbar__divider'),
      name),
    h('div.topbar__center', undo, redo),
    h('div.topbar__right',
      leftToggle, rightToggle, theme,
      h('span.topbar__divider'),
      h('button.btn', { type: 'button', onclick: onScreenshot, title: 'Save a PNG of the viewport' }, icon('camera'), h('span', { 'data-desktop': true }, 'Snapshot')),
      h('button.btn.btn--primary', { type: 'button', onclick: onShare }, icon('share'), 'Share')));

  const update = (s) => {
    if (document.activeElement !== name) name.value = s.project.name;
    undo.disabled = !store.canUndo();
    redo.disabled = !store.canRedo();
    theme.replaceChildren(icon(s.ui.theme === 'dark' ? 'sun' : 'moon'));
    leftToggle.setAttribute('aria-pressed', !s.ui.leftCollapsed);
    rightToggle.setAttribute('aria-pressed', !s.ui.rightCollapsed);
  };
  store.subscribe(update);
  update(store.get());
  return el;
}
