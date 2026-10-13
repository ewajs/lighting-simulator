import {
  consoleLogger,
  Simulator,
  type Catalog,
  type PhotometryProvider,
  type Scene,
} from '@luxstudio/core';
import '@luxstudio/ui';
import '@luxstudio/ui/theme.css';
import { ImportedProducts } from './imported-products';
import { sampleCatalog } from './sample-catalog';
import { sampleDisplay } from './sample-display';
import { sampleModels } from './sample-models';
import { samplePhotometry } from './sample-photometry';

// Visitors can try their own IES files; they join the sample catalog for this visit.
const imported = new ImportedProducts();
const catalog: Catalog = { get: (id) => sampleCatalog.get(id) ?? imported.get(id) };
const photometry: PhotometryProvider = {
  load: (id) => {
    const text = imported.text(id);
    return text === undefined ? samplePhotometry.load(id) : Promise.resolve(text);
  },
};

// `?debug` in the URL logs every step to the console and shows frame rate and draw counts.
const debug = new URLSearchParams(location.search).has('debug');

// The starter layout is the starting scene, not edits: undo can't take it apart.
const simulator = new Simulator({
  catalog,
  scene: starterScene(catalog),
  photometry,
  models: sampleModels,
  logger: consoleLogger(debug ? 'debug' : 'warn'),
});

const app = document.createElement('lxs-app');
app.simulator = simulator;
app.iesImport = true;
app.diagnostics = debug;
// First-time visitors get the getting-started help; it links to the manual,
// which is published next to the demo.
app.helpOnStart = true;
app.manualUrls = {
  'es-AR': new URL('manual/', document.baseURI).href,
  en: new URL('manual/en/', document.baseURI).href,
};
app.catalog = sampleDisplay('es-AR'); // Matches the default UI locale.
// Product names come from the host, so swap them when the user changes language.
app.addEventListener(
  'lxs-locale-change',
  ({ detail }) => (app.catalog = sampleDisplay(detail.locale, imported.items)),
);
app.addEventListener('lxs-import-ies', ({ detail }) => {
  imported.add(detail);
  app.catalog = sampleDisplay(app.locale, imported.items);
});

const brand = document.createElement('span');
brand.slot = 'brand';
brand.textContent = 'Lux Studio';
app.append(brand);
document.body.append(app);

/**
 * A small dining room lit by the real IES products: a linear direct/indirect
 * pendant over the dining table, two wall washers on the back wall, a track
 * spot on the picture on the left wall, and an up/down light on the right wall.
 */
function starterScene(catalog: Catalog): Scene {
  // Built with a scratch simulator, so placement and aim follow the usual rules.
  const sim = new Simulator({ catalog });
  sim.addLuminaire('ies-linear-pendant');
  // Pan 180° turns their forward throw (C0, local +z) towards the back wall at z = −2.
  for (const x of [-1.2, 1.2]) {
    const washer = sim.addLuminaire('ies-wall-washer', { x, z: -1.5 });
    sim.updateLuminaire(washer, { aim: { tiltDeg: 0, panDeg: 180 } });
  }
  // Pan −90° turns the spot towards the left wall at x = −2.5; 50° tilt meets
  // it 1.5 / tan 50° ≈ 1.26 m below the ceiling, at the picture's centre.
  const spot = sim.addLuminaire('ies-track-spot', { x: -1, z: 0.8 });
  sim.updateLuminaire(spot, { aim: { tiltDeg: 50, panDeg: -90 } });
  sim.addLuminaire('ies-wall-up-down', { x: 2.4, z: 0 });

  sim.addFurniture('dining-table');
  // Two chairs on each long side, facing the table (a chair faces +z unturned).
  for (const x of [-0.4, 0.4]) {
    sim.addFurniture('chair', { x, z: -0.55 });
    const facing = sim.addFurniture('chair', { x, z: 0.55 });
    sim.updateFurniture(facing, { rotationDeg: 180 });
  }
  const picture = sim.addFurniture('artwork', { x: -2.5, z: 0.8 });
  sim.updateFurniture(picture, { position: { x: -2.5, y: 1.45, z: 0.8 } });
  sim.addFurniture('plant', { x: 2.1, z: -1.65 });
  return sim.scene;
}
