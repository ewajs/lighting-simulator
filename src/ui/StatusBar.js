import { h } from './dom.js';
import { icon } from './icons.js';
import { getProduct } from '../data/catalog.js';

export function StatusBar({ store, viewport }) {
  const val = () => h('b');
  const sel = val(), count = val(), watts = val(), flux = val(), backend = val(), fps = val();
  const item = (iconName, label, value) => h('span.status-item', iconName && icon(iconName), label, value);

  const el = h('footer.statusbar',
    item('target', 'Selected', sel),
    item('bulb', 'Fixtures', count),
    item('zap', 'Load', watts),
    item(null, 'Flux', flux),
    h('span.statusbar__spacer'),
    item('gpu', null, backend),
    item(null, 'FPS', fps),
    h('span.status-item', 'v0.1 · M0'));

  const update = ({ luminaires, selection }) => {
    let w = 0, lm = 0;
    for (const l of luminaires) {
      const p = getProduct(l.productId);
      if (p && l.on) { w += p.watts * l.dimming; lm += p.lumens * l.dimming; }
    }
    sel.textContent = selection.length || '—';
    count.textContent = luminaires.length;
    watts.textContent = `${w.toFixed(1)} W`;
    flux.textContent = `${Math.round(lm).toLocaleString('en-US')} lm`;
  };
  store.subscribe(update);
  update(store.get());
  viewport.onStats((s) => {
    backend.textContent = s.backend;
    fps.textContent = Math.round(s.fps);
  });
  return el;
}
