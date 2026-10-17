// Prints accuracy/timings.json: how long Lux Studio takes for each reference
// room at each feature step, and how long Radiance took for the same points
// (ADR 0061). `npm run accuracy:timings` bundles this with Vite, as the app
// ships, and runs it in Node. Times are this machine's and vary from run to
// run, so no test checks the file; it records which machine it was.
import { cpus, platform, release } from 'node:os';
import { compareReference } from './compare';
import { FEATURE_STEPS } from './features';
import { IES_FILES, REFERENCES } from './inputs';

/** Timed runs per room and step, after one untimed warm-up; the median is kept. */
const RUNS = 7;

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)]!;
};

const rooms = Object.entries(REFERENCES).map(([name, reference]) => ({
  name,
  points: reference.points.length,
  steps: FEATURE_STEPS.map(({ id, options, blackFurniture }) => {
    compareReference(reference, IES_FILES, options, true, blackFurniture);
    const times: number[] = [];
    for (let run = 0; run < RUNS; run++) {
      const start = performance.now();
      compareReference(reference, IES_FILES, options, true, blackFurniture);
      times.push(performance.now() - start);
    }
    return { step: id, medianMs: Number(median(times).toFixed(1)) };
  }),
  radiance: reference.radiance.timing,
}));

const timings = {
  generated: new Date().toISOString().slice(0, 10),
  machine: {
    cpu: cpus()[0]?.model ?? 'unknown',
    cores: cpus().length,
    platform: `${platform()} ${release()}`,
    node: process.version,
  },
  /** What's timed: reading the IES files, preparing the room's light, and every reference point. */
  measures:
    'IES files read, light prepared and bounced light solved, every reference point computed',
  runs: RUNS,
  rooms,
};
console.log(JSON.stringify(timings, null, 2));
