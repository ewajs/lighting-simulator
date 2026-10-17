// The committed report, summary and comparison must be what the references
// give now, so the manual (which reads summary.json and comparison.json) and
// REPORT.md can't go stale.
import { expect, it } from 'vitest';
import committedReport from '../../REPORT.md?raw';
import committedComparison from '../../comparison.json?raw';
import committedSummary from '../../summary.json?raw';
import { comparisonJson, roomComparison } from './comparison';
import { IES_FILES, REFERENCES } from './inputs';
import { accuracySummary, reportMarkdown, summaryJson } from './report';

it('REPORT.md and summary.json are current: else run `npm run accuracy:report`', () => {
  const summary = accuracySummary();
  expect(committedReport).toBe(reportMarkdown(summary));
  expect(committedSummary).toBe(summaryJson(summary));
});

it('comparison.json is current: else run `npm run accuracy:report`', () => {
  const rooms = Object.entries(REFERENCES).map(([name, reference]) =>
    roomComparison(name, reference, IES_FILES),
  );
  expect(committedComparison).toBe(comparisonJson(rooms));
});
