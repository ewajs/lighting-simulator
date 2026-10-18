// The app's "Read the full manual" link goes to manual/ next to the app. On
// GitHub Pages and in a production build the manual is there; under
// `npm run dev`, Vite's dev server answered with the app itself. This serves
// the manual as last built (`npm run manual`), or says how to build it. Not
// shipped: it only runs in the dev server.
import { existsSync, readFileSync, statSync } from 'node:fs';
import type { Plugin } from 'vite';

/** The manual's own base path (apps/manual/.vitepress/config.ts): its pages and assets point there. */
const BASE = '/lighting-simulator/manual/';

const CONTENT_TYPES: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8',
  json: 'application/json',
  svg: 'image/svg+xml',
  png: 'image/png',
  woff2: 'font/woff2',
};

const NOT_BUILT = `<!doctype html><meta charset="utf-8"><title>Lux Studio manual</title>
<p style="font: 16px system-ui; margin: 2rem">The manual isn't built yet: run
<code>npm run manual</code>, or <code>npm run manual:dev</code> for one that reloads as you edit.</p>`;

/** What a request is, for the manual: a redirect to its base, a built file, a missing one, or not the manual's. */
export type ManualTarget =
  | { readonly redirect: string }
  | { readonly file: string }
  | { readonly missing: true }
  | undefined;

/**
 * Where a dev-server request for the manual goes. The app links to /manual/,
 * which redirects to the manual's own base; there, a path is a file in
 * `manualDir`, a folder's index.html, or a page without its .html (VitePress
 * links pages both ways).
 */
export function manualTarget(
  url: string,
  manualDir: string,
  isFile: (path: string) => boolean,
): ManualTarget {
  const path = url.split(/[?#]/)[0]!;
  if (path === '/manual' || path.startsWith('/manual/')) {
    return { redirect: BASE + path.slice('/manual/'.length) };
  }
  if (!path.startsWith(BASE)) return undefined;
  const relative = decodeURIComponent(path.slice(BASE.length));
  if (relative.split('/').includes('..')) return { missing: true };
  for (const candidate of [relative, `${relative}index.html`, `${relative}.html`]) {
    if (candidate && isFile(`${manualDir}/${candidate}`))
      return { file: `${manualDir}/${candidate}` };
  }
  return { missing: true };
}

/** The few parts of Node's request and response the plugin uses (no @types/node here). */
interface DevRequest {
  readonly url?: string;
}
interface DevResponse {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(body?: string | Uint8Array): void;
}

/** The dev-server plugin: serves `manualDir` (apps/demo/dist/manual) at the manual's paths. */
export function manualInDev(manualDir: string): Plugin {
  const isFile = (path: string) => existsSync(path) && statSync(path).isFile();
  return {
    name: 'lux-studio-manual-in-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((rawRequest, rawResponse, next) => {
        // Node's own types aren't installed: these are the parts used.
        const request = rawRequest as unknown as DevRequest;
        const response = rawResponse as unknown as DevResponse;
        const target = manualTarget(request.url ?? '/', manualDir, isFile);
        if (!target) return next();
        if ('redirect' in target) {
          response.statusCode = 302;
          response.setHeader('Location', target.redirect);
          response.end();
        } else if ('missing' in target) {
          response.statusCode = 404;
          response.setHeader('Content-Type', CONTENT_TYPES.html!);
          response.end(existsSync(manualDir) ? 'Not in the manual.' : NOT_BUILT);
        } else {
          const extension = target.file.split('.').pop() ?? '';
          response.setHeader(
            'Content-Type',
            CONTENT_TYPES[extension] ?? 'application/octet-stream',
          );
          response.end(readFileSync(target.file));
        }
      });
    },
  };
}
