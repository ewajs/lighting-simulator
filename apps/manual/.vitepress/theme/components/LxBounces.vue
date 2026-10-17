<!-- Bounce after bounce, to play with (ADR 0059, ADR 0060): with one
     reflectance ρ everywhere, each bounce gives back ρ times the one before,
     and all of them add up to ρ / (1 − ρ) times the direct light. The reader
     sets ρ; bars show each bounce, and one stacked bar their sum. -->
<script setup lang="ts">
import { computed, ref } from 'vue';
import { useData } from 'vitepress';
import { formatNumber, scale, ticks } from '../diagrams/plot';

const props = defineProps<{
  /** In the page's language: the slider; the direct bar; the two axes; the stacked bar's title. */
  labels: { reflectance: string; direct: string; bounce: string; share: string; total: string };
  /** The reflectance drawn first. */
  reflectance?: number;
  caption?: string;
}>();

const { lang } = useData();
const n = (v: number, digits = 0) => formatNumber(v, lang.value, digits);

const MAX_REFLECTANCE = 0.9;
const rho = ref(props.reflectance ?? 0.6);
const BOUNCES = 10;
/** Bounces drawn in the stacked bar: past these, the rest is under a pixel even at ρ = 0.9. */
const STACKED = 60;

const W = 420;
const H = 300;
const CHART = { left: 52, right: 12, top: 28, bottom: 168 };
const slot = (W - CHART.left - CHART.right) / (BOUNCES + 1);
const barX = (k: number) => CHART.left + k * slot + slot * 0.18;
const barW = slot * 0.64;
const sy = scale(0, 1, CHART.bottom, CHART.top);
const shareTicks = [0, 0.25, 0.5, 0.75, 1];

// The stacked bar: from 0 to 1 / (1 − ρ) at most, the direct light being 1.
const STACK = { left: 52, right: 12, y: 246, height: 18 };
// Rounded: 1 / (1 − 0.9) isn't exactly 10 in floating point, and a hair over would add a tick.
const totalMax = Math.round(1 / (1 - MAX_REFLECTANCE));
const stackTicks = ticks(totalMax, 5);
const stackX = scale(0, totalMax, STACK.left, W - STACK.right);

const bars = computed(() =>
  Array.from({ length: BOUNCES + 1 }, (_, k) => ({ k, share: rho.value ** k })),
);
const stack = computed(() => {
  const segments: { k: number; x: number; width: number }[] = [];
  let sum = 0;
  for (let k = 0; k <= STACKED; k++) {
    const share = rho.value ** k;
    segments.push({ k, x: stackX(sum), width: stackX(sum + share) - stackX(sum) });
    sum += share;
  }
  return segments;
});
const bounced = computed(() => rho.value / (1 - rho.value));
</script>

<template>
  <figure class="lx-figure lx-interactive">
    <svg :viewBox="`0 0 ${W} ${H}`" role="img" :aria-label="caption">
      <text class="label" :x="CHART.left" y="14">{{ labels.share }}</text>
      <g class="grid">
        <line
          v-for="t in shareTicks"
          :key="t"
          :x1="CHART.left"
          :x2="W - CHART.right"
          :y1="sy(t)"
          :y2="sy(t)"
        />
      </g>
      <g class="axis">
        <text
          v-for="t in shareTicks"
          :key="`t${t}`"
          :x="CHART.left - 8"
          :y="sy(t) + 4"
          text-anchor="end"
        >
          {{ n(t * 100) }} %
        </text>
        <text
          v-for="bar in bars"
          :key="`x${bar.k}`"
          :x="barX(bar.k) + barW / 2"
          :y="CHART.bottom + 18"
          text-anchor="middle"
        >
          {{ bar.k === 0 ? labels.direct : bar.k }}
        </text>
        <text
          class="label"
          :x="(CHART.left + W - CHART.right) / 2 + slot / 2"
          :y="CHART.bottom + 40"
          text-anchor="middle"
        >
          {{ labels.bounce }}
        </text>
      </g>
      <rect
        v-for="bar in bars"
        :key="bar.k"
        :class="['bar', { direct: bar.k === 0 }]"
        :x="barX(bar.k)"
        :y="sy(bar.share)"
        :width="barW"
        :height="CHART.bottom - sy(bar.share)"
      />
      <g class="axis">
        <line :x1="CHART.left" :x2="W - CHART.right" :y1="CHART.bottom" :y2="CHART.bottom" />
      </g>
      <text class="label" :x="STACK.left" :y="STACK.y - 10">{{ labels.total }}</text>
      <rect
        v-for="s in stack"
        :key="`s${s.k}`"
        :class="['bar', { direct: s.k === 0, alternate: s.k > 0 && s.k % 2 === 0 }]"
        :x="s.x"
        :y="STACK.y"
        :width="s.width"
        :height="STACK.height"
      />
      <g class="axis">
        <text
          v-for="t in stackTicks"
          :key="`st${t}`"
          :x="stackX(t)"
          :y="STACK.y + STACK.height + 18"
          text-anchor="middle"
        >
          {{ n(t) }}×
        </text>
      </g>
    </svg>
    <div class="lx-readout" aria-live="polite">
      <strong>
        ρ + ρ² + ρ³ + … = ρ / (1 − ρ) = {{ n(rho, 2) }} / {{ n(1 - rho, 2) }} = {{ n(bounced, 2) }}
      </strong>
    </div>
    <div class="lx-controls">
      <label>
        <span>{{ labels.reflectance }}</span>
        <input v-model.number="rho" type="range" min="0" :max="MAX_REFLECTANCE" step="0.05" />
        <output>ρ = {{ n(rho, 2) }}</output>
      </label>
    </div>
    <figcaption v-if="caption">{{ caption }}</figcaption>
  </figure>
</template>
