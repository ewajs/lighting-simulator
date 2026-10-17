<!-- How long each reference room takes (ADR 0061, 0062): Lux Studio with
     direct light only and with everything, against Radiance's direct light
     and its reference-quality bounced light, on a log scale of seconds. -->
<script setup lang="ts">
import * as Plot from '@observablehq/plot';
import { computed, ref } from 'vue';
import { useData } from 'vitepress';
import { langOf, ROOM_ORDER, ROOMS, WORDS } from '../../analysis/names';
import { RADIANCE, OURS, usePlot } from '../../analysis/plot-frame';
import type { Timings } from '../../analysis/types';

const props = defineProps<{ timings: Timings }>();

const { lang } = useData();
const l = computed(() => langOf(lang.value));
const SERIES = ['oursDirect', 'oursFull', 'radianceDirect', 'radianceFull'] as const;
/** The bars start here, in s: below anything measured, so every bar shows. */
const BASE_S = 1e-4;

const rows = computed(() =>
  ROOM_ORDER.flatMap((id) => {
    const room = props.timings.rooms.find((r) => r.name === id);
    if (!room) return [];
    const ms = room.steps.map((s) => s.medianMs);
    const values: Record<(typeof SERIES)[number], number | undefined> = {
      oursDirect: ms[0]! / 1000,
      oursFull: ms[ms.length - 1]! / 1000,
      radianceDirect: room.radiance?.direct.wallSeconds,
      radianceFull:
        room.radiance && room.radiance.direct.wallSeconds + room.radiance.bounced.wallSeconds,
    };
    return SERIES.flatMap((series) =>
      values[series] === undefined
        ? []
        : [{ room: ROOMS[id]![l.value].name, series, seconds: values[series]! }],
    );
  }),
);
const seconds = (s: number) =>
  s < 1
    ? `${(s * 1000).toLocaleString(lang.value, { maximumFractionDigits: s < 0.01 ? 1 : 0 })} ms`
    : `${s.toLocaleString(lang.value, { maximumFractionDigits: 1 })} s`;

const container = ref<HTMLElement | null>(null);
usePlot(
  container,
  (width, palette) => {
    const colors = [
      palette.series[OURS]!,
      palette.series[OURS]!,
      palette.series[RADIANCE]!,
      palette.series[RADIANCE]!,
    ];
    const rooms = ROOM_ORDER.flatMap((id) => (ROOMS[id] ? [ROOMS[id][l.value].name] : []));
    return Plot.plot({
      width,
      marginLeft: 24,
      marginRight: 64,
      marginBottom: 52,
      style: { background: 'transparent', color: palette.text, fontSize: '13px' },
      x: {
        type: 'log',
        domain: [BASE_S, 200],
        grid: true,
        label: WORDS[l.value].seconds,
        labelAnchor: 'center',
        labelOffset: 44,
        tickFormat: seconds,
        ticks: width < 560 ? [1e-4, 1e-2, 1, 100] : [1e-4, 1e-3, 1e-2, 0.1, 1, 10, 100],
      },
      // A first band in each room's group holds its name, above its bars.
      y: { domain: ['name', ...SERIES], axis: null, padding: 0.12 },
      fy: { domain: rooms, axis: null, padding: 0.1 },
      color: { domain: SERIES, range: colors },
      marks: [
        Plot.text(rooms, {
          fy: (d: string) => d,
          y: () => 'name',
          x: BASE_S,
          text: (d: string) => d,
          textAnchor: 'start',
          fill: palette.text,
          fontSize: 13,
          fontWeight: 600,
        }),
        Plot.barX(rows.value, {
          x1: BASE_S,
          x2: 'seconds',
          y: 'series',
          fy: 'room',
          fill: 'series',
          fillOpacity: (d: { series: string }) => (d.series.endsWith('Direct') ? 0.45 : 1),
          tip: { fill: palette.background },
          title: (d: { room: string; series: string; seconds: number }) =>
            `${d.room}\n${WORDS[l.value][d.series]}: ${seconds(d.seconds)}`,
        }),
        Plot.text(rows.value, {
          x: 'seconds',
          y: 'series',
          fy: 'room',
          text: (d: { seconds: number }) => seconds(d.seconds),
          textAnchor: 'start',
          dx: 4,
          fill: palette.muted,
          fontSize: 11,
        }),
      ],
    });
  },
  () => l.value,
);
</script>

<template>
  <figure class="lx-chart">
    <div ref="container" class="lx-chart-canvas" style="min-height: 420px"></div>
    <ul class="lx-legend">
      <li><span class="swatch c1 faint"></span>{{ WORDS[l].oursDirect }}</li>
      <li><span class="swatch c1"></span>{{ WORDS[l].oursFull }}</li>
      <li><span class="swatch c2 faint"></span>{{ WORDS[l].radianceDirect }}</li>
      <li><span class="swatch c2"></span>{{ WORDS[l].radianceFull }}</li>
    </ul>
    <figcaption><slot /></figcaption>
  </figure>
</template>
