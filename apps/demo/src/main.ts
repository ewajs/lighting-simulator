import { Simulator } from '@lighting-sim/core';
import { VERSION as uiVersion } from '@lighting-sim/ui';

// Placeholder until roadmap step 0.5: shows that the demo resolves both workspace packages.
const { room } = new Simulator({ catalog: { get: () => undefined } }).scene;
const versions = document.querySelector('#versions');
if (versions)
  versions.textContent = `core room ${room.width} × ${room.depth} × ${room.height} m · ui ${uiVersion}`;
