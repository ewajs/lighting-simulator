import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative asset URLs so the build works under GitHub Pages' /lighting-simulator/ path.
  base: './',
  // Lets tests import the demo's models as data (`?inline`), to check how core reads them.
  assetsInclude: ['**/*.glb'],
  // Lit decorators in @luxstudio/ui are TypeScript's legacy decorators (ADR 0022).
  oxc: { decorator: { legacy: true } },
  // Unit tests only; e2e/ holds the Playwright suite.
  test: { include: ['src/**/*.test.ts'] },
});
