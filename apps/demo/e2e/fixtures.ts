import { test as base } from '@playwright/test';

/** Project-level options for the e2e suite (set in playwright.config.ts). */
export interface SuiteOptions {
  /**
   * Hide WebGPU from the page so three.js falls back to WebGL 2, as on a
   * browser without WebGPU. No Chrome flag reliably disables it.
   */
  readonly disableWebGPU: boolean;
}

export const test = base.extend<SuiteOptions>({
  disableWebGPU: [false, { option: true }],
  page: async ({ page, disableWebGPU }, use) => {
    if (disableWebGPU) {
      await page.addInitScript(() => {
        Object.defineProperty(Navigator.prototype, 'gpu', {
          get: () => undefined,
          configurable: true,
        });
      });
    }
    await use(page);
  },
});

export { expect, type Page } from '@playwright/test';
