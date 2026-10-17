<!-- Type C angles, to play with (ADR 0059): a direction is a horizontal angle C,
     seen from above, and a vertical angle γ, seen from the side in the plane C
     picks. Both views draw the demo wall washer's real intensity, from a grid
     core computed at build time, and the reader turns C and γ. -->
<script setup lang="ts">
import { computed, ref } from 'vue';
import { useData } from 'vitepress';
import { formatNumber, path } from '../diagrams/plot';
import { DEG, arcPath, candelaAtDirection, dragHandlers, type XY } from '../diagrams/interactive';
import type { IntensityGrid } from '../diagrams/directions.data';

const props = defineProps<{
  grid: IntensityGrid;
  /** In the page's language: the two views' titles, then the two sliders. */
  labels: { above: string; side: string; c: string; gamma: string };
  caption?: string;
}>();

const { lang } = useData();
const n = (v: number, digits = 0) => formatNumber(v, lang.value, digits);

const cDeg = ref(0);
const gammaDeg = ref(30);

// Each view is SIZE pixels square, the luminaire at (MID, MID + TOP), the outer ring R away.
const SIZE = 300;
const TOP = 14;
const MID = SIZE / 2;
const CY = MID + TOP;
const R = 104;
const ringsAt = [0.25, 0.5, 0.75, 1];
const at = (cx: number, cy: number, r: number, angle: number): XY => [
  cx + r * Math.sin(angle),
  cy + r * Math.cos(angle),
];
/** Above, C turns counter-clockwise from the right; as a screen angle from straight down, that's C + 90°. */
const fromAbove = (c: number) => (c + 90) * DEG;
/** Where an angle's symbol goes: inside its arc, or past it when the arc is too small to hold it. */
const labelDeg = (deg: number) => (deg >= 36 ? deg / 2 : deg + 18);
const radius = (cd: number) => (cd / props.grid.peakCd) * R;
const cd = (c: number, gamma: number) => candelaAtDirection(props.grid, c, gamma);

const above = computed(() => {
  const points: XY[] = [];
  for (let c = 0; c < 360; c += 5)
    points.push(at(MID, CY, radius(cd(c, gammaDeg.value)), fromAbove(c)));
  const a = fromAbove(cDeg.value);
  return {
    lobe: `${path(points)} Z`,
    tip: at(MID, CY, R, a),
    back: at(MID, CY, R, a + Math.PI),
    mark: at(MID, CY, radius(cd(cDeg.value, gammaDeg.value)), a),
    arc: arcPath(MID, CY, 26, fromAbove(0), cDeg.value * DEG),
    arcLabel: at(MID, CY, 42, fromAbove(labelDeg(cDeg.value))),
  };
});
const compass = [0, 90, 180, 270].map((c) => ({ c, at: at(MID, CY + 4, R + 20, fromAbove(c)) }));

const side = computed(() => {
  const points: XY[] = [];
  const back = cDeg.value + 180;
  for (let g = 180; g >= 0; g -= 2.5) points.push(at(MID, CY, radius(cd(back, g)), -g * DEG));
  for (let g = 2.5; g <= 180; g += 2.5)
    points.push(at(MID, CY, radius(cd(cDeg.value, g)), g * DEG));
  const a = gammaDeg.value * DEG;
  return {
    lobe: `${path(points)} Z`,
    tip: at(MID, CY, R, a),
    mark: at(MID, CY, radius(cd(cDeg.value, gammaDeg.value)), a),
    arc: arcPath(MID, CY, 30, 0, a),
    arcLabel: at(MID, CY, 46, labelDeg(gammaDeg.value) * DEG),
  };
});

const candela = computed(() => cd(cDeg.value, gammaDeg.value));
const opposite = computed(() => (cDeg.value + 180) % 360);

const turnC = dragHandlers(([x, y]) => {
  const c = Math.atan2(CY - y, x - MID) / DEG;
  cDeg.value = Math.round((c + 360) % 360);
});
const turnGamma = dragHandlers(([x, y]) => {
  gammaDeg.value = Math.round(Math.atan2(Math.abs(x - MID), y - CY) / DEG);
});
</script>

