import { defineConfig } from '@playwright/test';

/** Local smoke tests against the production build of the demo (ADR 0015: not run in CI). */
export default defineConfig({
  testDir: 'e2e',
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
  },
  use: {
    baseURL: 'http://localhost:4173',
    // System Chrome, so tests render with real WebGPU like users do.
    channel: 'chrome',
    launchOptions: { args: ['--enable-unsafe-webgpu'] },
    // Fixed size keeps the camera framing, and so the screenshots, deterministic.
    viewport: { width: 1280, height: 800 },
  },
  expect: {
    // Renders were pixel-identical across runs on the dev machine; removing the
    // 4200 lm pendant changes ~1800 pixels. 100 leaves room for GPU/driver noise
    // while still catching a missing fixture or outline.
    toHaveScreenshot: { maxDiffPixels: 100 },
  },
});
