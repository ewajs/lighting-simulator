# 0008. A branch and a PR per step

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

The owner wants to stay in the loop and review work in steps.

## Options

- Branch + PR per step
- Branch, merged locally by the owner
- Commit to master

## Decision

Each agreed step gets a feature branch and a PR into `master`, opened with `gh`. The owner reviews and merges.

## Consequences

- PRs form the review trail. GitHub Pages deploys from `master` after merge.
- Claude commits and pushes only as part of an agreed step.
