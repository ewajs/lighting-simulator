import { defineConfig } from '@playwright/test';
import type { SuiteOptions } from './e2e/fixtures';

/**
 * Local e2e tests against the production build of the demo (ADR 0015: not
 * run in CI). Each project runs the whole suite on one engine and backend.
 */
export default defineConfig<SuiteOptions>({
  testDir: 'e2e',
  // The budget includes launching the browser context. With many workers
  // starting Chrome at once, that alone occasionally took over 30 s (the
  // default), failing a test before it ran a line.
  timeout: 60_000,
  // Every worker drives a browser rendering WebGPU or WebGL. The default (half
  // the cores: 5 on a 10-core Mac) overloaded the GPU and CPU: contexts timed
  // out at launch, canvases appeared late and screenshots timed out, a few
  // tests per run. Three keeps runs clean at a small cost in time.
  workers: 3,
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
  },
  use: {
    baseURL: 'http://localhost:4173',
    // Fixed size keeps the camera framing, and so the screenshots, deterministic.
    viewport: { width: 1280, height: 800 },
  },
  projects: [
    // System Chrome with WebGPU, like most desktop users.
    { name: 'chrome', use: { channel: 'chrome' } },
    // The same Chrome on three.js's WebGL 2 fallback.
    { name: 'chrome-webgl2', use: { channel: 'chrome', disableWebGPU: true } },
    // Safari's engine (iPhone, iPad, Mac); it has no WebGPU here, so this also runs on WebGL 2.
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
  expect: {
    // Refreshing a baseline takes two identical captures in a row; WebKit
    // under load sometimes needed more than the default 5 s.
    timeout: 10_000,
    // Renders were pixel-identical across runs on the dev machine; removing the
    // 4200 lm pendant changes ~1800 pixels. 100 leaves room for GPU/driver noise
    // while still catching a missing fixture or outline.
    toHaveScreenshot: { maxDiffPixels: 100 },
  },
});
