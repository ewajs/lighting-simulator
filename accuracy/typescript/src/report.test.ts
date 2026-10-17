// The committed report and summary must be what the references give now, so
// the manual (which reads summary.json) and REPORT.md can't go stale.
import { expect, it } from 'vitest';
import committedReport from '../../REPORT.md?raw';
import committedSummary from '../../summary.json?raw';
import { accuracySummary, reportMarkdown, summaryJson } from './report';

/** It computes every room, furnished ones twice: about 4 s on an M1 Pro, more on CI's runners. */
const TIMEOUT_MS = 60_000;

it(
  'REPORT.md and summary.json are current: else run `npm run accuracy:report`',
  () => {
    const summary = accuracySummary();
    expect(committedReport).toBe(reportMarkdown(summary));
    expect(committedSummary).toBe(summaryJson(summary));
  },
  TIMEOUT_MS,
);
