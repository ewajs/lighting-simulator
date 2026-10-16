"""Lux Studio's accuracy checks: its illuminance numbers against independent references.

Lux Studio computes illuminance, the light reaching each point, in lux (ADR
0057). This package shows how close those numbers are to an independent tool:
Radiance, the research lighting simulator from Lawrence Berkeley National
Laboratory, which reads IES files with its own code (``ies2rad``).

It works in two steps, so no reference is ever made by a Radiance that gets
basic cases wrong:

1. ``accuracy check`` (`luxstudio_accuracy.checks`): Radiance must reproduce
   values worked out by hand from each IES file's table, and send a made-up
   lopsided distribution the right way at several aims.
2. ``accuracy references`` (`luxstudio_accuracy.references`): for each
   reference room in ``accuracy/rooms``, Radiance's lux at each point, written
   to ``accuracy/references``.

Lux Studio's TypeScript then computes the same points and compares
(``accuracy/typescript``). See ``accuracy/README.md`` for how to run it all,
and ADR 0058 for why it's built this way.
"""
