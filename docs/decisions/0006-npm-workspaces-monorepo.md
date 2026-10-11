# 0006. npm workspaces monorepo

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

Core, UI and demo need a clear dependency boundary, and core and ui may be published or versioned separately.

## Options

- npm workspaces: packages/core, packages/ui, apps/demo
- Single package with folders
- Separate repos

## Decision

Use npm workspaces with `packages/core`, `packages/ui` and `apps/demo` in one repo.

## Consequences

- Dependencies only go one way, demo → ui → core, and an ESLint rule enforces it.
- No extra monorepo tooling (Nx, Turborepo) unless justified later.
