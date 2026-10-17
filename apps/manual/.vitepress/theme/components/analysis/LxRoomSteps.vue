<!-- One reference room's feature steps (ADR 0061, 0062): the difference with
     Radiance's full light and the time each step takes, side by side, so what
     a feature buys and what it costs read together. -->
<script setup lang="ts">
import * as Plot from '@observablehq/plot';
import { computed, ref } from 'vue';
import { useData } from 'vitepress';
import { langOf, STEPS, WORDS } from '../../analysis/names';
import { OURS, percent, usePlot } from '../../analysis/plot-frame';
import type { RoomPage } from '../../analysis/types';

const props = defineProps<{ page: RoomPage }>();

const { lang } = useData();
const l = computed(() => langOf(lang.value));
/** The error axis starts here: below Radiance's own noise, and a log scale can't start at 0. */
const FLOOR = 0.001;

const rows = computed(() =>
  props.page.summary.features.map((f) => ({
    step: STEPS[f.step]?.[l.value].name ?? f.step,
    error: Math.max(FLOOR, f.meanPointError),
    ms: props.page.timings?.steps.find((s) => s.step === f.step)?.medianMs,
  })),
);
const container = ref<HTMLElement | null>(null);
usePlot(
  container,
  (width, palette) => {
    const wide = width >= 600;
    const each = wide ? Math.floor((width - 24) / 2) : width;
    const steps = rows.value.map((r) => r.step);
    const style = { background: 'transparent', color: palette.text, fontSize: '12px' };
    const y = { domain: steps, label: null, axis: null, padding: 0.25 } as const;
    const labels = Plot.text(rows.value, {
      y: 'step',
      text: 'step',
      frameAnchor: 'left',
      dy: -13,
      fill: palette.text,
      fontSize: 12,
    });
    const error = Plot.plot({
      width: each,
      height: 56 * steps.length + 40,
      marginLeft: 20,
      marginRight: 56,
      marginBottom: 48,
      style,
      y,
      x: {
        labelAnchor: 'center',
        labelOffset: 40,
        type: 'log',
        domain: [FLOOR, 1],
        grid: true,
        label: WORDS[l.value].stepError,
        tickFormat: (v: number) => percent(v, lang.value, v < 0.01 ? 1 : 0),
        ticks: [0.001, 0.01, 0.1, 1],
      },
      marks: [
        labels,
        Plot.barX(rows.value, {
          x1: FLOOR,
          x2: 'error',
          y: 'step',
          fill: palette.series[1]!,
          insetTop: 14,
        }),
        Plot.text(rows.value, {
          x: 'error',
          y: 'step',
          dy: 7,
          dx: 4,
          textAnchor: 'start',
          text: (r: { error: number }) => percent(r.error, lang.value, r.error < 0.1 ? 2 : 1),
          fill: palette.muted,
          fontSize: 11,
        }),
      ],
    });
    const time = Plot.plot({
      width: each,
      height: 56 * steps.length + 40,
      marginLeft: 20,
      marginRight: 64,
      marginBottom: 48,
      style,
      y,
      x: {
        grid: true,
        label: WORDS[l.value].stepTime,
        labelAnchor: 'center',
        labelOffset: 40,
        nice: true,
      },
      marks: [
        labels,
        Plot.barX(
          rows.value.filter((r) => r.ms !== undefined),
          { x: 'ms', y: 'step', fill: palette.series[OURS]!, insetTop: 14 },
        ),
        Plot.text(
          rows.value.filter((r) => r.ms !== undefined),
          {
            x: 'ms',
            y: 'step',
            dy: 7,
            dx: 4,
            textAnchor: 'start',
            text: (r: { ms?: number }) => `${r.ms!.toLocaleString(lang.value)} ms`,
            fill: palette.muted,
            fontSize: 11,
          },
        ),
      ],
    });
    const box = document.createElement('div');
    box.className = 'lx-maps';
    box.style.gridTemplateColumns = wide ? '1fr 1fr' : '1fr';
    box.append(error, time);
    return box;
  },
  () => l.value,
);
</script>

<template>
  <figure class="lx-chart">
    <div ref="container" class="lx-chart-canvas" style="min-height: 260px"></div>
    <figcaption><slot /></figcaption>
  </figure>
</template>
