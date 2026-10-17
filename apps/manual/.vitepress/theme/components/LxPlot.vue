<!-- A line chart for the Concepts pages (ADR 0059): one or more series of
     points computed at build time, with round ticks, axis labels and a legend. -->
<script setup lang="ts">
import { computed } from 'vue';
import { useData } from 'vitepress';
import { formatNumber, path, scale, ticks, ticksBetween } from '../diagrams/plot';

type XY = [number, number];
const props = defineProps<{
  series: { label: string; points: readonly XY[]; dashed?: boolean; muted?: boolean }[];
  xLabel: string;
  yLabel: string;
  /** The x range drawn; by default from 0 (or the data's least) to the data's largest. */
  xMin?: number;
  xMax?: number;
  /** Cuts the y axis at this value, for a curve that shoots up. */
  yMax?: number;
  caption?: string;
}>();

const { lang } = useData();
const W = 640;
const H = 300;
const M = { left: 64, right: 16, top: 16, bottom: 48 };

const xs = computed(() => props.series.flatMap((s) => s.points.map(([x]) => x)));
const x0 = computed(() => props.xMin ?? Math.min(0, ...xs.value));
const x1 = computed(() => props.xMax ?? Math.max(...xs.value));
const yTop = computed(
  () => props.yMax ?? Math.max(...props.series.flatMap((s) => s.points.map(([, y]) => y))),
);
const yTicks = computed(() => ticks(yTop.value));
const y1 = computed(() => yTicks.value[yTicks.value.length - 1]!);
const xTicks = computed(() => ticksBetween(x0.value, x1.value));
const sx = computed(() => scale(x0.value, x1.value, M.left, W - M.right));
const sy = computed(() => scale(0, y1.value, H - M.bottom, M.top));
// Each series takes the next colour of the palette; muted ones stay grey.
const lines = computed(() =>
  props.series.map((s, i) => ({
    ...s,
    color: `c${i + 1}`,
    d: path(
      s.points
        .filter(([x]) => x >= x0.value && x <= x1.value)
        .map(([x, y]) => [sx.value(x), sy.value(Math.min(y, y1.value))] as XY),
    ),
  })),
);
const n = (v: number) => formatNumber(v, lang.value, Math.abs(v) < 10 && v % 1 !== 0 ? 1 : 0);
</script>

<template>
  <figure class="lx-figure">
    <svg :viewBox="`0 0 ${W} ${H}`" role="img" :aria-label="caption ?? yLabel">
      <g class="grid">
        <line
          v-for="t in yTicks"
          :key="`y${t}`"
          :x1="M.left"
          :x2="W - M.right"
          :y1="sy(t)"
          :y2="sy(t)"
        />
      </g>
      <g class="axis">
        <line :x1="M.left" :x2="W - M.right" :y1="H - M.bottom" :y2="H - M.bottom" />
        <line :x1="M.left" :x2="M.left" :y1="M.top" :y2="H - M.bottom" />
        <text v-for="t in yTicks" :key="`yl${t}`" :x="M.left - 8" :y="sy(t) + 4" text-anchor="end">
          {{ n(t) }}
        </text>
        <text
          v-for="t in xTicks"
          :key="`xl${t}`"
          :x="sx(t)"
          :y="H - M.bottom + 18"
          text-anchor="middle"
        >
          {{ n(t) }}
        </text>
        <text :x="(M.left + W - M.right) / 2" :y="H - 8" text-anchor="middle" class="label">
          {{ xLabel }}
        </text>
        <text
          :x="16"
          :y="(M.top + H - M.bottom) / 2"
          text-anchor="middle"
          class="label"
          :transform="`rotate(-90 16 ${(M.top + H - M.bottom) / 2})`"
        >
          {{ yLabel }}
        </text>
      </g>
      <path
        v-for="(line, i) in lines"
        :key="i"
        :d="line.d"
        :class="['series', line.color, { dashed: line.dashed, muted: line.muted }]"
      />
      <g class="legend" v-if="series.length > 1">
        <g
          v-for="(line, i) in lines"
          :key="`lg${i}`"
          :transform="`translate(${W - M.right - 230}, ${M.top + 8 + i * 20})`"
        >
          <line
            x1="0"
            x2="28"
            y1="0"
            y2="0"
            :class="['series', line.color, { dashed: line.dashed, muted: line.muted }]"
          />
          <text x="36" y="4">{{ line.label }}</text>
        </g>
      </g>
    </svg>
    <figcaption v-if="caption">{{ caption }}</figcaption>
  </figure>
</template>
