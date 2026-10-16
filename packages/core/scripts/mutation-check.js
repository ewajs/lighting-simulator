// Mutation check for the illuminance calculation (ADR 0057): plants one
// deliberate mistake at a time in the source, runs the analysis tests, and
// restores the file. Every mistake must make at least one test fail; a
// mistake the tests miss would let the same bug through for real.
//
// Run with `npm run mutation-check -w packages/core` from a clean tree. It
// prints one line per mistake and exits with 1 if any went unnoticed.

// A Node script; ESLint here only knows browser-neutral globals.
/* global console, process, URL */

import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CORE = fileURLToPath(new URL('..', import.meta.url));
const TESTS = ['src/analysis', 'src/luminaire-frame.test.ts', 'src/glb.test.ts'];

/** Each mistake: the file, the correct code, and the plausible slip that replaces it. */
const MISTAKES = [
  {
    name: 'mirrored horizontal angles',
    file: 'src/luminaire-frame.ts',
    correct: 'x: dot(direction, frame.side),',
    slip: 'x: -dot(direction, frame.side),',
  },
  {
    name: 'no cosine of incidence',
    file: 'src/analysis/direct.ts',
    correct: 'lux += (candela * cosIncidence) / distanceSquared;',
    slip: 'lux += candela / distanceSquared;',
  },
  {
    name: 'distance not squared',
    file: 'src/analysis/direct.ts',
    correct: 'lux += (candela * cosIncidence) / distanceSquared;',
    slip: 'lux += (candela * cosIncidence) / distance;',
  },
  {
    name: 'split cells not sharing the intensity',
    file: 'src/analysis/sources.ts',
    correct: 'const scale = level / offsets.length;',
    slip: 'const scale = level;',
  },
  {
    name: 'tilt turned the wrong way',
    file: 'src/luminaire-frame.ts',
    correct: 'return rotateY(rotateX(v, -tiltRad), panRad);',
    slip: 'return rotateY(rotateX(v, tiltRad), panRad);',
  },
  {
    name: 'wall lights not turned from their wall',
    file: 'src/luminaire-frame.ts',
    correct: "const wallYaw = mount === 'wall' ? yawAwayFromWall(luminaire.position, room) : 0;",
    slip: 'const wallYaw = 0;',
  },
  {
    name: 'a head’s light not carried round its pivot',
    file: 'src/luminaire-frame.ts',
    correct: 'tiltRad,\n    panRad,\n  );',
    slip: '0,\n    0,\n  );',
  },
  {
    name: 'no maintenance factor',
    file: 'src/analysis/analyse-direct.ts',
    correct: 'level * settings.maintenanceFactor,',
    slip: 'level,',
  },
  {
    name: 'furniture never blocking',
    file: 'src/analysis/direct.ts',
    correct: 'if (segmentBlocked(point, source.position, blockers)) continue;',
    slip: '',
  },
  {
    name: 'grid spacing not from the longer side',
    file: 'src/analysis/calc-grid.ts',
    correct: 'maxGridSpacing(Math.max(sizeU, sizeV))',
    slip: 'maxGridSpacing(Math.min(sizeU, sizeV))',
  },
];

let restore;
process.on('SIGINT', () => {
  restore?.();
  process.exit(130);
});

let unnoticed = 0;
for (const { name, file, correct, slip } of MISTAKES) {
  const path = `${CORE}${file}`;
  const original = readFileSync(path, 'utf8');
  if (original.split(correct).length !== 2) {
    console.log(`✗ ${name}: the code it changes isn't in ${file} once; update this script`);
    unnoticed++;
    continue;
  }
  restore = () => writeFileSync(path, original);
  writeFileSync(path, original.replace(correct, slip));
  let result;
  try {
    result = spawnSync('npx', ['vitest', 'run', ...TESTS], { cwd: CORE, encoding: 'utf8' });
  } finally {
    restore();
    restore = undefined;
  }
  const failed = /Tests\s+(\d+) failed/.exec(result.stdout)?.[1];
  if (failed) {
    console.log(`✓ ${name}: ${failed} tests fail`);
  } else {
    console.log(`✗ ${name}: no test noticed`);
    unnoticed++;
  }
}
process.exit(unnoticed > 0 ? 1 : 0);
