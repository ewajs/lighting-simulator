# Accuracy

How close Lux Studio's illuminance numbers are to an independent lighting
simulator, Radiance, and the tools that show it: direct light
([ADR 0058](../docs/decisions/0058-accuracy-checks.md)) and bounced light
([ADR 0060](../docs/decisions/0060-bounced-light.md)). The figures are in
[REPORT.md](REPORT.md), and the patch size's evidence in [PATCH-SIZE.md](PATCH-SIZE.md).

## What's here

| Folder | What it holds |
|---|---|
| `rooms/` | The reference rooms, hand-written: each luminaire's IES file, where its light leaves from, its tilt and pan, the surfaces' reflectances, any furniture as boxes, and where to measure |
| `references/` | Radiance's lux at every point of each room, direct and total, generated and committed; for a furnished room, also without its furniture |
| `python/` | The `luxstudio_accuracy` package: checks Radiance, then writes the references |
| `typescript/` | Lux Studio's side: computes the same points with core and compares, and repeats core's hand values and conservation checks with the demo's real IES files |
| `REPORT.md` | The comparison, room by room and surface by surface |
| `summary.json` | The same figures as data, for the manual's accuracy page (ADR 0059) |
| `comparison.json` | Every point of every room, both sides, at each feature step: the manual's Analysis section draws it (ADR 0062) |
| `PATCH-SIZE.md` | Accuracy against time for three patch sizes: why bounced light uses 25 cm patches |
| `timings.json` | How long Lux Studio takes per room at each feature step, and Radiance for the same points, with the machine (ADR 0061) |

## Running it

From the repo's root, with [uv](https://docs.astral.sh/uv/) installed:

```
npm run accuracy:check        ruff, mypy and pytest for the Python
npm run accuracy:references   check Radiance, regenerate the references, then the report
npm run accuracy:report       regenerate only REPORT.md, summary.json and comparison.json
npm run accuracy:patch-size   regenerate PATCH-SIZE.md (about 20 s)
npm run accuracy:timings      regenerate timings.json (about 50 s, on an idle machine)
npm run accuracy:docs         browse the Python's docs, live
npm test                      includes the comparison (accuracy/typescript)
```

Radiance (6.0 patch 2) downloads on first use into `python/.cache`, checked by
its SHA-256. It runs on macOS with Apple silicon; elsewhere its tests skip.
Regenerating the references takes about six and a half minutes on every core
of an Apple M1 Pro; `accuracy:check` runs Radiance's own tests in about a minute and a half.

## How a reference is made

1. **Radiance is checked first.** Each IES file, alone and 20 m away, must give
   the value worked out by hand from its table, within 0.2 %. So must a made-up
   lopsided file at five aims, which checks orientation. A Radiance release
   with the known `ies2rad` bug fails every check, and a test proves it.
2. **Its bounced light is checked too:** in a closed cube that reflects 80 %,
   the average must match the integrating-sphere formula within 2 %, and a
   test (`python/tests/test_convergence.py`) shows that more rays, more
   bounces or fainter rays barely change a room's result, and that the same
   run twice gives the same values but for sampling noise.
3. **Then each room is computed** at every point of its grids: direct light,
   and total light with the room's surfaces reflecting diffusely. A room with
   furniture is computed again without it, so the report can show what
   letting bounced light through furniture costs Lux Studio.
4. **Lux Studio computes the same points.** `npm test` fails if it strays
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
