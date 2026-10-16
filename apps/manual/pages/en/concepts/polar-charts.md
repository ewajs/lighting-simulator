<script setup>
import LxPolar from '../../../.vitepress/theme/components/LxPolar.vue'
import { data } from '../../../.vitepress/theme/diagrams/light.data'

const chart = (key) => data.polar.find((c) => c.key === key)
const planes = ['C0–C180 plane', 'C90–C270 plane', 'Beam', 'Rings every']
</script>

# IES files and polar charts

An **IES file** records how a luminaire shares out its light: its intensity, in
candelas, in hundreds of directions. A laboratory measures it with a
goniophotometer, which turns the luminaire and measures it from every angle.
The format is the North American standard IES LM-63; Lux Studio reads all its
editions.

## How it describes directions

Indoor measurements use **Type C photometry**: picture the luminaire hanging,
pointing at the floor.

- The **vertical angle** (γ) runs from 0°, straight down, to 180°, straight
  up. 90° is the horizon.
- The **horizontal angle** (C) turns around the vertical axis, from 0° to
  360°. The C0 plane runs along the luminaire; C90, across it.

Many luminaires are symmetric, and the file keeps only part of them: a round
downlight is the same in every horizontal direction, so one plane is enough.
Lux Studio fills in the rest by the symmetry the file states, and interpolates
in straight lines between the measured angles.

## How to read a polar chart

The polar chart is the classic drawing in a photometric report. The luminaire
is at the centre; each point of the curve is at a **distance from the centre
proportional to the intensity** in that direction. Down is 0° (towards the
floor), up 180° (towards the ceiling).

Two planes are drawn: C0–C180 (solid line) and C90–C270 (dashed). If they
match, the luminaire shares its light the same way in every horizontal
direction.

The **beam angle** is the width of the cone where the intensity stays above
**half** its peak. The dotted lines mark it. For a luminaire that sends light
almost everywhere it says nothing, and it isn't drawn.

These are the demo's five real luminaires, drawn from the same numbers Lux
Studio uses:

<div class="lx-pair">
<LxPolar :chart="chart('downlight')" :labels="planes" caption="6-inch downlight (Cooper): a wide, even cone downwards." />
<LxPolar :chart="chart('trackSpot')" :labels="planes" caption="Track spot (iGuzzini Palco): a narrow, very intense beam." />
</div>

<div class="lx-pair">
<LxPolar :chart="chart('linearPendant')" :labels="planes" caption="Linear pendant (Finelite HP-2): light down and up to the ceiling." />
<LxPolar :chart="chart('wallWasher')" :labels="planes" caption="Wall washer (Lightolier): leaning to one side, the wall's." />
</div>

<LxPolar :chart="chart('wallUpDown')" :labels="planes" caption="Up/down wall sconce (Visa Colonnade): little light towards the wall behind it." />

## What the file doesn't say

An IES file describes light **seen from afar**: as if it all came from one
point. Close to a large luminaire that stops being true. The file also states
the size of the opening the light leaves from, and Lux Studio uses it to split
the opening into cells, as [Distance and angle](./distance-and-angle) shows.

To load your own files, see [Your IES files](../ies-files).
