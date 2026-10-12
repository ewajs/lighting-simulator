import { Simulator, type Catalog, type PhotometryProvider } from '@luxstudio/core';
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

const simulator = new Simulator({ catalog, photometry, models: sampleModels });
addStarterLayout(simulator);

const app = document.createElement('lxs-app');
app.simulator = simulator;
app.iesImport = true;
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
 * A small room lit by the real IES products: a linear direct/indirect pendant
 * over the centre, two wall washers on the back wall, a track spot aimed at
 * the left wall and an up/down light on the right wall.
 */
function addStarterLayout(sim: Simulator): void {
  sim.addLuminaire('ies-linear-pendant');
  // Pan 180° turns their forward throw (C0, local +z) towards the back wall at z = −2.
  for (const x of [-1.2, 1.2]) {
    const washer = sim.addLuminaire('ies-wall-washer', { x, z: -1.5 });
    sim.updateLuminaire(washer, { aim: { tiltDeg: 0, panDeg: 180 } });
  }
  // Pan −90° tilts the spot towards the left wall at x = −2.5.
  const spot = sim.addLuminaire('ies-track-spot', { x: -1, z: 0.8 });
  sim.updateLuminaire(spot, { aim: { tiltDeg: 45, panDeg: -90 } });
  sim.addLuminaire('ies-wall-up-down', { x: 2.4, z: 0 });
}
