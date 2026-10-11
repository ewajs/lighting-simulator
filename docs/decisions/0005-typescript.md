# 0005. TypeScript

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

Others will integrate against this library's public API.

## Options

- TypeScript
- JS + JSDoc checked by tsc
- Plain JavaScript

## Decision

Write the packages and the demo in TypeScript with `strict` enabled, and publish type declarations.

## Consequences

- Needs a compile step. Vite and tsc cover it.
- `any` needs a comment justifying it, and public types are exported.
