// Files the diagrams' data loaders read at build time: the demo's real IES
// files, and the accuracy workspace's results.
import { readFileSync } from 'node:fs';

/** The demo's five IES files, by the product ids the demo gives them. */
export const IES_FILES = {
  downlight: 'LX6C15D010-EX6C159030-6LBMH.ies',
  trackSpot: 'qg63_b35q.ies',
  linearPendant: 'HP-2-ID-4ft-H-B-835-ITL85132.008.ies',
  wallWasher: 'C3L10935NZ10U-C3RLWCC.ies',
  wallUpDown: 'CB3326-L35K-H.ies',
} as const;

/** One of the demo's IES files: its text, decoded as Latin-1 as the format allows. */
export function iesText(key: keyof typeof IES_FILES): string {
  return readFileSync(
    new URL(`../../../../demo/public/ies/${IES_FILES[key]}`, import.meta.url),
    'latin1',
  );
}

/** accuracy/summary.json, as text. */
export function accuracySummaryText(): string {
  return readFileSync(new URL('../../../../../accuracy/summary.json', import.meta.url), 'utf8');
}

/** accuracy/comparison.json, as text: every point of every reference room (ADR 0062). */
export function accuracyComparisonText(): string {
  return readFileSync(new URL('../../../../../accuracy/comparison.json', import.meta.url), 'utf8');
}

/** accuracy/timings.json, as text: how long each room took, here and in Radiance (ADR 0061). */
export function accuracyTimingsText(): string {
  return readFileSync(new URL('../../../../../accuracy/timings.json', import.meta.url), 'utf8');
}
