import { defineConfig } from 'vitest/config';
import { manualInDev } from './src/dev/manual-in-dev';

export default defineConfig({
  // Relative asset URLs so the build works under GitHub Pages' /lighting-simulator/ path.
  base: './',
  // Lets tests import the demo's models as data (`?inline`), to check how core reads them.
  assetsInclude: ['**/*.glb'],
  // Lit decorators in @luxstudio/ui are TypeScript's legacy decorators (ADR 0022).
  oxc: { decorator: { legacy: true } },
  // The app's manual link works under `npm run dev` too, with the manual as last built.
  plugins: [manualInDev(new URL('./dist/manual', import.meta.url).pathname)],
  // Unit tests only; e2e/ holds the Playwright suite.
  test: { include: ['src/**/*.test.ts'] },
});
