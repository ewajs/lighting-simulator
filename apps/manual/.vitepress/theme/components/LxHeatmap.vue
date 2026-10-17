<!-- An illuminance map of a room's work plane, in false colour (ADR 0059),
     with the downlights, the border strip and the standard's figures. -->
<script setup lang="ts">
import { computed } from 'vue';
import { useData } from 'vitepress';
import { formatNumber, rampColor } from '../diagrams/plot';

type XY = [number, number];
const props = defineProps<{
  map: {
    luminaires: readonly XY[];
    values: readonly (readonly number[])[];
    stepM: number;
    averageLx: number;
    minLx: number;
    maxLx: number;
    uniformity: number;
  };
  room: { widthM: number; depthM: number };
  borderM: number;
  /** The colour scale's top, in lx: the same for maps meant to be compared. */
  scaleMaxLx: number;
  caption?: string;
}>();

const { lang } = useData();
const PX = 60; // per metre
const W = computed(() => props.room.widthM * PX);
const D = computed(() => props.room.depthM * PX);
const cells = computed(() =>
  props.map.values.flatMap((row, j) =>
    row.map((lx, i) => ({
      x: i * props.map.stepM * PX,
      y: j * props.map.stepM * PX,
      fill: rampColor(lx / props.scaleMaxLx),
    })),
  ),
);
const n = (v: number, digits = 0) => formatNumber(v, lang.value, digits);
</script>

<template>
  <figure class="lx-figure lx-heatmap">
    <svg :viewBox="`-4 -4 ${W + 8} ${D + 8}`" role="img" :aria-label="caption">
      <rect
        v-for="(cell, k) in cells"
        :key="k"
        :x="cell.x"
        :y="cell.y"
        shape-rendering="crispEdges"
        :width="map.stepM * PX + 0.5"
        :height="map.stepM * PX + 0.5"
        :fill="cell.fill"
      />
      <rect
        class="border-strip"
        :x="borderM * PX"
        :y="borderM * PX"
        :width="W - 2 * borderM * PX"
        :height="D - 2 * borderM * PX"
      />
      <rect class="room-outline" x="0" y="0" :width="W" :height="D" />
      <circle
        v-for="([x, z], k) in map.luminaires"
        :key="`l${k}`"
        class="luminaire"
        :cx="(x + room.widthM / 2) * PX"
        :cy="(z + room.depthM / 2) * PX"
        r="5"
      />
    </svg>
    <figcaption>
      <span v-if="caption">{{ caption }}: </span>
      Ē {{ n(map.averageLx) }} lx · Emin {{ n(map.minLx) }} lx · Emax {{ n(map.maxLx) }} lx · U₀
      {{ n(map.uniformity, 2) }}
    </figcaption>
  </figure>
</template>
