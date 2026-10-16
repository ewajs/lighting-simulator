# 0046. In-app help: a getting-started carousel

- **Status:** Accepted; its cards and illustrations were redone in ADR 0055
- **Date:** 2026-10-12

## Context

First-time users, such as a prospect opening the demo or a client's
customer, need the basics in seconds, without reading the manual
(ADR 0045). The help has to work the same on desktop, tablet and phone, in
Spanish and English.

## Options

- **Format:** a modal carousel of short cards, or a guided tour that
  highlights real controls one by one
- **Illustrations:** schematic SVG/CSS animations, or screen recordings of the app
- **Where it lives:** in the UI package, opt-in for hosts, or in the demo only

## Decision

- **A modal carousel**, `<lxs-help>`, inside `<lxs-app>`. A tour breaks
  easily across our layouts, where panels collapse and phones use sheets, and
  it would need another dependency.
  - Seven cards: welcome, adding, picking and moving, aiming, adjusting the
    light, looking around, precision and undo.
  - An eighth, about loading your own IES file, when `ies-import` is on.
  - Each card has a title and one or two sentences, worded for touch on touch
    screens ("tocá", "un dedo").
  - A native `<dialog>` gives focus trapping, Esc and a backdrop. You can move
    between cards with Back/Next, the dots, the arrow keys or a swipe.
    "Next" gets focus when it opens.
  - The last card links to the full manual.
- **Illustrations are schematic SVG with CSS animation** (`help-illustrations.ts`,
  `help-styles.ts`): a few seconds each, looping. They use theme tokens only
  (`--lxs-cct-warm`, `--lxs-cct-cool` and `--lxs-guide` were added), and
  stand still with `prefers-reduced-motion`. They're tiny, language-neutral,
  and don't go stale with every UI change the way recordings would.
- **The host decides:**
  - `help-on-start` opens it on the first visit, remembered per browser in
    `localStorage` as soon as it's shown. If storage isn't available, it shows
    again next time.
  - `manualUrls` sets the manual's link per language.
  - The **?** button in the top bar, or **Help** in the phone's ⋯ menu,
    opens it any time.
- **While the help is open, the app's keyboard shortcuts are off.** It's
  modal: Delete or W mustn't act on the scene behind it, and Esc belongs to
  the dialog.

## Consequences

- New public API on `<lxs-app>`: `help-on-start` and `manualUrls`. The top bar
  fires `lxs-help-request`.
- The demo opens the help on a first visit. The e2e suite marks it as seen
  by default (`helpSeen`), and the help tests turn that off.
- The card texts live in the UI's translations, so they're kept complete in
  `es-AR` and `en` like every other string.
