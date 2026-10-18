// The accuracy tests compute whole rooms, direct and bounced, against
// thousands of reference points: seconds each, and more on CI's shared
// runners while the other files run alongside. Vitest's 5 s default is for
// unit tests. `npm run test:accuracy` runs them; they're out of `npm test`
// (ADR 0076). The check that the report is current recomputes every room
// with every feature step, so it's apart again: `npm run test:accuracy-report`.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { testTimeout: 240_000, exclude: ['**/node_modules/**', 'src/report.test.ts'] },
});
