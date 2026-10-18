// The dev server's manual plugin (manual-in-dev.ts) runs in Node and reads a
// few files. Only these names are used, so they're declared here rather than
// adding @types/node (as accuracy/typescript and the manual do).

declare module 'node:fs' {
  export function existsSync(path: string): boolean;
  export function statSync(path: string): { isFile(): boolean };
  export function readFileSync(path: string): Uint8Array;
}
