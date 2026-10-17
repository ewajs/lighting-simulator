<!-- One measured surface of a reference room, three ways (ADR 0062): Radiance's
     light, Lux Studio's, and the difference point by point. The reader picks
     the surface, direct or total light, with or without the furniture, and
     the feature step Lux Studio stops at (ADR 0061). -->
<script setup lang="ts">
import * as Plot from '@observablehq/plot';
import { computed, ref } from 'vue';
import { useData } from 'vitepress';
import { mapExtent, mapPoints } from '../../analysis/geometry';
import { langOf, STEPS, SURFACES, WORDS } from '../../analysis/names';
import { percent, usePlot } from '../../analysis/plot-frame';
import type { RoomPage } from '../../analysis/types';
import { rampColor } from '../../diagrams/plot';

const props = defineProps<{ page: RoomPage }>();

const { lang } = useData();
const l = computed(() => langOf(lang.value));
type Light = 'total' | 'direct' | 'empty';
const surfaces = computed(() => props.page.comparison.surfaces);
const surfaceId = ref(surfaces.value[0]!.surface);
const light = ref<Light>('total');
const stepIds = Object.keys(STEPS);
const step = ref(stepIds[stepIds.length - 1]!);
const furnished = computed(() => surfaces.value.some((s) => s.withoutFurniture));
/** The difference map's colour range is at least ±2 % and at most ±50 %: Radiance's noise to off the chart. */
const MIN_RANGE = 0.02;
const MAX_RANGE = 0.5;

const values = computed(() => {
  const surface = surfaces.value.find((s) => s.surface === surfaceId.value)!;
  const points = mapPoints(surface);
  const radiance =
    light.value === 'direct'
      ? surface.radiance.direct
      : light.value === 'empty'
        ? surface.withoutFurniture!.radiance
        : surface.radiance.total;
  const ours =
    light.value === 'direct'
      ? surface.ours.direct
      : light.value === 'empty'
        ? surface.withoutFurniture!.ours
        : surface.steps[step.value]!;
  const rows = points.map((p, k) => ({
    ...p,
    radiance: radiance[k]!,
    ours: ours[k]!,
    difference: radiance[k]! > 0 ? ours[k]! / radiance[k]! - 1 : 0,
  }));
  const mean = (key: 'radiance' | 'ours') => rows.reduce((sum, r) => sum + r[key], 0) / rows.length;
  return {
    rows,
    extent: mapExtent(points),
    averageDifference: mean('ours') / mean('radiance') - 1,
  };
});

