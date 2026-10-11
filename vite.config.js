import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset URLs so the build works from any sub-path (GitHub Pages serves /lighting-simulator/).
  base: './',
  build: {
    target: 'es2022',
    // three.js alone is ~700 kB minified; the budget in docs/SPEC.md §7 is set on gzip size.
    chunkSizeWarningLimit: 1000,
  },
});
