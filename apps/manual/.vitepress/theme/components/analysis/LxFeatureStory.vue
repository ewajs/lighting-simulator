<!-- The calculation's features added one at a time, every reference room's
     difference with Radiance at each step (ADR 0061, 0062): one line per room,
     on a log scale, since the first step is 15–75 % off and the last under 1 %. -->
<script setup lang="ts">
import * as Plot from '@observablehq/plot';
import { computed, ref } from 'vue';
import { useData } from 'vitepress';
import { langOf, METRICS, ROOM_ORDER, ROOMS, STEPS, WORDS } from '../../analysis/names';
import { percent, usePlot } from '../../analysis/plot-frame';
import type { AccuracySummary } from '../../analysis/types';

const props = defineProps<{ summary: AccuracySummary }>();

const { lang } = useData();
const l = computed(() => langOf(lang.value));
const metrics = ['meanPointError', 'worstAverage', 'worstFar'] as const;
const metric = ref<(typeof metrics)[number]>('meanPointError');
/** Below this the log scale has nothing to show: Radiance's own noise is about 0.3 %. */
const FLOOR = 0.001;

const rows = computed(() =>
  props.summary.rooms.flatMap((room) =>
    room.features.map((f) => ({
      room: room.name,
      step: f.step,
      value: Math.max(FLOOR, f[metric.value]),
    })),
  ),
);
const container = ref<HTMLElement | null>(null);
usePlot(
  container,
  (width, palette) => {
    const steps = Object.keys(STEPS);
    const rooms = ROOM_ORDER.filter((r) => props.summary.rooms.some((s) => s.name === r));
    const roomName = (id: string) => ROOMS[id]?.[l.value].name ?? id;
    return Plot.plot({
      width,
      height: Math.min(420, Math.max(300, width * 0.55)),
      marginLeft: 64,
      marginBottom: 44,
      marginRight: 16,
      style: { background: 'transparent', color: palette.text, fontSize: '13px' },
      x: {
        domain: steps,
        tickFormat: (id: string) => STEPS[id]![l.value].short,
        label: null,
        padding: 0.25,
      },
      y: {
        type: 'log',
        domain: [FLOOR, 1],
        grid: true,
        label: `↑ ${METRICS[metric.value]![l.value].name}`,
        tickFormat: (v: number) => percent(v, lang.value, v < 0.01 ? 1 : 0),
        ticks: [0.001, 0.003, 0.01, 0.03, 0.1, 0.3, 1],
      },
      color: { domain: rooms, range: [...palette.series, palette.neutral] },
      marks: [
        Plot.ruleY([0.003], { stroke: palette.muted, strokeDasharray: '4 4' }),
        Plot.line(rows.value, { x: 'step', y: 'value', stroke: 'room', strokeWidth: 2.5 }),
        Plot.dot(rows.value, {
          x: 'step',
          y: 'value',
          fill: 'room',
          r: 4.5,
          tip: { fill: palette.background },
          title: (d: { room: string; step: string; value: number }) =>
            `${roomName(d.room)}\n${STEPS[d.step]![l.value].name}\n${percent(d.value, lang.value, 2)}`,
        }),
      ],
    });
  },
  () => [metric.value, l.value],
);
const legend = computed(() =>
  ROOM_ORDER.filter((r) => props.summary.rooms.some((s) => s.name === r)).map((id, k) => ({
    name: ROOMS[id]![l.value].name,
    k,
  })),
);
</script>

<template>
  <figure class="lx-chart">
    <div class="lx-controls" role="group" :aria-label="METRICS[metric]![l].name">
      <button
        v-for="m in metrics"
        :key="m"
        type="button"
        :class="{ active: m === metric }"
        :aria-pressed="m === metric"
        @click="metric = m"
      >
        {{ METRICS[m]![l].name }}
      </button>
    </div>
    <div ref="container" class="lx-chart-canvas" style="min-height: 300px"></div>
    <ul class="lx-legend">
      <li v-for="item in legend" :key="item.name">
        <span class="swatch" :class="item.k === 5 ? 'neutral' : `c${item.k + 1}`"></span>
        {{ item.name }}
      </li>
    </ul>
    <figcaption>
      {{ METRICS[metric]![l].about }}
      {{ WORDS[l].noiseLine }}
    </figcaption>
  </figure>
</template>
