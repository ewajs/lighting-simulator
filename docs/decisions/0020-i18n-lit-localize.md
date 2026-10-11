# 0020. UI translations with @lit/localize

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

ADR 0012 requires every UI string to be translatable, with `es-AR` as the default and `en` always complete.

## Options

- `@lit/localize` (Lit's official library: `msg()`, XLIFF files, a CLI)
- Typed dictionaries with our own `t()` helper
- i18next

## Decision

Use `@lit/localize` in runtime mode. Source strings are English (`msg('…')`), translations live in `packages/ui/xliff/es-AR.xlf`, and `lit-localize build` generates locale modules into `packages/ui/src/generated/` (committed). `<lxs-app locale="…">` sets the page locale, defaulting to `es-AR`; `setLocale()` is exported for hosts.

## Consequences

- `lit-localize build` only warns on missing translations, so `npm run i18n:check` fails when any message lacks a target. CI runs it and then `git diff --exit-code`, so committed XLIFF and generated code must be up to date.
- Workflow for new strings: write `msg()`, run `npm run i18n:extract`, add `<target>`s to the XLIFF, run `npm run i18n:build`.
- The locale is page-wide (a `@lit/localize` limitation), so two apps on one page share it.
