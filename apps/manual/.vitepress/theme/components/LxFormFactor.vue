<!-- The form factor, to play with (ADR 0059, ADR 0060): a small patch on the
     floor and a long panel, seen from its end, that the reader moves and
     turns. The form factor is computed in the browser by core's own
     pointToPolygon. The drawing shows why it's what it is (Nusselt's analogy):
     the panel projected onto a half circle round the patch, then down onto
     its base; the share of the base it covers is the form factor. -->
<script setup lang="ts">
import { computed, ref } from 'vue';
import { useData } from 'vitepress';
import { formatNumber } from '../diagrams/plot';
import { pointToPolygon, type Vec3 } from '../diagrams/browser-core';
import { DEG, clamp, dragHandlers, type XY } from '../diagrams/interactive';

defineProps<{
  /** In the page's language: the sliders, the two surfaces' names, and the sentence after "F = 0.23: 23 %". */
  labels: {
    x: string;
    height: string;
    angle: string;
    patch: string;
    panel: string;
    share: string;
  };
  caption?: string;
}>();

const { lang } = useData();
const n = (v: number, digits = 0) => formatNumber(v, lang.value, digits);

const LIMITS = { xM: [-2.5, 2.5], heightM: [0.6, 2.6] } as const;
const xM = ref(0.8);
const heightM = ref(1.6);
const angleDeg = ref(20);
/** The panel's width, in the view, and its length into the page: long, so the side view tells the whole story. */
const WIDTH_M = 1;
const LENGTH_M = 20;

// Side view: 1 m is PX pixels; the patch at (MID, FLOOR), facing up.
const W = 420;
const H = 222;
const PX = 60;
const MID = W / 2;
const FLOOR = H - 34;
/** The half circle's radius, in px. */
const RH = 72;
const sx = (x: number) => MID + x * PX;
const sy = (y: number) => FLOOR - y * PX;

const ORIGIN: Vec3 = { x: 0, y: 0, z: 0 };
const UP: Vec3 = { x: 0, y: 1, z: 0 };

const panel = computed(() => {
  const a = angleDeg.value * DEG;
  const [ex, ey] = [(Math.cos(a) * WIDTH_M) / 2, (Math.sin(a) * WIDTH_M) / 2];
  const [cx, cy] = [xM.value, heightM.value];
  const ends: [XY, XY] = [
    [cx + ex, cy + ey],
    [cx - ex, cy - ey],
  ];
  const half = LENGTH_M / 2;
  const corners: Vec3[] = [
    { x: ends[0][0], y: ends[0][1], z: half },
    { x: ends[1][0], y: ends[1][1], z: half },
    { x: ends[1][0], y: ends[1][1], z: -half },
    { x: ends[0][0], y: ends[0][1], z: -half },
  ];
  const formFactor = pointToPolygon(ORIGIN, UP, corners);
  // Where each end's direction meets the half circle, and that point dropped to its base.
  const onCircle = ends.map(([x, y]) => {
    const r = Math.hypot(x, y);
    return [MID + (RH * x) / r, FLOOR - (RH * y) / r] as XY;
  });
  const screenEnds = ends.map(([x, y]) => [sx(x), sy(y)] as XY);
  const [p, q] = onCircle as [XY, XY];
  return {
    formFactor,
    centre: [sx(cx), sy(cy)] as XY,
    // The panel's name beside its middle, on the side facing up (or left, when it stands upright).
    label: (() => {
      const [nx, ny] = Math.cos(a) >= 0 ? [-Math.sin(a), -Math.cos(a)] : [Math.sin(a), Math.cos(a)];
      return [sx(cx) + nx * 34, sy(cy) + ny * 34 + 5] as XY;
    })(),
    ends: screenEnds,
    wedge: [[MID, FLOOR], ...screenEnds].map(([x, y]) => `${x},${y}`).join(' '),
    onCircle,
    // The half circle's arc between the two directions, the short way.
    arc: `M${p[0]},${p[1]} A${RH},${RH} 0 0 ${p[0] < q[0] ? 1 : 0} ${q[0]},${q[1]}`,
    base: [p[0], q[0]],
  };
});

