// How long a direct illuminance calculation takes for a furnished room, to
// measure before optimising (CLAUDE.md) and to size the live calculation's
// budget (M5.4). `npm run bench -w packages/core` bundles this file with Vite
// and runs it in Node, so it times the code as the app ships it: under
// Vitest, every import goes through a getter that distorts the timing.
import { analyseDirect, type AnalysisInputs } from '../src/analysis/analyse-direct';
import { catalog, photometry, room } from '../src/test-fixtures';
import type { Furniture, Luminaire, Scene } from '../src/types';

/** Runs before timing, so the JIT has compiled the hot paths. */
const WARM_UP_RUNS = 20;
const TIMED_RUNS = 200;

// A downlight-like distribution, asymmetric enough to exercise every lookup,
// with a 1.2 m opening so each luminaire is split into 12 cells.
const FILE = photometry(
  [0, 15, 30, 45, 60, 75, 90, 120, 180],
  [0, 90, 180],
  [
    [1000, 950, 800, 600, 350, 120, 20, 5, 0],
    [1000, 900, 700, 450, 200, 60, 10, 5, 0],
    [1000, 850, 600, 350, 150, 40, 5, 0, 0],
  ],
  { widthM: 0.06, lengthM: 1.2, heightM: 0, round: false },
);

const luminaires: Luminaire[] = [];
for (const x of [-1.5, 0, 1.5]) {
  for (const z of [-1, 1]) {
    luminaires.push({
      id: `l${x}${z}`,
      productId: 'test-recessed',
      position: { x, y: 2.7, z },
      aim: { tiltDeg: 10, panDeg: 30 },
      dimming: 1,
      on: true,
      cct: 3000,
    });
  }
}
const piece = (id: string, kind: Furniture['kind'], x: number, z: number): Furniture => ({
  id,
  kind,
  position: { x, y: 0, z },
  rotationDeg: 15,
  size: { width: 1.6, depth: 0.9, height: 0.75 },
  finish: { main: 'oak', accent: 'oak' },
});
const scene: Scene = {
  room,
  luminaires,
  furniture: [
    piece('t', 'dining-table', 0, 0),
    piece('s', 'sofa', -1.5, 1.4),
    piece('b', 'bookcase', 2, -1.6),
  ],
};
const inputs: AnalysisInputs = { catalog, photometry: () => FILE, modelFile: () => undefined };

for (let i = 0; i < WARM_UP_RUNS; i++) analyseDirect(scene, inputs);
const times: number[] = [];
for (let i = 0; i < TIMED_RUNS; i++) {
  const start = performance.now();
  analyseDirect(scene, inputs);
  times.push(performance.now() - start);
}
times.sort((a, b) => a - b);
const median = times[Math.floor(times.length / 2)]!;
const mean = times.reduce((sum, t) => sum + t, 0) / times.length;
console.log(
  `analyseDirect, 6 luminaires × 12 cells, 3 pieces of furniture, 5 × 4 m room: ` +
    `median ${median.toFixed(1)} ms, mean ${mean.toFixed(1)} ms over ${TIMED_RUNS} runs`,
);
