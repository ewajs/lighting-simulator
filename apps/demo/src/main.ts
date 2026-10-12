import { Simulator } from '@luxstudio/core';
import '@luxstudio/ui';
import '@luxstudio/ui/theme.css';
import { sampleCatalog } from './sample-catalog';
import { sampleDisplay } from './sample-display';
import { samplePhotometry } from './sample-photometry';

const simulator = new Simulator({ catalog: sampleCatalog, photometry: samplePhotometry });
addStarterLayout(simulator);

const app = document.createElement('lxs-app');
app.simulator = simulator;
app.catalog = sampleDisplay('es-AR'); // Matches the default UI locale.
// Product names come from the host, so swap them when the user changes language.
app.addEventListener(
  'lxs-locale-change',
  ({ detail }) => (app.catalog = sampleDisplay(detail.locale)),
);

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
