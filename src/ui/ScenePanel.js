import { h, replace, fmt } from './dom.js';
import { icon, mountIcon } from './icons.js';
import { emptyState } from './controls.js';
import { getProduct } from '../data/catalog.js';

/** Outline of everything in the scene, plus quick totals. */
export function ScenePanel({ store, actions }) {
  const list = h('div', { role: 'listbox', 'aria-label': 'Luminaires', 'aria-multiselectable': 'true', style: { padding: '0 var(--sp-2)' } });
  const stats = h('div.stats');
  const meta = h('span.panel-header__meta');

  const stat = (label, value, unit) => h('div.stat', h('div.stat__label', label), h('div.stat__value', value, h('small', unit)));

  function render(s) {
    const { luminaires, selection, room } = s;
    meta.textContent = `${luminaires.length} items`;

    let watts = 0, lumens = 0;
    for (const l of luminaires) {
      const p = getProduct(l.productId);
      if (p && l.on) { watts += p.watts * l.dimming; lumens += p.lumens * l.dimming; }
    }
    const area = room.width * room.depth;
    replace(stats,
      stat('Fixtures', luminaires.length, ''),
      stat('Power', +watts.toFixed(1), 'W'),
      stat('Flux', Math.round(lumens).toLocaleString('en-US'), 'lm'),
      stat('Density', (watts / area).toFixed(1), 'W/m²'));

    if (!luminaires.length) {
      return replace(list, emptyState('bulb', 'No luminaires yet. Add one from the catalog.',
        h('button.btn.btn--subtle', { type: 'button', onclick: () => actions.setUi({ leftTab: 'catalog' }) }, 'Open catalog')));
    }
    replace(list, luminaires.map((l) => {
      const p = getProduct(l.productId);
      return h('button.list-row', {
        type: 'button', role: 'option', 'aria-selected': selection.includes(l.id), dataset: { off: !l.on },
        onclick: (e) => (e.shiftKey || e.metaKey ? actions.toggleInSelection(l.id) : actions.select([l.id])),
      },
        icon(mountIcon(p?.mount)),
        h('span.list-row__name', l.name),
        h('span.list-row__meta', l.on ? fmt.pct(l.dimming) : 'off'));
    }));
  }

  store.subscribe((s, prev) => (s.luminaires !== prev.luminaires || s.selection !== prev.selection || s.room !== prev.room) && render(s));
  render(store.get());

  return h('div', { style: { display: 'contents' } },
    h('div.panel-header', h('h2', 'Scene'), meta),
    h('div.panel-scroll',
      h('div', { style: { padding: 'var(--sp-3)' } }, stats),
      h('div.group-label', { style: { padding: 'var(--sp-2) var(--sp-4) var(--sp-1)' } }, 'Luminaires'),
      list));
}
