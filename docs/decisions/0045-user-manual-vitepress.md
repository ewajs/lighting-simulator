# 0045. User manual with VitePress, in Spanish and English

- **Status:** Accepted
- **Date:** 2026-10-12

## Context

The docs site (TypeDoc) is for developers. People using Lux Studio need a
short, friendly manual with screenshots, in Spanish and English, that the
app's help can link to.

## Options

- **VitePress:** Markdown pages, built-in language switching and local
  search, a clean default theme, built on Vite
- **Astro Starlight:** similar features, heavier
- **TypeDoc documents:** already set up, but no language switching, and it
  looks like an API site

## Decision

- **VitePress 1.6.4** (MIT, maintained by the Vue team, widely used) in a new
  workspace, `apps/manual`. It's a dev dependency only: nothing from it ships
  in the library or the demo. It brings Vue and its own Vite 5, and npm keeps
  them inside that workspace.
- **Spanish at `/manual/`, English at `/manual/en/`,** with the same pages and
  slugs in each language. It has local search, a link back to the app, and
  Lux Studio's amber accent.
- **Pages:**
  - Getting started; adding and picking luminaires; moving; aiming;
    adjusting the light; the room; the view.
  - Your IES files; screenshots; phones and tablets; keyboard shortcuts;
    troubleshooting.
- **Screenshots are generated, not hand-made:**
  - `npm run manual:screenshots` drives the built demo with Playwright, in
    both languages, at desktop and phone sizes.
  - It marks controls in amber and numbers the screen's areas.
  - The images (about 1.2 MB) are committed. When the UI changes, one
    command refreshes them all.
- **Built into the demo's output,** so Pages serves it next to the demo and
  `/docs`. CI builds it on every PR, and VitePress fails on a dead link.

## Consequences

- Text changes need both languages, like the UI's strings.
- Screenshots go stale when the UI changes until someone runs the command.
  The PR checklist for UI changes should include it.