const move = dragHandlers(([x, y]) => {
  // To the slider's 5 cm steps; adding 0 turns −0 into 0, which would print as "−0,00".
  xM.value = Math.round(clamp((x - MID) / PX, ...LIMITS.xM) * 20) / 20 + 0;
  heightM.value = Math.round(clamp((FLOOR - y) / PX, ...LIMITS.heightM) * 20) / 20;
});
const turnPanel = dragHandlers(([x, y]) => {
  const [cx, cy] = panel.value.centre;
  const a = Math.atan2(cy - y, x - cx) / DEG;
  angleDeg.value = Math.round((a + 360) % 360);
});
</script>

<template>
  <figure class="lx-figure lx-interactive">
    <svg :viewBox="`0 0 ${W} ${H}`" role="img" :aria-label="caption">
      <rect class="floor-band" x="0" :y="FLOOR" :width="W" :height="H - FLOOR" />
      <line class="room-outline" x1="0" :x2="W" :y1="FLOOR" :y2="FLOOR" />
      <polygon class="cone" :points="panel.wedge" />
      <path
        class="half-circle"
        :d="`M${MID - RH},${FLOOR} A${RH},${RH} 0 0 1 ${MID + RH},${FLOOR}`"
      />
      <line
        v-for="(p, k) in panel.onCircle"
        :key="`d${k}`"
        class="drop"
        :x1="p[0]"
        :y1="p[1]"
        :x2="p[0]"
        :y2="FLOOR"
      />
      <path class="series" :d="panel.arc" />
      <line class="series base" :x1="panel.base[0]" :x2="panel.base[1]" :y1="FLOOR" :y2="FLOOR" />
      <line class="surface" :x1="MID - 16" :x2="MID + 16" :y1="FLOOR" :y2="FLOOR" />
      <text :x="MID" :y="FLOOR + 22" text-anchor="middle">{{ labels.patch }}</text>
      <line
        class="surface panel"
        :x1="panel.ends[0]![0]"
        :y1="panel.ends[0]![1]"
        :x2="panel.ends[1]![0]"
        :y2="panel.ends[1]![1]"
      />
      <text :x="panel.label[0]" :y="panel.label[1]" text-anchor="middle">
        {{ labels.panel }}
      </text>
      <g class="handle" v-on="move">
        <circle class="handle-dot" :cx="panel.centre[0]" :cy="panel.centre[1]" r="7" />
        <circle class="handle-hit" :cx="panel.centre[0]" :cy="panel.centre[1]" r="22" />
      </g>
      <g class="handle" v-on="turnPanel">
        <circle class="handle-ring" :cx="panel.ends[0]![0]" :cy="panel.ends[0]![1]" r="6" />
        <circle class="handle-hit" :cx="panel.ends[0]![0]" :cy="panel.ends[0]![1]" r="18" />
      </g>
    </svg>
    <div class="lx-readout" aria-live="polite">
      <strong>
        F = {{ n(panel.formFactor, 2) }}: {{ n(panel.formFactor * 100) }} % {{ labels.share }}
      </strong>
    </div>
    <div class="lx-controls">
      <label>
        <span>{{ labels.x }}</span>
        <input
          v-model.number="xM"
          type="range"
          :min="LIMITS.xM[0]"
          :max="LIMITS.xM[1]"
          step="0.05"
        />
        <output>{{ n(xM, 2) }} m</output>
      </label>
      <label>
        <span>{{ labels.height }}</span>
        <input
          v-model.number="heightM"
          type="range"
          :min="LIMITS.heightM[0]"
          :max="LIMITS.heightM[1]"
          step="0.05"
        />
        <output>{{ n(heightM, 2) }} m</output>
      </label>
      <label>
        <span>{{ labels.angle }}</span>
        <input v-model.number="angleDeg" type="range" min="0" max="359" step="1" />
        <output>{{ n(angleDeg) }}°</output>
      </label>
    </div>
    <figcaption v-if="caption">{{ caption }}</figcaption>
  </figure>
</template>
