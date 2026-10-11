import { h } from './dom.js';
import { segmented, sliderField, iconButton } from './controls.js';

const VIEWS = [
  { value: 'perspective', label: '3D', title: 'Perspective (0)' },
  { value: 'top', label: 'Top', title: 'Plan view (7)' },
  { value: 'front', label: 'Front', title: 'Front elevation (8)' },
  { value: 'side', label: 'Side', title: 'Side elevation (9)' },
];

/** Floating controls on top of the canvas. */
export function ViewportOverlay({ store, actions, viewport }) {
  const modes = segmented({
    label: 'Render mode', className: 'glass', value: store.get().view.renderMode,
    onChange: (renderMode) => actions.setView({ renderMode }),
    options: [
      { value: 'realistic', label: 'Realistic', icon: 'sun', title: 'Realistic (1)' },
      { value: 'clay', label: 'Clay', icon: 'room', title: 'Clay: neutral materials, light only (2)' },
      { value: 'illuminance', label: 'Illuminance', icon: 'target', title: 'False-colour lux map — coming in M2', disabled: true },
    ],
  });

  const viewButtons = VIEWS.map((v) => h('button.icon-btn', {
    type: 'button', title: v.title, 'aria-label': v.title,
    onclick: () => (store.get().view.preset === v.value ? viewport.setPreset(v.value) : actions.setView({ preset: v.value })),
  }, v.label));

  const exposure = sliderField({
    label: 'Exposure', value: store.get().view.exposure, min: -3, max: 3, step: 0.1,
    format: (v) => `${v > 0 ? '+' : ''}${v.toFixed(1)} EV`,
    onChange: (v) => actions.setView({ exposure: v }),
  });
  exposure.el.addEventListener('dblclick', () => actions.setView({ exposure: 0 }));

  const legend = h('div.legend.glass', { hidden: true },
    h('div.legend__title', 'Illuminance (lx)'),
    h('div.legend__bar'),
    h('div.legend__ticks', ['0', '50', '100', '200', '500', '1000', '2000'].map((t) => h('span', t))));

  const el = h('div.viewport-overlay',
    h('div.ov-top-center', modes.el),
    h('div.ov-top-right',
      h('div.view-stack.glass', { role: 'group', 'aria-label': 'Camera views' }, viewButtons),
      h('div.view-stack.glass', iconButton('frame', 'Frame selection (F)', { onclick: () => viewport.frameSelection() }))),
    h('div.ov-bottom-right', legend, h('div.exposure.glass', { title: 'Double-click to reset' }, exposure.el)),
    h('div.ov-bottom-left',
      h('div.hint.glass', h('kbd', 'Drag'), 'orbit ', h('kbd', 'Right-drag'), 'pan ', h('kbd', 'Scroll'), 'zoom ', h('kbd', 'Click'), 'select')));

  const update = ({ view }) => {
    modes.set(view.renderMode);
    exposure.set(view.exposure);
    legend.hidden = view.renderMode !== 'illuminance';
    viewButtons.forEach((b, i) => b.setAttribute('aria-pressed', VIEWS[i].value === view.preset));
  };
  store.subscribe((s, prev) => s.view !== prev.view && update(s));
  update(store.get());
  return el;
}
