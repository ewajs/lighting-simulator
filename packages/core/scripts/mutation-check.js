// Mutation check for the illuminance calculation (ADR 0057): plants one
// deliberate mistake at a time and runs the analysis tests. Every mistake must
// make at least one test fail; a mistake the tests miss would let the same bug
// through for real.
//
// It works on a copy of core's src/ in a temporary folder, never on the files
// in the repo: an interrupted run leaves nothing behind but that folder, which
// the system cleans. The copy reaches the repo's dependencies through a
// node_modules link.
//
// Run with `npm run mutation-check -w packages/core`. It checks the source as
// it is now, committed or not. It prints one line per mistake and exits with 1
// if any went unnoticed.

// A Node script; ESLint here only knows browser-neutral globals.
/* global console, process, URL */

import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CORE = fileURLToPath(new URL('..', import.meta.url));
const REPO_MODULES = fileURLToPath(new URL('../../../node_modules', import.meta.url));
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
    correct: 'lux += (candela * cosIncidence) / distance ** 2;',
    slip: 'lux += candela / distance ** 2;',
  },
  {
    name: 'distance not squared',
    file: 'src/analysis/direct.ts',
    correct: 'lux += (candela * cosIncidence) / distance ** 2;',
    slip: 'lux += (candela * cosIncidence) / distance;',
  },
  {
    name: 'split cells not sharing the intensity',
    file: 'src/analysis/sources.ts',
    correct: 'const share = level / offsets.length;',
    slip: 'const share = level;',
  },
  {
    name: 'tilt turned the wrong way',
    file: 'src/aim.ts',
    correct: 'return rotateY(rotateX(v, -tiltDeg * DEG), panDeg * DEG);',
    slip: 'return rotateY(rotateX(v, tiltDeg * DEG), panDeg * DEG);',
  },
  {
    name: 'wall lights not turned from their wall',
    file: 'src/luminaire-frame.ts',
    correct: "return mount === 'wall' ? yawAwayFromWall(luminaire.position, room) : 0;",
    slip: 'return 0;',
  },
  {
    name: 'a head’s light not carried round its pivot',
    file: 'src/luminaire-frame.ts',
    correct: 'const arm = aimed(subtract(lightOrigin, headPivot), luminaire.aim);',
    slip: 'const arm = subtract(lightOrigin, headPivot);',
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

const sandbox = mkdtempSync(join(tmpdir(), 'luxstudio-mutation-'));
const removeSandbox = () => rmSync(sandbox, { recursive: true, force: true });
process.on('SIGINT', () => {
  removeSandbox();
  process.exit(130);
});

let unnoticed = 0;
try {
  cpSync(join(CORE, 'src'), join(sandbox, 'src'), { recursive: true });
  symlinkSync(REPO_MODULES, join(sandbox, 'node_modules'), 'dir');
  for (const { name, file, correct, slip } of MISTAKES) {
    const path = join(sandbox, file);
    const original = readFileSync(path, 'utf8');
    if (original.split(correct).length !== 2) {
      console.log(`✗ ${name}: the code it changes isn't in ${file} once; update this script`);
      unnoticed++;
      continue;
    }
    writeFileSync(path, original.replace(correct, slip));
    const result = spawnSync('npx', ['vitest', 'run', ...TESTS], {
      cwd: sandbox,
      encoding: 'utf8',
    });
    writeFileSync(path, original);
    const failed = /Tests\s+(\d+) failed/.exec(result.stdout)?.[1];
    if (failed) {
      console.log(`✓ ${name}: ${failed} tests fail`);
    } else {
      console.log(`✗ ${name}: no test noticed`);
      unnoticed++;
    }
  }
} finally {
  removeSandbox();
}
process.exit(unnoticed > 0 ? 1 : 0);
