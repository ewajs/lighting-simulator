// The timing tool runs in Node and says which machine it ran on. Only these
// few names are used, so they're declared here rather than adding @types/node
// (as the manual does, ADR 0059).

declare module 'node:os' {
  export function cpus(): { model: string }[];
  export function platform(): string;
  export function release(): string;
}

declare const process: { readonly version: string };
