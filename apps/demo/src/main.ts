import { VERSION as coreVersion } from '@lighting-sim/core';
import { VERSION as uiVersion } from '@lighting-sim/ui';

// Placeholder until roadmap step 0.5: shows that the demo resolves both workspace packages.
const versions = document.querySelector('#versions');
if (versions) versions.textContent = `core ${coreVersion} · ui ${uiVersion}`;
