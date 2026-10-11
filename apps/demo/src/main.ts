import { Simulator, Viewport } from '@lighting-sim/core';
import { sampleCatalog } from './sample-catalog';

const container = document.querySelector<HTMLElement>('#viewport')!;
const simulator = new Simulator({ catalog: sampleCatalog });
addStarterLayout(simulator);

const viewport = new Viewport({ simulator, container });
viewport.onPick(({ luminaireId }) => viewport.setHighlighted(luminaireId ? [luminaireId] : []));

viewport.init().catch((error: unknown) => {
  console.error(error);
  container.textContent = 'This browser cannot start WebGPU or WebGL 2.';
  container.classList.add('error');
});

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
