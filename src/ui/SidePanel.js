import { h } from './dom.js';
import { icon } from './icons.js';
import { iconButton } from './controls.js';
import { CatalogPanel } from './CatalogPanel.js';
import { ScenePanel } from './ScenePanel.js';

const TABS = [
  { id: 'catalog', label: 'Catalog', icon: 'catalog', panel: CatalogPanel },
  { id: 'scene', label: 'Scene', icon: 'layers', panel: ScenePanel },
];

/** Icon rail + the active tab's panel. Collapsing hides the body and keeps the rail. */
export function SidePanel(ctx) {
  const { store, actions } = ctx;
  const panels = Object.fromEntries(TABS.map((t) => [t.id, t.panel(ctx)]));

  const tabButtons = TABS.map((t) =>
    iconButton(t.icon, t.label, {
      role: 'tab', 'aria-controls': `panel-${t.id}`,
      onclick() {
        const { leftTab, leftCollapsed } = store.get().ui;
        // Clicking the active tab collapses the panel, like most pro tools.
        actions.setUi(leftTab === t.id && !leftCollapsed ? { leftCollapsed: true } : { leftTab: t.id, leftCollapsed: false });
      },
    }));

  const collapse = iconButton('chevronLeft', 'Collapse panel', {
    onclick: () => actions.setUi({ leftCollapsed: !store.get().ui.leftCollapsed }),
  });

  const body = h('div.side-panel__body', TABS.map((t) => h('div', {
    id: `panel-${t.id}`, role: 'tabpanel', style: { display: 'contents' },
  }, panels[t.id])));

  const el = h('aside.side-panel', { 'aria-label': 'Library' },
    h('nav.rail', { role: 'tablist', 'aria-orientation': 'vertical' }, tabButtons, h('div.rail__spacer'), collapse),
    body);

  const update = ({ ui }) => {
    TABS.forEach((t, i) => {
      const active = ui.leftTab === t.id;
      tabButtons[i].setAttribute('aria-selected', active);
      tabButtons[i].setAttribute('aria-pressed', active && !ui.leftCollapsed);
      body.children[i].style.display = active ? 'contents' : 'none';
    });
    const label = ui.leftCollapsed ? 'Expand panel' : 'Collapse panel';
    collapse.replaceChildren(icon(ui.leftCollapsed ? 'chevronRight' : 'chevronLeft'));
    collapse.title = label;
    collapse.setAttribute('aria-label', label);
  };
  store.subscribe((s, prev) => s.ui !== prev.ui && update(s));
  update(store.get());
  return el;
}
