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

/** A small lit room: a pendant over the centre, downlights, a tilted track spot, a wall light and a floor lamp. */
function addStarterLayout(sim: Simulator): void {
  sim.addLuminaire('pendant-48w');
  for (const [x, z] of [
    [-1.5, -1.1],
    [1.5, -1.1],
    [-1.5, 1.1],
  ] as const) {
    sim.addLuminaire('downlight-7w', { x, z });
  }
  const spot = sim.addLuminaire('track-spot-12w', { x: 1.5, z: 1.1 });
  sim.updateLuminaire(spot, { aim: { tiltDeg: 35, panDeg: 0 } });
  sim.addLuminaire('wall-light-6w', { x: 2.4, z: 0 });
  sim.addLuminaire('floor-lamp-9w', { x: -2, z: 1.5 });
}
