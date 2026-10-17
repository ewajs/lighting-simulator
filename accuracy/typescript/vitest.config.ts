// The accuracy tests compute whole rooms, direct and bounced, against
// thousands of reference points: seconds each, and more on CI's shared
// runners while the other files run alongside. Vitest's 5 s default is for
// unit tests.
import { defineConfig } from 'vitest/config';

export default defineConfig({ test: { testTimeout: 60_000 } });
