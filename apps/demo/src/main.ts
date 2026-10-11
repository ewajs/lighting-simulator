import { Simulator } from '@lighting-sim/core';
import '@lighting-sim/ui';
import '@lighting-sim/ui/theme.css';
import { sampleCatalog } from './sample-catalog';
import { sampleDisplay } from './sample-display';

const simulator = new Simulator({ catalog: sampleCatalog });
addStarterLayout(simulator);

const app = document.createElement('lsim-app');
app.simulator = simulator;
// Spanish to match the default UI locale. Switching language arrives with the toggle in 0.6d.
app.catalog = sampleDisplay('es-AR');
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
