import { test as base, expect } from '@playwright/test';

/** Project-level options for the e2e suite (set in playwright.config.ts). */
export interface SuiteOptions {
  /**
   * Hide WebGPU from the page so three.js falls back to WebGL 2, as on a
   * browser without WebGPU. No Chrome flag reliably disables it.
   */
  readonly disableWebGPU: boolean;
}

/** Options a test file can change with `test.use`. */
export interface TestOptions {
  /**
   * Whether the browser has already seen the getting-started help, so it
   * doesn't open over the app on load. Help tests set it to false.
   */
  readonly helpSeen: boolean;
}

/** Per-test fixtures. */
export interface TestFixtures {
  /**
   * Console warnings and errors this test causes on purpose. Every test fails
   * on any other page error, console error or console warning, so problems the
   * test didn't look for still surface.
   */
  readonly allowConsole: RegExp[];
}

/** Messages any page may print: three.js saying it fell back to WebGL 2. */
const ALWAYS_ALLOWED = [/WebGPU is not available/, /Failed to create WebGPU Context Provider/];

export const test = base.extend<SuiteOptions & TestOptions & TestFixtures>({
  disableWebGPU: [false, { option: true }],
  helpSeen: [true, { option: true }],
  // eslint-disable-next-line no-empty-pattern -- Playwright requires the destructuring form.
  allowConsole: async ({}, use) => {
    await use([]);
  },
  page: async ({ page, disableWebGPU, helpSeen, allowConsole }, use) => {
    if (helpSeen) {
      await page.addInitScript(() => localStorage.setItem('lxs-help-seen', '1'));
    }
    if (disableWebGPU) {
      await page.addInitScript(() => {
        Object.defineProperty(Navigator.prototype, 'gpu', {
          get: () => undefined,
          configurable: true,
        });
      });
    }
    const problems: string[] = [];
    page.on('pageerror', (error) => problems.push(`page error: ${error.message}`));
    page.on('console', (message) => {
      const type = message.type();
      if (type === 'error' || type === 'warning') problems.push(`${type}: ${message.text()}`);
    });

    await use(page);

    const allowed = [...ALWAYS_ALLOWED, ...allowConsole];
    const unexpected = problems.filter(
      (problem) => !allowed.some((pattern) => pattern.test(problem)),
    );
    expect(unexpected, 'unexpected page errors or console warnings').toEqual([]);
  },
});

export { expect, type Page } from '@playwright/test';
