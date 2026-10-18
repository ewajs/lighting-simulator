// The accuracy tests compute whole rooms, direct and bounced, against
// thousands of reference points: seconds each, and more on CI's shared
// runners while the other files run alongside. Vitest's 5 s default is for
// unit tests. Checking the report recomputes all twelve rooms with every
// feature step: about 70 s on an M1 Pro, so four minutes leaves CI room.
import { defineConfig } from 'vitest/config';

export default defineConfig({ test: { testTimeout: 240_000 } });