<template>
  <figure class="lx-figure lx-interactive">
    <div class="lx-views">
      <svg :viewBox="`0 0 ${SIZE} ${SIZE + TOP}`" role="img" :aria-label="labels.above">
        <text class="label" x="4" y="14">{{ labels.above }}</text>
        <g class="grid">
          <circle v-for="k in ringsAt" :key="k" :cx="MID" :cy="CY" :r="k * R" />
          <line
            v-for="c in [0, 30, 60, 90, 120, 150]"
            :key="c"
            :x1="at(MID, CY, R, fromAbove(c))[0]"
            :y1="at(MID, CY, R, fromAbove(c))[1]"
            :x2="at(MID, CY, R, fromAbove(c + 180))[0]"
            :y2="at(MID, CY, R, fromAbove(c + 180))[1]"
          />
        </g>
        <g class="axis">
          <text v-for="m in compass" :key="m.c" :x="m.at[0]" :y="m.at[1]" text-anchor="middle">
            C{{ m.c }}
          </text>
        </g>
        <path class="lobe" :d="above.lobe" />
        <line class="plane-back" :x1="MID" :y1="CY" :x2="above.back[0]" :y2="above.back[1]" />
        <path class="angle-arc" :d="above.arc" />
        <text class="symbol" :x="above.arcLabel[0]" :y="above.arcLabel[1] + 5" text-anchor="middle">
          C
        </text>
        <line class="ray" :x1="MID" :y1="CY" :x2="above.tip[0]" :y2="above.tip[1]" />
        <circle class="luminaire" :cx="MID" :cy="CY" r="6" />
        <circle class="lobe-mark" :cx="above.mark[0]" :cy="above.mark[1]" r="4.5" />
        <g class="handle" v-on="turnC">
          <circle class="handle-dot" :cx="above.tip[0]" :cy="above.tip[1]" r="7" />
          <circle class="handle-hit" :cx="above.tip[0]" :cy="above.tip[1]" r="22" />
        </g>
      </svg>
      <svg :viewBox="`0 0 ${SIZE} ${SIZE + TOP}`" role="img" :aria-label="labels.side">
        <text class="label" x="4" y="14">{{ labels.side }} C{{ cDeg }}–C{{ opposite }}</text>
        <g class="grid">
          <circle v-for="k in ringsAt" :key="k" :cx="MID" :cy="CY" :r="k * R" />
          <line
            v-for="g in [0, 30, 60, 90, 120, 150]"
            :key="g"
            :x1="at(MID, CY, R, g * DEG)[0]"
            :y1="at(MID, CY, R, g * DEG)[1]"
            :x2="at(MID, CY, R, (g + 180) * DEG)[0]"
            :y2="at(MID, CY, R, (g + 180) * DEG)[1]"
          />
        </g>
        <g class="axis">
          <text :x="MID" :y="CY + R + 18" text-anchor="middle">0°</text>
          <text :x="MID + R + 6" :y="CY + 4">90°</text>
          <text :x="MID - R - 6" :y="CY + 4" text-anchor="end">90°</text>
          <text :x="MID" :y="CY - R - 8" text-anchor="middle">180°</text>
          <text :x="SIZE - 4" :y="CY + R + 18" text-anchor="end">C{{ cDeg }}</text>
          <text x="4" :y="CY + R + 18">C{{ opposite }}</text>
        </g>
        <path class="lobe" :d="side.lobe" />
        <line class="nadir" :x1="MID" :y1="CY" :x2="MID" :y2="CY + R" />
        <path class="angle-arc" :d="side.arc" />
        <text class="symbol" :x="side.arcLabel[0]" :y="side.arcLabel[1] + 5" text-anchor="middle">
          γ
        </text>
        <line class="ray" :x1="MID" :y1="CY" :x2="side.tip[0]" :y2="side.tip[1]" />
        <circle class="luminaire" :cx="MID" :cy="CY" r="6" />
        <circle class="lobe-mark" :cx="side.mark[0]" :cy="side.mark[1]" r="4.5" />
        <g class="handle" v-on="turnGamma">
          <circle class="handle-dot" :cx="side.tip[0]" :cy="side.tip[1]" r="7" />
          <circle class="handle-hit" :cx="side.tip[0]" :cy="side.tip[1]" r="22" />
        </g>
      </svg>
    </div>
    <div class="lx-readout" aria-live="polite">
      <strong>C = {{ cDeg }}°, γ = {{ gammaDeg }}°: I = {{ n(candela) }} cd</strong>
    </div>
    <div class="lx-controls">
      <label>
        <span>{{ labels.c }}</span>
        <input v-model.number="cDeg" type="range" min="0" max="359" step="1" />
        <output>{{ cDeg }}°</output>
      </label>
      <label>
        <span>{{ labels.gamma }}</span>
        <input v-model.number="gammaDeg" type="range" min="0" max="180" step="1" />
        <output>{{ gammaDeg }}°</output>
      </label>
    </div>
    <figcaption v-if="caption">{{ caption }}</figcaption>
  </figure>
</template>
