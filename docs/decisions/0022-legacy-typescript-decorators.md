# 0022. Legacy TypeScript decorators for Lit

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

The 0.6a plan used TC39 standard decorators (`@property() accessor x`). Vite 8 compiles with Oxc, which lowers the decorators but leaves the `accessor` keyword, which browsers don't support yet, so the built page failed to parse.

## Options

- Legacy TypeScript decorators (`experimentalDecorators`)
- No decorators (`static properties` + `customElements.define`)
- Add Babel to transform standard decorators

## Decision

Use Lit's long-standing TypeScript setup: `experimentalDecorators: true` and `useDefineForClassFields: false` in `tsconfig.base.json`, and Vite's `oxc.decorator.legacy: true`. Properties are plain fields: `@property() simulator?: Simulator`.

## Consequences

- Reactive state can't be `#private` (decorators can't target private names); it uses TypeScript `private` instead.
- Any bundler compiling our TypeScript source (ADR 0017) needs the same two settings.
- Revisit standard decorators once the toolchain lowers `accessor` (a new ADR).
