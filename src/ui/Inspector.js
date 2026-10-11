import { h, replace, fmt } from './dom.js';
import { icon, mountIcon } from './icons.js';
import { numberField, sliderField, section, iconButton } from './controls.js';
import { getProduct } from '../data/catalog.js';
import { SURFACE_PRESETS } from '../state/initialState.js';
import { productMeta } from './CatalogPanel.js';

const MOUNT_LABEL = { recessed: 'Recessed · ceiling', track: 'Track · ceiling', pendant: 'Pendant', wall: 'Wall', floor: 'Floor', table: 'Table' };

/**
 * Contextual inspector: room (nothing selected) · one luminaire · many.
 * The DOM is rebuilt only when the *kind* of selection changes; otherwise
 * each field's `set()` is called so typing and dragging are never interrupted.
 */
export function Inspector({ store, actions, viewport }) {
  const body = h('div.panel-scroll');
  const title = h('h2');
  const close = iconButton('x', 'Hide inspector', { onclick: () => actions.setUi({ rightCollapsed: true }) });
  const el = h('aside.inspector', { 'aria-label': 'Inspector' }, h('div.panel-header', title, close), body);

  let key = null;
  let binders = [];
  const bind = (fn) => binders.push(fn);

  function render(s) {
    const sel = s.luminaires.filter((l) => s.selection.includes(l.id));
    const nextKey = sel.length === 0 ? 'room' : sel.length === 1 ? `one:${sel[0].id}` : `many:${sel.map((l) => l.id).join()}`;
    if (nextKey !== key) {
      key = nextKey;
      binders = [];
      if (sel.length === 0) roomView(s);
      else if (sel.length === 1) luminaireView(sel[0], s);
      else multiView(sel);
    }
    for (const fn of binders) fn(s);
  }

  // ---------- Room ----------
  function roomView() {
    title.textContent = 'Room';
    const dim = (label, k, min, max) => {
      const f = numberField({ label, value: store.get().room[k], unit: 'm', step: 0.1, min, max, onChange: (v) => actions.setRoom({ [k]: v }) });
      bind((s) => f.set(s.room[k]));
      return f.el;
    };
    const surface = (k, label) => {
      const color = h('input', { type: 'color', 'aria-label': `${label} colour`, oninput: () => actions.setSurface(k, { color: color.value }) });
      const rho = sliderField({ label: 'Reflectance ρ', value: 0, min: 0.05, max: 0.95, step: 0.01, format: fmt.pct, onChange: (v) => actions.setSurface(k, { reflectance: v }) });
      const presets = h('div.chips', SURFACE_PRESETS.map((p) => h('button.chip', {
        type: 'button', title: `${p.name} · ρ ${fmt.pct(p.reflectance)}`,
        onclick: () => actions.setSurface(k, { color: p.color, reflectance: p.reflectance }),
      }, h('span.chip__dot', { style: { background: p.color } }), p.name)));
      bind((s) => {
        const surf = s.room.surfaces[k];
        if (document.activeElement !== color) color.value = surf.color;
        rho.set(surf.reflectance);
      });
      return section(label, [h('div.swatch-row', h('span.swatch', color), h('div', { style: { flex: 1 } }, rho.el)), presets], { open: k !== 'ceiling' });
    };

    const area = h('b'), volume = h('b');
    bind(({ room }) => {
      area.textContent = `${(room.width * room.depth).toFixed(1)} m²`;
      volume.textContent = `${(room.width * room.depth * room.height).toFixed(1)} m³`;
    });

    replace(body,
      h('div.entity-head',
        h('span.entity-head__thumb', icon('room')),
        h('div', h('div.entity-head__title', 'Rectangular room'), h('div.entity-head__sub', 'Area ', area, ' · Volume ', volume))),
      section('Dimensions', h('div.grid-3', dim('Width', 'width', 1, 30), dim('Depth', 'depth', 1, 30), dim('Height', 'height', 2, 8))),
      surface('floor', 'Floor'),
      surface('walls', 'Walls'),
      surface('ceiling', 'Ceiling'),
      h('p.hint', { style: { padding: 'var(--sp-4)' } }, 'Select a luminaire in the viewport or the Scene list to edit it.'));
  }

  // ---------- One luminaire ----------
  function luminaireView(lum) {
    const p = getProduct(lum.productId);
    const id = lum.id;
    const get = () => store.get().luminaires.find((l) => l.id === id);
    title.textContent = 'Luminaire';

    const name = h('div.entity-head__title');
    bind(() => (name.textContent = get().name));

    const power = iconButton('power', 'On / off (H)', { onclick: actions.toggleSelected });
    bind(() => power.setAttribute('aria-pressed', get().on));

    const dim = sliderField({ label: 'Dimming', value: lum.dimming, format: fmt.pct, onChange: (v) => actions.updateLuminaire(id, { dimming: v }, 'dim') });
    const cct = sliderField({ label: 'Colour temperature', value: lum.cct, min: 2200, max: 6500, step: 100, format: fmt.k, variant: 'cct', onChange: (v) => actions.updateLuminaire(id, { cct: v }, 'cct') });
    bind(() => { dim.set(get().dimming); cct.set(get().cct); });

    const axis = (label, i, opts) => {
      const f = numberField({ label, unit: 'm', step: 0.05, value: lum.position[i], ...opts,
        onChange: (v) => { const pos = [...get().position]; pos[i] = v; actions.updateLuminaire(id, { position: pos }, `pos${i}`); } });
      bind(() => f.set(get().position[i]));
      return f.el;
    };
    const { room } = store.get();
    const yEditable = p.mount === 'pendant' || p.mount === 'wall';
    const yField = axis(p.mount === 'pendant' ? 'Height' : 'Y', 1, { min: 0.3, max: room.height - 0.1 });
    if (!yEditable) yField.querySelector('input').disabled = true;

    const aimable = p.distribution === 'spot' && (p.mount === 'recessed' || p.mount === 'track');
    let aimSection = null;
    if (aimable) {
      const tilt = numberField({ label: 'Tilt', unit: '°', step: 5, decimals: 0, min: 0, max: 90, value: lum.aim.tilt, onChange: (v) => actions.updateLuminaire(id, { aim: { ...get().aim, tilt: v } }, 'tilt') });
      const pan = numberField({ label: 'Pan', unit: '°', step: 5, decimals: 0, min: -180, max: 180, value: lum.aim.pan, onChange: (v) => actions.updateLuminaire(id, { aim: { ...get().aim, pan: v } }, 'pan') });
      bind(() => { tilt.set(get().aim.tilt); pan.set(get().aim.pan); });
      aimSection = section('Aim', h('div.grid-2', tilt.el, pan.el));
    }

    const spec = (label, value, tone) => h('div.field__label', { style: { fontSize: 'var(--fs-sm)' } },
      h('span', label), h('span.field__value', { style: tone ? { color: `var(--${tone})` } : null }, value));

    replace(body,
      h('div.entity-head',
        h('span.entity-head__thumb', icon(mountIcon(p.mount))),
        h('div', name, h('div.entity-head__sub', `${p.name} · ${p.finish}`), h('div.entity-head__sub', MOUNT_LABEL[p.mount]))),
      h('div.entity-actions',
        power,
        iconButton('copy', 'Duplicate (⌘D)', { onclick: actions.duplicateSelected }),
        iconButton('frame', 'Frame (F)', { onclick: () => viewport.frameSelection() }),
        h('span', { style: { flex: 1 } }),
        iconButton('trash', 'Delete (Del)', { class: 'btn--danger', onclick: actions.removeSelected })),
      section('Output', [dim.el, cct.el]),
      section('Position', h('div.grid-3', axis('X', 0, { min: -room.width / 2, max: room.width / 2 }), yField, axis('Z', 2, { min: -room.depth / 2, max: room.depth / 2 }))),
      aimSection,
      section('Product', [
        spec('Power', `${p.watts} W`),
        spec('Luminous flux', fmt.lm(p.lumens)),
        spec('Nominal CCT', fmt.k(p.cct)),
        spec('CRI', `Ra ${p.cri}`),
        spec('Beam angle', `${p.beam}°`),
        spec('Photometry', p.ies ? 'IES' : 'Generic (no IES yet)', p.ies ? null : 'warn'),
      ], { open: false }));
  }

  // ---------- Multiple ----------
  function multiView(sel) {
    title.textContent = 'Selection';
    const ids = sel.map((l) => l.id);
    const dim = sliderField({ label: 'Dimming (all)', value: sel[0].dimming, format: fmt.pct,
      onChange: (v) => actions.updateMany(ids, { dimming: v }, 'dim') });
    const products = [...new Set(sel.map((l) => getProduct(l.productId)?.name))].join(', ');
    replace(body,
      h('div.entity-head',
        h('span.entity-head__thumb', icon('layers')),
        h('div', h('div.entity-head__title', `${sel.length} luminaires`), h('div.entity-head__sub', products))),
      h('div.entity-actions',
        iconButton('power', 'On / off (H)', { onclick: actions.toggleSelected }),
        iconButton('copy', 'Duplicate (⌘D)', { onclick: actions.duplicateSelected }),
        iconButton('frame', 'Frame (F)', { onclick: () => viewport.frameSelection() }),
        h('span', { style: { flex: 1 } }),
        iconButton('trash', 'Delete (Del)', { class: 'btn--danger', onclick: actions.removeSelected })),
      section('Output', dim.el));
  }

  store.subscribe((s, prev) => {
    if (s.luminaires !== prev.luminaires || s.selection !== prev.selection || s.room !== prev.room) render(s);
  });
  render(store.get());
  return el;
}
