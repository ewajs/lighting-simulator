# 0077. One version for every package, and a changelog

- **Status:** Accepted
- **Date:** 2026-10-18

## Context

Every package was at 0.0.0, and there was no record of what changed between
milestones besides the git history. The packages aren't published (ADR 0017),
but an integrator, or the owner reviewing a night's work, needs to know what
version they have and what changed. The project is in active development:
no backwards compatibility to keep.

## Decision

- **One version for every package** in the repo (core, ui, demo, manual,
  accuracy) and the root. They're consumed together from source, so separate
  versions would only say the same thing several times.
- **The minor number follows the milestone** in the roadmap; the patch
  number goes up with each PR. Starting at **0.5.0**: M5 is done. M6's PRs
  are 0.5.x, and its last one makes it 0.6.0. 1.0 waits for a first
  integration.
- **`npm run bump -- <version>`** (`scripts/bump-version.js`) sets the
  version on every package and on the dependencies between them; then
  `npm install` updates the lockfile.
- **`CHANGELOG.md`**, in Keep a Changelog's format: each PR adds a line
  under Unreleased, and a milestone's last PR turns Unreleased into its
  version. The versions before 0.5.0 were never tagged, so they're
  reconstructed from the milestones and their PRs.

## Consequences

- Every PR touches `CHANGELOG.md` and, with a bump, the package manifests
  and the lockfile. Stacked PRs can conflict there, but the conflicts are
  trivial.
- No git tags yet; they can come with the first release to an integrator
  (M7).
