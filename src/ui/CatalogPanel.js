import { h, replace } from './dom.js';
import { icon, mountIcon } from './icons.js';
import { emptyState } from './controls.js';
import { CATEGORIES, PRODUCTS } from '../data/catalog.js';

export const PRODUCT_MIME = 'application/x-leuk-product';

export function productMeta(p) {
  return `${p.watts} W · ${p.cct} K · ${p.lumens.toLocaleString('en-US')} lm`;
}

export function CatalogPanel({ actions }) {
  let query = '';
  let category = 'all';

  const search = h('input', {
    type: 'search', placeholder: 'Search products', 'aria-label': 'Search products',
    oninput: () => { query = search.value.trim().toLowerCase(); render(); },
  });

  const chipsEl = h('div.chips', { role: 'toolbar', 'aria-label': 'Filter by category' });
  const list = h('div.product-list');

  const card = (p) => h('button.product-card', {
    type: 'button', draggable: 'true', title: 'Click to add · drag into the room to place',
    onclick: () => actions.addLuminaire(p.id),
    ondragstart(e) {
      e.dataTransfer.setData(PRODUCT_MIME, p.id);
      e.dataTransfer.effectAllowed = 'copy';
    },
  },
    h('span.product-card__thumb', icon(mountIcon(p.mount))),
    h('span', { style: { minWidth: 0 } },
      h('div.product-card__name', p.name, h('span', { style: { color: 'var(--text-faint)', fontWeight: 400 } }, ` · ${p.finish}`)),
      h('div.product-card__meta', productMeta(p))),
    h('span.product-card__add', icon('plus')));

  function render() {
    replace(chipsEl, [{ id: 'all', name: 'All' }, ...CATEGORIES].map((c) =>
      h('button.chip', { type: 'button', 'aria-pressed': category === c.id, onclick: () => { category = c.id; render(); } }, c.name)));

    const matches = PRODUCTS.filter((p) =>
      (category === 'all' || p.category === category) &&
      (!query || `${p.name} ${p.finish}`.toLowerCase().includes(query)));

    if (!matches.length) return replace(list, emptyState('search', `No products match “${query}”.`));
    replace(list, CATEGORIES.map((c) => {
      const items = matches.filter((p) => p.category === c.id);
      return items.length ? [h('div.group-label', c.name), items.map(card)] : null;
    }));
  }
  render();

  return h('div', { style: { display: 'contents' } },
    h('div.panel-header', h('h2', 'Catalog'), h('span.panel-header__meta', `${PRODUCTS.length} products`)),
    h('div.catalog-tools', h('span.input', h('span.input__icon', icon('search')), search), chipsEl),
    h('div.panel-scroll', list));
}
