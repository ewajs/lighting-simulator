import { describe, expect, it } from 'vitest';
import { manualTarget } from './manual-in-dev';

const DIR = '/repo/apps/demo/dist/manual';
const built = new Set([
  `${DIR}/index.html`,
  `${DIR}/analizar.html`,
  `${DIR}/en/index.html`,
  `${DIR}/assets/app.js`,
]);
const target = (url: string) => manualTarget(url, DIR, (path) => built.has(path));

describe('manualTarget', () => {
  it('sends the app’s /manual/ link to the manual’s own base, language and all', () => {
    expect(target('/manual/')).toEqual({ redirect: '/lighting-simulator/manual/' });
    expect(target('/manual/en/')).toEqual({ redirect: '/lighting-simulator/manual/en/' });
  });

  it('serves built pages and assets, with or without .html', () => {
    expect(target('/lighting-simulator/manual/')).toEqual({ file: `${DIR}/index.html` });
    expect(target('/lighting-simulator/manual/analizar')).toEqual({ file: `${DIR}/analizar.html` });
    expect(target('/lighting-simulator/manual/en/?x=1')).toEqual({ file: `${DIR}/en/index.html` });
    expect(target('/lighting-simulator/manual/assets/app.js')).toEqual({
      file: `${DIR}/assets/app.js`,
    });
  });

  it('says what’s missing, refuses to leave the folder, and leaves the app’s own paths alone', () => {
    expect(target('/lighting-simulator/manual/nope.html')).toEqual({ missing: true });
    expect(target('/lighting-simulator/manual/../secrets')).toEqual({ missing: true });
    expect(target('/')).toBeUndefined();
    expect(target('/src/main.ts')).toBeUndefined();
  });
});
