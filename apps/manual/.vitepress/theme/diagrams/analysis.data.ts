// The Analysis section's overview pages (ADR 0062): every room's summary and
// timings, from the accuracy workspace's committed results.
import { defineLoader } from 'vitepress';
import type { AccuracySummary, Timings } from '../analysis/types';
import { accuracySummaryText, accuracyTimingsText } from './files';

/** summary.json and timings.json together. */
export interface AnalysisData {
  readonly summary: AccuracySummary;
  readonly timings: Timings;
}

declare const data: AnalysisData;
export { data };

export default defineLoader({
  load(): AnalysisData {
    return {
      summary: JSON.parse(accuracySummaryText()) as AccuracySummary,
      timings: JSON.parse(accuracyTimingsText()) as Timings,
    };
  },
});
