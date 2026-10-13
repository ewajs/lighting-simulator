import { defineConfig } from '@playwright/test';

/**
 * Not a test suite: drives the built demo to take the manual's screenshots,
 * in Spanish and English (`npm run screenshots -w apps/manual`). Output goes
 * to pages/public/screenshots/, which is committed.
 */
export default defineConfig({
  testDir: 'screenshots',
  webServer: {
    command:
      'npm run build -w apps/demo && npm run preview -w apps/demo -- --port 4175 --strictPort',
    // Workspace paths resolve from the repository root.
    cwd: '../..',
    url: 'http://localhost:4175',
    reuseExistingServer: true,
  },
  use: {
    baseURL: 'http://localhost:4175',
    channel: 'chrome',
    viewport: { width: 1280, height: 800 },
  },
});
