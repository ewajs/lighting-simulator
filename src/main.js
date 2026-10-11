import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';

import { createStore } from './state/store.js';
import { createInitialState } from './state/initialState.js';
import { createActions } from './state/actions.js';
import { Viewport } from './scene/Viewport.js';
import { h } from './ui/dom.js';
import { TopBar } from './ui/TopBar.js';
import { SidePanel } from './ui/SidePanel.js';
import { Inspector } from './ui/Inspector.js';
import { ViewportOverlay } from './ui/ViewportOverlay.js';
import { StatusBar } from './ui/StatusBar.js';
import { toast } from './ui/controls.js';
import { PRODUCT_MIME } from './ui/CatalogPanel.js';

const initial = createInitialState();
// Start with the library collapsed on tablet-sized screens so the viewport gets the room.
if (window.innerWidth < 1100) initial.ui.leftCollapsed = true;
const store = createStore(initial);
const actions = createActions(store);
const app = document.getElementById('app');

// Viewport first: panels need a reference to it (framing, screenshots, stats).
const viewportEl = h('main.viewport', { 'aria-label': '3D viewport' });
const viewport = new Viewport(viewportEl, { store, actions });
const ctx = { store, actions, viewport };

app.append(
  TopBar({ ...ctx, onScreenshot: snapshot, onShare: () => toast('Sharing arrives with cloud save (M3)') }),
  SidePanel(ctx),
  viewportEl,
  Inspector(ctx),
  StatusBar(ctx),
);
viewportEl.append(ViewportOverlay(ctx));

// ---- Shell state → DOM attributes ----
function applyUi({ ui }) {
  app.dataset.left = ui.leftCollapsed ? 'collapsed' : 'open';
  app.dataset.right = ui.rightCollapsed ? 'collapsed' : 'open';
  document.documentElement.dataset.theme = ui.theme;
}
store.subscribe((s, prev) => s.ui !== prev.ui && applyUi(s));
applyUi(store.get());

// Selecting something reopens a collapsed inspector.
store.subscribe((s, prev) => {
  if (s.selection.length && s.selection !== prev.selection && s.ui.rightCollapsed) actions.setUi({ rightCollapsed: false });
});

// ---- Drag from catalog → drop in room ----
viewportEl.addEventListener('dragover', (e) => {
  if (!e.dataTransfer.types.includes(PRODUCT_MIME)) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
});
viewportEl.addEventListener('drop', (e) => {
  const productId = e.dataTransfer.getData(PRODUCT_MIME);
  if (!productId) return;
  e.preventDefault();
  actions.addLuminaire(productId, viewport.pointOnFloor(e.clientX, e.clientY) ?? undefined);
});

// ---- Keyboard shortcuts (docs/SPEC.md §5) ----
const VIEW_KEYS = { 0: 'perspective', 7: 'top', 8: 'front', 9: 'side' };
const MODE_KEYS = { 1: 'realistic', 2: 'clay' };
window.addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea, select, [contenteditable]')) return;
  const mod = e.metaKey || e.ctrlKey;
  const k = e.key.toLowerCase();
  if (mod && k === 'z') { e.preventDefault(); e.shiftKey ? actions.redo() : actions.undo(); }
  else if (mod && k === 'y') { e.preventDefault(); actions.redo(); }
  else if (mod && k === 'd') { e.preventDefault(); actions.duplicateSelected(); }
  else if (mod && k === 'a') { e.preventDefault(); actions.select(store.get().luminaires.map((l) => l.id)); }
  else if (mod) return;
  else if (k === 'delete' || k === 'backspace') actions.removeSelected();
  else if (k === 'escape') actions.select([]);
  else if (k === 'f') viewport.frameSelection();
  else if (k === 'h') actions.toggleSelected();
  else if (MODE_KEYS[k]) actions.setView({ renderMode: MODE_KEYS[k] });
  else if (VIEW_KEYS[k]) actions.setView({ preset: VIEW_KEYS[k] });
});

async function snapshot() {
  const url = await viewport.screenshot();
  const name = store.get().project.name.trim().replace(/[^\w-]+/g, '-') || 'scene';
  h('a', { href: url, download: `${name}.png` }).click();
  toast('Snapshot saved');
}

viewport.init().catch((err) => {
  console.error(err);
  viewportEl.prepend(h('div.empty', { style: { position: 'absolute', inset: 0, placeContent: 'center' } },
    h('p', 'Your browser could not start WebGPU or WebGL 2. Try the latest Chrome, Edge, Safari or Firefox.')));
});

// Handy for debugging in the console.
if (import.meta.env.DEV) Object.assign(window, { store, actions, viewport });
