# 0076. Test tiers, and CI in about a minute

- **Status:** Accepted
- **Date:** 2026-10-18
- **Amends:** ADR 0056 (when the full e2e suite runs)

## Context

CI took five to seven minutes per PR, 316 s of it in `npm test`: the
accuracy workspace compares twelve rooms with Radiance and recomputes the
whole report to check it's current. Locally, sessions got long for the same
reason. Reports, studies, timings, benchmarks and manual screenshots were
regenerated in nearly every PR, often only to keep docs current, and the
full e2e suite ran before each PR. The owner asked for CI in about a
minute, and for heavy runs only when they answer something about the change.

## Decision

**Three tiers:**
1. **`npm test`**: core, ui and demo, about 12 s on an M1 Pro. Every change,
   and CI.
2. **`npm run test:accuracy`**: the comparison with Radiance, a couple of
   minutes. When the calculation changes, and in the accuracy workflow.
3. **`npm run test:accuracy-report`**: that `REPORT.md`, `summary.json` and
   `comparison.json` are current, by recomputing every room with every
   feature step. In the accuracy workflow, and in a milestone's last PR.

**CI.** `ci.yml` runs the fast checks: format, lint, typecheck, `npm test`,
build, docs, manual, the accuracy Python (its Radiance tests skip on Linux),
and i18n. It skips Markdown-only changes, except the manual's pages, whose
links it checks. `accuracy.yml` runs tiers 2 and 3 only when
`packages/core/src/analysis/**`, the luminaire frame, photometry or
`accuracy/**` change, or by hand.

**Regeneration, once per milestone.** Generated results (reports, studies,
timings, benchmarks, manual screenshots and figures quoted in docs) are
regenerated in the milestone's last PR, together with the user and technical
docs. Before that they may be stale. A Radiance reference is computed during
a milestone only for a room that's new or changed, when the feature needs
the answer.

**The full e2e suite** runs once per milestone, in that same last PR.
Before it, each PR runs the specs for the area it changed, on chrome. This
amends ADR 0056, which ran it before every PR.

## Consequences

- A PR's CI takes about a minute; a change to the calculation also runs the
  accuracy workflow, a few minutes, in parallel.
- Between a milestone's first and last PRs, `REPORT.md` and the manual's
  figures can lag the code. The accuracy workflow still fails if the
  comparison goes out of bounds.
- A regression only the full e2e suite would catch, such as one on WebKit,
  can go unseen until the milestone's last PR.
