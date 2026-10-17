// Types for what the manual's theme imports but TypeScript doesn't know.

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent;
  export default component;
}

// The data loaders run in Node at build time and read files. Only this one
// function is used, so it's declared here rather than adding @types/node.
declare module 'node:fs' {
  export function readFileSync(path: URL, encoding: 'latin1' | 'utf8'): string;
}
