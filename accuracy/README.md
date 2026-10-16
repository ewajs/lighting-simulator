# Accuracy

How close Lux Studio's illuminance numbers are to an independent lighting
simulator, Radiance, and the tools that show it ([ADR 0058](../docs/decisions/0058-accuracy-checks.md)).
The figures are in [REPORT.md](REPORT.md).

## What's here

| Folder | What it holds |
|---|---|
| `rooms/` | The reference rooms, hand-written: each luminaire's IES file, where its light leaves from, its tilt and pan, any shadow boxes, and where to measure |
| `references/` | Radiance's lux at every point of each room, generated and committed |
| `python/` | The `luxstudio_accuracy` package: checks Radiance, then writes the references |
| `typescript/` | Lux Studio's side: computes the same points with core and compares, and repeats core's hand values and conservation checks with the demo's real IES files |
| `REPORT.md` | The comparison, room by room and surface by surface |

## Running it

From the repo's root, with [uv](https://docs.astral.sh/uv/) installed:

```
npm run accuracy:check        ruff, mypy and pytest for the Python
npm run accuracy:references   check Radiance, regenerate the references, then the report
npm run accuracy:report       regenerate only REPORT.md
npm run accuracy:docs         browse the Python's docs, live
npm test                      includes the comparison (accuracy/typescript)
```

Radiance (6.0 patch 2) downloads on first use into `python/.cache`, checked by
its SHA-256. It runs on macOS with Apple silicon; elsewhere its tests skip.

## How a reference is made

1. **Radiance is checked first.** Each IES file, alone and 20 m away, must give
   the value worked out by hand from its table, within 0.2 %. So must a made-up
   lopsided file at five aims, which checks orientation. A Radiance release
   with the known `ies2rad` bug fails every check, and a test proves it.
2. **Then each room is computed:** direct light only, so far, at every point
   of its grids.
3. **Lux Studio computes the same points.** `npm test` fails if it strays
   beyond the tolerances in `typescript/src/references.test.ts`.

## Adding a room

Write `rooms/<name>.json` (see `python/src/luxstudio_accuracy/rooms.py` for the
format), run `npm run accuracy:references`, and add the name to the list in
`typescript/src/references.test.ts`. Look at the new section of `REPORT.md`
before committing.

## The Python

Python 3.14, managed by uv (`python/pyproject.toml`, `python/uv.lock`).
- Every public module, class and function has a Google-style docstring, which
  ruff enforces and pdoc turns into the docs at `/docs/accuracy/`.
- Types are checked with mypy in strict mode.
- There are no runtime dependencies.
