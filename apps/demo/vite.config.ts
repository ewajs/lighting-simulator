import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset URLs so the build works under GitHub Pages' /lighting-simulator/ path.
  base: './',
  // Lit decorators in @luxstudio/ui are TypeScript's legacy decorators (ADR 0022).
  oxc: { decorator: { legacy: true } },
});