const container = ref<HTMLElement | null>(null);
usePlot(
  container,
  (width, palette) => {
    const { rows, extent } = values.value;
    // Radiance and Lux Studio side by side, the difference across both below.
    const columns = width >= 520 ? 2 : 1;
    const each = Math.floor((width - (columns - 1) * 16) / columns);
    const aspect = (extent.v1 - extent.v0) / (extent.u1 - extent.u0);
    const maxLx = Math.max(...rows.map((r) => Math.max(r.radiance, r.ours)), 1);
    const bright = rows.filter((r) => r.radiance >= 0.1 * maxLx);
    const range = Math.min(
      MAX_RANGE,
      Math.max(MIN_RANGE, ...bright.map((r) => Math.abs(r.difference))),
    );
    const lx = (v: number) => `${v.toLocaleString(lang.value, { maximumFractionDigits: 1 })} lx`;
    const map = (key: 'radiance' | 'ours' | 'difference', title: string) => {
      const isDifference = key === 'difference';
      // The difference is the map to read: larger, but not taller than half again the others.
      const mapWidth = isDifference ? Math.min(width, Math.round(each * 1.5)) : each;
      const height = Math.round(mapWidth * aspect);
      const color = isDifference
        ? {
            type: 'diverging' as const,
            scheme: 'BuRd' as const,
            domain: [-range, range],
            clamp: true,
            label: WORDS[l.value].differenceMap,
            tickFormat: (v: number) => percent(v, lang.value, 0),
          }
        : {
            type: 'linear' as const,
            domain: [0, maxLx],
            interpolate: (t: number) => rampColor(t),
            label: WORDS[l.value].lux,
          };
      const plot = Plot.plot({
        width: mapWidth,
        height,
        margin: 0,
        style: { background: 'transparent', color: palette.text, fontSize: '12px' },
        x: { domain: [extent.u0, extent.u1], axis: null },
        // v grows down the page, as on the room's plan.
        y: { domain: [extent.v0, extent.v1], axis: null, reverse: true },
        color,
        marks: [
          Plot.rect(rows, {
            x1: (r: { u: number }) => r.u - extent.du / 2,
            x2: (r: { u: number }) => r.u + extent.du / 2,
            y1: (r: { v: number }) => r.v - extent.dv / 2,
            y2: (r: { v: number }) => r.v + extent.dv / 2,
            fill: key,
            inset: 0,
          }),
          Plot.frame({ stroke: palette.grid }),
          Plot.tip(
            rows,
            Plot.pointer({
              x: 'u',
              y: 'v',
              fill: palette.background,
              title: (r: (typeof rows)[number]) =>
                `${WORDS[l.value].radiance}: ${lx(r.radiance)}\n${WORDS[l.value].ours}: ${lx(r.ours)}\n${percent(r.difference, lang.value, 1)}`,
            }),
          ),
        ],
      });
      const legend = Plot.legend({
        color,
        width: Math.min(mapWidth, 320),
        marginLeft: 12,
        marginRight: 12,
        style: { background: 'transparent', color: palette.text, fontSize: '11px' },
      } as Plot.LegendOptions);
      const block = document.createElement('div');
      block.className = 'lx-map';
      const heading = document.createElement('div');
      heading.className = 'lx-map-title';
      heading.textContent = title;
      block.append(heading, plot, legend);
      return block;
    };
    const grid = document.createElement('div');
    grid.className = 'lx-maps';
    grid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
    const difference = map('difference', WORDS[l.value].difference);
    difference.style.gridColumn = '1 / -1';
    grid.append(
      map('radiance', WORDS[l.value].radiance),
      map('ours', WORDS[l.value].ours),
      difference,
    );
    return grid;
  },
  () => [surfaceId.value, light.value, step.value, l.value],
);
</script>

<template>
  <figure class="lx-chart">
    <div class="lx-controls" role="group">
      <span class="label">{{ WORDS[l].surface }}</span>
      <button
        v-for="s in surfaces"
        :key="s.surface"
        type="button"
        :class="{ active: s.surface === surfaceId }"
        :aria-pressed="s.surface === surfaceId"
        @click="surfaceId = s.surface"
      >
        {{ SURFACES[s.surface]?.[l] ?? s.surface }}
      </button>
    </div>
    <div class="lx-controls" role="group">
      <span class="label">{{ WORDS[l].light }}</span>
      <button type="button" :class="{ active: light === 'total' }" @click="light = 'total'">
        {{ WORDS[l].totalShort }}
      </button>
      <button type="button" :class="{ active: light === 'direct' }" @click="light = 'direct'">
        {{ WORDS[l].directShort }}
      </button>
      <button
        v-if="furnished"
        type="button"
        :class="{ active: light === 'empty' }"
        @click="light = 'empty'"
      >
        {{ WORDS[l].totalEmpty }}
      </button>
    </div>
    <div v-if="light === 'total'" class="lx-controls" role="group">
      <span class="label">{{ WORDS[l].step }}</span>
      <button
        v-for="id in stepIds"
        :key="id"
        type="button"
        :class="{ active: id === step }"
        :title="STEPS[id]![l].name"
        @click="step = id"
      >
        {{ STEPS[id]![l].short }}
      </button>
    </div>
    <div ref="container" class="lx-chart-canvas" style="min-height: 240px"></div>
    <figcaption>
      <strong>{{ percent(values.averageDifference, lang, 1) }}</strong>
      {{ WORDS[l].averageDifference }}.
      <slot />
    </figcaption>
  </figure>
</template>
