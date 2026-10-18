# Changelog

Every package in the repo shares one version (ADR 0077): the minor number
follows the milestone ([ROADMAP](docs/ROADMAP.md)), the patch number goes up
with each PR. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions before 0.5.0 were never tagged: they're reconstructed from the
milestones and their PRs, to give the history a shape.

## [Unreleased]

M6 Windows and daylight, in progress.

### Added
- Windows in the scene model: in a wall or the ceiling (a skylight), with
  glazing and a covering, kept on their surface, moved along it, copied,
  removed and undone like other items. Scene files are now version 2;
  version 1 files open without windows (ADR 0078).
- Windows in the 3D view: a hole in the wall or ceiling, a frame, the glass
  and its covering, with a pale sky behind. The camera can now orbit below
  the horizon, to look up at the ceiling and its skylights.
- Editing windows: a third catalog section, Windows (a window, a tall window
  and a skylight), added by click or dropped near a wall; picked and dragged
  along their wall, with dimension lines to the corner and the floor; an
  inspector for the surface, size, position, glass and covering; and a
  Windows group in the Scene list.
- Daylight settings, saved with the scene: an overcast or clear sky or night,
  the solar time (morning, noon, afternoon presets), the month, the latitude
  and which way north is, in the Room panel; the sun's position from them,
  checked against Duffie & Beckman. The demo's rooms are in Buenos Aires
  (ADR 0079).
- Versions and this changelog; `npm run bump -- <version>` sets one version on
  every package and the dependencies between them (ADR 0077).

### Changed
- Tests in tiers: `npm test` runs core, ui and demo in seconds; the comparison
  with Radiance is `npm run test:accuracy`, and the report's freshness check
  `npm run test:accuracy-report`. CI runs the fast checks in about a minute,
  and the accuracy workflow only when the calculation changes. Generated
  results and the full e2e suite run once per milestone (ADR 0076, #74).

### Fixed
- The app's "Read the full manual" link opened the app itself under `npm run dev`;
  the dev server now serves the manual as last built, or says how to build it.

## [0.5.0] — M5 Analysis, 2026-10-16 to 2026-10-18

### Added
- Direct illuminance on EN 12464-1 grids, one frame for the picture and the numbers (#47).
- Accuracy checks against Radiance 6.0P2, with references, a report and Python tooling (#48).
- The manual's Concepts section, its diagrams computed by core (#49), later interactive (#54).
- Bounced light: a room radiosity solve, checked against Radiance (#50).
- The calculation's features as switches, each measured for accuracy and time (#52).
- The manual's Analysis section: every comparison with Radiance charted (#53), with a picture of each room (#56).
- Furniture in bounced light: it hides it and reflects it (#55).
- The Analysis panel, calculated in a Web Worker (#57); the room's work kept between calculations (#58).
- The illuminance view in false colour (#59) and the lux probe (#60).
- A busy reference room (#61), and five more kinds of room (#70).
- The manual's how-to for analysing light (#62), and a help card for it (#65).
- Shadow detail: the source cell size as a choice, with an exact check (#66).
- Bounced light reported on its own, and where its excess came from (#67).
- A real integrating sphere, and orientation checks worked out by hand (#68).
- Emin, U₀, and what the bright-point cutoff leaves out (#69).
- Luminaire bodies hide bounced light (#73).

### Changed
- Grid points covered by furniture are left out of the figures (#72).
- The accuracy pages say exactly what agreement with Radiance shows (#64).
- The reference rooms' seats face the room; chairs at the busy room's table (#71).
- Diagrams with a data palette, stronger grids and a colour key (#51).

## [0.4.0] — M4 Persistence, 2026-10-15 to 2026-10-16

### Added
- Scene files: save and open `.luxstudio.json` (#39).
- Autosave, and New from room templates (#40).
- Share links (#41).

### Changed
- Loading without stand-ins, and no page zoom on phones (#42).
- A redesigned help, and panels that slide in and out at 250 ms (#43, #46).
- Leaner test runs: tests where they matter, screenshots of their subject (#44).
- Manual, guides, spec and README brought up to date after M3 and M4 (#45).

## [0.3.0] — M3 Visual quality, 2026-10-12 to 2026-10-14

### Added
- Fixture models (#27).
- Loud failures: a logger, `?debug` diagnostics, and an e2e console guard (#29).
- The docs site: API reference and guides at /docs (#30).
- The user manual in Spanish and English, with generated screenshots (#31).
- In-app help: a getting-started carousel (#32).
- Furniture: 14 procedural pieces to add, pick, edit and drag (#34), with move
  arrows and a rotation ring (#36), and placement at a free spot (#37).
- Surface textures, brightness matched to reflectance (#38).

### Changed
- One set of edits for luminaires and furniture (#35).

### Fixed
- Dimming to zero broke rendering; dimension lines dropped (#28).
- Undo took the starter scene apart; e2e context timeouts (#33).

## [0.2.0] — M2 Manipulation, 2026-10-12

### Added
- Drag to move (#22), a move handle (#23) and an aim handle (#24).
- Snapping (#25), and distances to the walls while moving (#26).

## [0.1.0] — M1 Photometry, 2026-10-12

### Added
- The IES parser and candela lookup (#18).
- A photometry provider, and real IES files in the demo (#19).
- Full-sphere IES lights, and a starter scene with IES products (#20).
- Trying your own IES file (#21).

## [0.0.1] — Phase 0 and polish, 2026-10-11

### Added
- Guardrails, roadmap, spec, design and the first decision records (#1, #2, #11).
- npm workspaces and tooling (#3); the core scene model with undo and redo (#4).
- The core Viewport (#5); the demo with Playwright smoke tests (#6).
- The UI: Lit shell, viewport element, tokens and i18n (#7); catalog and scene
  panels (#8); the inspector (#9); the top bar, viewport controls and
  shortcuts (#10).
- Screenshots to PNG and catalog filters (#13); touch and tablets (#14); phone
  layouts in portrait and landscape (#15, #16); e2e on WebKit and WebGL 2 (#17).

### Changed
- Renamed to Lux Studio (#12).
