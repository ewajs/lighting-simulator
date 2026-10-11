# 0001. Record decisions as ADRs

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

Decisions about architecture, tooling and process get made in conversation and are easy to lose. A future contributor (or a new Claude session) needs to know *why* things are the way they are, not just the rules.

## Options

- ADRs in `docs/decisions/`
- A "Decisions" section inside CLAUDE.md
- No formal log (PRs and git history only)

## Decision

Keep one short Markdown file per decision in `docs/decisions/`, numbered `NNNN-title.md`, with Context, Options, Decision and Consequences. CLAUDE.md states the rules and links here for the reasoning.

## Consequences

- A decision is superseded by a new ADR, never edited away. The old one is marked `Superseded by NNNN`.
- Significant choices (dependencies, structure, public API) need an ADR as part of the PR that introduces them.
