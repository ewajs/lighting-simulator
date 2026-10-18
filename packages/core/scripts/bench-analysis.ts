// How long an illuminance calculation takes for a furnished room and a busy one, to measure
// before optimising (CLAUDE.md) and to size the live calculation's budget
// (M5.4): from scratch, and with the room cached, as when only the light
// changes (ADR 0065); and by day, through windows (ADR 0080). `npm run bench -w packages/core` bundles this file with Vite
// and runs it in Node, so it times the code as the app ships it: under
// Vitest, every import goes through a getter that distorts the timing.
import { analyseIlluminance } from '../src/analysis/analyse';
import { DEFAULT_DAYLIGHT } from '../src/daylight';
import { AnalysisCache } from '../src/analysis/cache';
import { DEFAULT_CALCULATION_OPTIONS } from '../src/analysis/options';
import { DEFAULT_ANALYSIS_SETTINGS } from '../src/analysis/settings';
import { FURNITURE_TYPES } from '../src/furniture-kinds';
import type { AnalysisInputs } from '../src/analysis/settings';
import { catalog, photometry, room } from '../src/test-fixtures';
import type { Furniture, Luminaire, RoomWindow, Scene } from '../src/types';

/** Runs before timing, so the JIT has compiled the hot paths. */
const WARM_UP_RUNS = 3;
const TIMED_RUNS = 20;

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
  windows: [],
  daylight: DEFAULT_DAYLIGHT,
  furniture: [
    piece('t', 'dining-table', 0, 0),
    piece('s', 'sofa', -1.5, 1.4),
    piece('b', 'bookcase', 2, -1.6),
  ],
};
// The busy reference room's furniture (accuracy/rooms/busy-open-plan.json, ADR 0068):
// nine pieces at their usual sizes in a 6 × 5 m room, and four chairs around the
// dining table, which block no light (ADR 0057), under the same luminaires.
const usual = (id: string, kind: Furniture['kind'], x: number, z: number, rotationDeg = 0) => ({
  id,
  kind,
  position: { x, y: 0, z },
  rotationDeg,
  size: FURNITURE_TYPES[kind].size,
  finish: FURNITURE_TYPES[kind].finish,
});
const busy: Scene = {
  room: { ...room, width: 6, depth: 5 },
  luminaires,
  windows: [],
  daylight: DEFAULT_DAYLIGHT,
  furniture: [
    usual('tv', 'tv-unit', -2.77, 0.8, 90),
    usual('sofa', 'sofa', -0.75, 0.8, -90),
    usual('coffee', 'coffee-table', -1.8, 0.8, 90),
    usual('a1', 'armchair', -1.8, 2, 180),
    usual('a2', 'armchair', -1.8, -0.4),
    usual('b1', 'bookcase', -2.2, -2.32),
    usual('b2', 'bookcase', -1.1, -2.32),
    usual('dining', 'dining-table', 1.2, 0.4, 90),
    usual('island', 'kitchen-island', 1.6, -1.4),
    ...[0, 0.8].flatMap((z, k) => [
      usual(`c${k}a`, 'chair', 0.6, z, 90),
      usual(`c${k}b`, 'chair', 1.8, z, -90),
    ]),
  ],
};
const inputs: AnalysisInputs = { catalog, photometry: () => FILE, modelFile: () => undefined };

/** The median and mean of `run`'s time, in ms, after warming it up. */
function time(run: (i: number) => void): { median: number; mean: number } {
  for (let i = 0; i < WARM_UP_RUNS; i++) run(i);
  const times: number[] = [];
  for (let i = 0; i < TIMED_RUNS; i++) {
    const start = performance.now();
    run(i);
    times.push(performance.now() - start);
  }
  times.sort((a, b) => a - b);
  return {
    median: times[Math.floor(times.length / 2)]!,
    mean: times.reduce((sum, t) => sum + t, 0) / times.length,
  };
}

const report = (label: string, { median, mean }: { median: number; mean: number }) =>
  console.log(
    `${label}: median ${median.toFixed(1)} ms, mean ${mean.toFixed(1)} ms over ${TIMED_RUNS} runs`,
  );

/** Times `scene` from scratch, and as a live edit: one luminaire dimmed a little more each time, the room cached. */
function bench(label: string, scene: Scene): void {
  console.log(label);
  report(
    '  from scratch',
    time(() => analyseIlluminance(scene, inputs)),
  );
  const cache = new AnalysisCache();
  report(
    '  the light changed, the room cached',
    time((i) => {
      const dimmed = { ...scene.luminaires[0]!, dimming: 1 - (i % 10) / 20 };
      const changed = { ...scene, luminaires: [dimmed, ...scene.luminaires.slice(1)] };
      analyseIlluminance(
        changed,
        inputs,
        DEFAULT_ANALYSIS_SETTINGS,
        DEFAULT_CALCULATION_OPTIONS,
        cache,
      );
    }),
  );
}

// The furnished room by day (ADR 0080): a window on the back wall and a tall
// one on the right, with a sheer, and a skylight, under a clear sky with the sun.
const windows: RoomWindow[] = [
  { id: 'w1', surface: 'wall-z-', position: { x: 0, y: 1.5, z: -2 }, width: 1.2, height: 1.2 },
  { id: 'w2', surface: 'wall-x+', position: { x: 2.5, y: 1.15, z: 0 }, width: 1.8, height: 2.1 },
  { id: 'w3', surface: 'ceiling', position: { x: -1, y: 2.7, z: 0 }, width: 0.9, height: 0.9 },
].map((w, k) => ({
  ...w,
  surface: w.surface as RoomWindow['surface'],
  glazing: 'clear' as const,
  covering: k === 1 ? ('sheer' as const) : ('none' as const),
}));
const byDay: Scene = {
  ...scene,
  windows,
  daylight: { ...DEFAULT_DAYLIGHT, sky: 'clear', latitudeDeg: -34.6, solarHour: 10 },
};

bench('6 luminaires × 12 cells, 3 pieces of furniture, 5 × 4 m room', scene);
bench('the same by day: 3 windows, clear sky and sun', byDay);
bench('6 luminaires × 12 cells, 9 pieces of furniture and 4 chairs, 6 × 5 m room', busy);
