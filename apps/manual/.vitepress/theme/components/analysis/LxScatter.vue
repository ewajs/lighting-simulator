<!-- Every point of a reference room, Lux Studio's illuminance against
     Radiance's (ADR 0062): on the diagonal they agree. Log scales, since a
     room's points run from a few lux on a far wall to hundreds under a light. -->
<script setup lang="ts">
import * as Plot from '@observablehq/plot';
import { computed, ref } from 'vue';
import { useData } from 'vitepress';
import { langOf, SURFACES, WORDS } from '../../analysis/names';
import { percent, usePlot } from '../../analysis/plot-frame';
import type { RoomPage } from '../../analysis/types';

const props = defineProps<{ page: RoomPage }>();

const { lang } = useData();
const l = computed(() => langOf(lang.value));
const light = ref<'total' | 'direct'>('total');
/** Points dimmer than this, in lx, are left out: a log scale can't show 0, and they don't matter. */
const MIN_LX = 0.5;
/** The band drawn around the diagonal: ±10 %. */
const BAND = 0.1;

const rows = computed(() =>
  props.page.comparison.surfaces.flatMap((surface) => {
    const radiance = surface.radiance[light.value];
    const ours = surface.ours[light.value];
    return radiance.flatMap((r, k) =>
      r >= MIN_LX && ours[k]! >= MIN_LX
        ? [
            {
              surface: SURFACES[surface.surface]?.[l.value] ?? surface.surface,
              radiance: r,
              ours: ours[k]!,
            },
          ]
        : [],
    );
  }),
);
const container = ref<HTMLElement | null>(null);
usePlot(
  container,
  (width, palette) => {
    const values = rows.value.flatMap((r) => [r.radiance, r.ours]);
    const lo = Math.max(MIN_LX, Math.min(...values) * 0.8);
    const hi = Math.max(...values) * 1.2;
    const diagonal = [lo, hi];
    const surfaces = [...new Set(rows.value.map((r) => r.surface))];
    const lx = (v: number) =>
      v.toLocaleString(lang.value, { maximumFractionDigits: v < 10 ? 1 : 0 });
    return Plot.plot({
      width,
      height: Math.min(width, 520),
      marginLeft: 56,
      marginBottom: 44,
      style: { background: 'transparent', color: palette.text, fontSize: '13px' },
      x: {
        type: 'log',
        domain: diagonal,
        grid: true,
        label: `${WORDS[l.value].scatterX} →`,
        tickFormat: lx,
      },
      y: {
        type: 'log',
        domain: diagonal,
        grid: true,
        label: `↑ ${WORDS[l.value].scatterY}`,
        tickFormat: lx,
      },
      color: { domain: surfaces, range: palette.series, legend: true },
      marks: [
        Plot.line(
          diagonal.map((v) => [v, v]),
          { stroke: palette.muted },
        ),
        Plot.line(
          diagonal.map((v) => [v, v * (1 + BAND)]),
          { stroke: palette.muted, strokeDasharray: '4 4' },
        ),
        Plot.line(
          diagonal.map((v) => [v, v * (1 - BAND)]),
          { stroke: palette.muted, strokeDasharray: '4 4' },
        ),
        Plot.dot(rows.value, {
          x: 'radiance',
          y: 'ours',
          stroke: 'surface',
          r: 2.2,
          strokeOpacity: 0.75,
          tip: { fill: palette.background },
          title: (d: (typeof rows.value)[number]) =>
            `${d.surface}\n${WORDS[l.value].radiance}: ${lx(d.radiance)} lx\n${WORDS[l.value].ours}: ${lx(d.ours)} lx\n${percent(d.ours / d.radiance - 1, lang.value, 1)}`,
        }),
      ],
    });
  },
  () => [light.value, l.value],
);
</script>

<template>
  <figure class="lx-chart">
    <div class="lx-controls" role="group">
      <span class="label">{{ WORDS[l].light }}</span>
      <button type="button" :class="{ active: light === 'total' }" @click="light = 'total'">
        {{ WORDS[l].totalShort }}
      </button>
      <button type="button" :class="{ active: light === 'direct' }" @click="light = 'direct'">
        {{ WORDS[l].directShort }}
      </button>
    </div>
    <div ref="container" class="lx-chart-canvas" style="min-height: 400px"></div>
    <figcaption>{{ WORDS[l].scatterBand }} <slot /></figcaption>
  </figure>
</template>
