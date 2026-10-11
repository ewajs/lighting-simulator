# 0012. Language and i18n

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

The first market is Argentina, but the library is meant for any client.

## Options

- English internally, i18n UI with es-AR default and en
- English only
- Code in English, UI in Spanish only

## Decision

Code, comments, docs, commits and PRs are in English. The UI is i18n-ready from the start: no inline strings, Spanish (Argentina, `es-AR`) is the default locale, and English (`en`) is always supported.

## Consequences

- Both locales must stay complete. A missing key is a bug.
- Hosts can override strings or add locales.
- Number and unit formatting follows the active locale (e.g. `2,70 m` in es-AR).
