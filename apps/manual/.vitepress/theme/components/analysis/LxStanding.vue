<!-- Where every reference room stands with the full calculation (ADR 0062):
     its difference with Radiance by the chosen measure, and for a furnished
     room the same with the furniture taken out, which isolates what
     furniture's part in bounced light costs. -->
<script setup lang="ts">
import * as Plot from '@observablehq/plot';
import { computed, ref } from 'vue';
import { useData } from 'vitepress';
import { langOf, METRICS, ROOM_ORDER, ROOMS, WORDS } from '../../analysis/names';
import { percent, RADIANCE, usePlot } from '../../analysis/plot-frame';
import type { AccuracySummary, RoomSummary, SurfaceSummary } from '../../analysis/types';

const props = defineProps<{ summary: AccuracySummary }>();

const { lang } = useData();
const l = computed(() => langOf(lang.value));
const metrics = ['worstAverage', 'worstFar'] as const;
const metric = ref<(typeof metrics)[number]>('worstAverage');

/** A room's figure from its surfaces: the largest difference by the chosen measure. */
const worst = (surfaces: readonly SurfaceSummary[]) =>
  Math.max(
    ...surfaces.map((s) =>
      metric.value === 'worstAverage' ? Math.abs(s.averageError) : s.worstFar,
    ),
  );
const rows = computed(() =>
  ROOM_ORDER.flatMap((id) => {
    const room = props.summary.rooms.find((r: RoomSummary) => r.name === id);
    if (!room) return [];
    const name = ROOMS[id]![l.value].name;
    const result = [{ room: name, series: WORDS[l.value].asIs, value: worst(room.total) }];
    if (room.withoutFurniture.length > 0) {
      result.push({
        room: name,
        series: WORDS[l.value].empty,
        value: worst(room.withoutFurniture),
      });
    }
    return result;
  }),
);
const container = ref<HTMLElement | null>(null);
usePlot(
  container,
  (width, palette) => {
    const rooms = ROOM_ORDER.flatMap((id) => (ROOMS[id] ? [ROOMS[id][l.value].name] : []));
    const series = [WORDS[l.value].asIs, WORDS[l.value].empty];
    return Plot.plot({
      width,
      marginLeft: 20,
      marginRight: 60,
      marginBottom: 44,
      style: { background: 'transparent', color: palette.text, fontSize: '13px' },
      x: {
        grid: true,
        label: METRICS[metric.value]![l.value].name,
        labelAnchor: 'center',
        labelOffset: 38,
        tickFormat: (v: number) => percent(v, lang.value, 0),
        nice: true,
      },
      y: { domain: ['name', ...series], axis: null, padding: 0.1 },
      fy: { domain: rooms, axis: null, padding: 0.12 },
      color: { domain: series, range: [palette.series[RADIANCE]!, palette.neutral] },
      marks: [
        Plot.text(rooms, {
          fy: (d: string) => d,
          y: () => 'name',
          frameAnchor: 'left',
          text: (d: string) => d,
          fill: palette.text,
          fontWeight: 600,
        }),
        Plot.barX(rows.value, { x: 'value', y: 'series', fy: 'room', fill: 'series' }),
        Plot.text(rows.value, {
          x: 'value',
          y: 'series',
          fy: 'room',
          text: (d: { value: number }) => percent(d.value, lang.value, 1),
          textAnchor: 'start',
          dx: 4,
          fill: palette.muted,
          fontSize: 11,
        }),
        Plot.ruleX([0], { stroke: palette.muted }),
      ],
    });
  },
  () => [metric.value, l.value],
);
</script>

<template>
  <figure class="lx-chart">
    <div class="lx-controls" role="group">
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
    <div ref="container" class="lx-chart-canvas" style="min-height: 420px"></div>
    <ul class="lx-legend">
      <li><span class="swatch c2"></span>{{ WORDS[l].asIs }}</li>
      <li><span class="swatch neutral"></span>{{ WORDS[l].emptyLegend }}</li>
    </ul>
    <figcaption>{{ METRICS[metric]![l].about }} <slot /></figcaption>
  </figure>
</template>
