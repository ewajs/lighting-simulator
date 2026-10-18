// Only the check that accuracy/REPORT.md, summary.json and comparison.json are
// current (ADR 0076): it recomputes every room with every feature step, about
// 70 s on an M1 Pro. Run by `npm run test:accuracy-report`, in the accuracy
// workflow and before a milestone's docs PR.
import { defineConfig } from 'vitest/config';

export default defineConfig({ test: { testTimeout: 240_000, include: ['src/report.test.ts'] } });
