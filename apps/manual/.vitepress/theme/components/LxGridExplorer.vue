<!-- The work plane's EN 12464-1 grid, to play with (ADR 0059): the reader sets
     a room's width, depth and border, and the grid is computed in the browser
     by core's own rectangleGrid, the function Lux Studio's analysis uses. -->
<script setup lang="ts">
import { computed, ref } from 'vue';
import { useData } from 'vitepress';
import { formatNumber } from '../diagrams/plot';
import { maxGridSpacing, rectangleGrid } from '../diagrams/browser-core';

const props = defineProps<{
  /** The room drawn first, in m: as the page's other figures have it. */
  widthM: number;
  depthM: number;
  borderM: number;
  /** In the page's language: the three sliders, "cells of", "points", and what to say when the border leaves nothing. */
  labels: {
    width: string;
    depth: string;
    border: string;
    cell: string;
    points: string;
    none: string;
  };
  caption?: string;
}>();

const { lang } = useData();
const n = (v: number, digits = 0) => formatNumber(v, lang.value, digits);

const width = ref(props.widthM);
const depth = ref(props.depthM);
const border = ref(props.borderM);

// The room is scaled to fit the frame, whatever its size, with room for the dimensions.
const W = 420;
const H = 290;
const PAD = { left: 12, right: 34, top: 12, bottom: 34 };
const X = { x: 1, y: 0, z: 0 };
const Y = { x: 0, y: 1, z: 0 };
const Z = { x: 0, y: 0, z: 1 };

const plan = computed(() => {
  const [w, d, b] = [width.value, depth.value, border.value];
  const grid = rectangleGrid('work-plane', { x: 0, y: 0, z: 0 }, X, Z, w, d, Y, b);
  const px = Math.min((W - PAD.left - PAD.right) / w, (H - PAD.top - PAD.bottom) / d);
  // Centred in the frame, which keeps its height so the sliders below don't move.
  const x0 = PAD.left + (W - PAD.left - PAD.right - w * px) / 2;
  const y0 = PAD.top + (H - PAD.top - PAD.bottom - d * px) / 2;
  const [cellW, cellD] = [(w - 2 * b) / grid.columns, (d - 2 * b) / grid.rows];
  return {
    px,
    x0,
    y0,
    grid,
    inner: { x: x0 + b * px, y: y0 + b * px, w: (w - 2 * b) * px, h: (d - 2 * b) * px },
    // Cell edges between the points, inside the border.
    columnsAt: Array.from({ length: grid.columns - 1 }, (_, k) => x0 + (b + (k + 1) * cellW) * px),
    rowsAt: Array.from({ length: grid.rows - 1 }, (_, k) => y0 + (b + (k + 1) * cellD) * px),
    dots: grid.points.map(({ x, z }) => [x0 + x * px, y0 + z * px] as const),
    dotR: Math.max(2, Math.min(4.5, Math.min(cellW, cellD) * px * 0.2)),
    spacingM: maxGridSpacing(Math.max(w - 2 * b, d - 2 * b)),
    cell: [cellW, cellD],
  };
});
</script>

<template>
  <figure class="lx-figure lx-interactive">
    <svg :viewBox="`0 0 ${W} ${H}`" role="img" :aria-label="caption">
      <rect
        class="room-fill"
        :x="plan.x0"
        :y="plan.y0"
        :width="width * plan.px"
        :height="depth * plan.px"
      />
      <template v-if="plan.grid.points.length">
        <rect
          class="border-band"
          :x="plan.inner.x"
          :y="plan.inner.y"
          :width="plan.inner.w"
          :height="plan.inner.h"
        />
        <g class="grid">
          <line
            v-for="x in plan.columnsAt"
            :key="`c${x}`"
            :x1="x"
            :x2="x"
            :y1="plan.inner.y"
            :y2="plan.inner.y + plan.inner.h"
          />
          <line
            v-for="y in plan.rowsAt"
            :key="`r${y}`"
            :y1="y"
            :y2="y"
            :x1="plan.inner.x"
            :x2="plan.inner.x + plan.inner.w"
          />
        </g>
      </template>
      <rect
        class="room-outline"
        :x="plan.x0"
        :y="plan.y0"
        :width="width * plan.px"
        :height="depth * plan.px"
      />
      <circle
        v-for="([x, y], k) in plan.dots"
        :key="k"
        class="grid-point"
        :cx="x"
        :cy="y"
        :r="plan.dotR"
      />
      <g class="axis">
        <text
          :x="plan.x0 + (width * plan.px) / 2"
          :y="plan.y0 + depth * plan.px + 22"
          text-anchor="middle"
        >
          {{ n(width, 1) }} m
        </text>
        <text
          :x="plan.x0 + width * plan.px + 20"
          :y="plan.y0 + (depth * plan.px) / 2"
          text-anchor="middle"
          :transform="`rotate(-90 ${plan.x0 + width * plan.px + 20} ${plan.y0 + (depth * plan.px) / 2})`"
        >
          {{ n(depth, 1) }} m
        </text>
      </g>
    </svg>
    <div class="lx-readout" aria-live="polite">
      <template v-if="plan.grid.points.length">
        <span>p = {{ n(plan.spacingM, 2) }} m</span>
        <span>{{ labels.cell }} {{ n(plan.cell[0], 2) }} × {{ n(plan.cell[1], 2) }} m</span>
        <strong>
          {{ plan.grid.columns }} × {{ plan.grid.rows }} = {{ plan.grid.points.length }}
          {{ labels.points }}
        </strong>
      </template>
      <strong v-else>{{ labels.none }}</strong>
    </div>
    <div class="lx-controls">
      <label>
        <span>{{ labels.width }}</span>
        <input v-model.number="width" type="range" min="1" max="30" step="0.5" />
        <output>{{ n(width, 1) }} m</output>
      </label>
      <label>
        <span>{{ labels.depth }}</span>
        <input v-model.number="depth" type="range" min="1" max="30" step="0.5" />
        <output>{{ n(depth, 1) }} m</output>
      </label>
      <label>
        <span>{{ labels.border }}</span>
        <input v-model.number="border" type="range" min="0" max="1" step="0.1" />
        <output>{{ n(border, 1) }} m</output>
      </label>
    </div>
    <figcaption v-if="caption">{{ caption }}</figcaption>
  </figure>
</template>
