# 0009. What Claude may do without asking

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

The first scaffold was built in one go, with several unapproved architectural choices. The owner wants to be part of decisions.

## Options

- Explicit list of autonomous actions, everything else needs approval

## Decision

Claude may do these without asking: implement a step whose plan was approved (including helpers private to one module), fix bugs in the step's area and report each one, write and update tests, and keep docs in sync with code. Claude asks first for new dependencies (runtime or dev), new shared abstractions, folder or package structure, public API changes, starting a new step, and anything not in the plan.

## Consequences

- When there is a choice, Claude presents the options with a recommendation and waits.
