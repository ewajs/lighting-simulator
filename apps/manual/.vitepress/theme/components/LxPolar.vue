<!-- A luminaire's polar chart (ADR 0059): its intensity in cd round its two
     main planes, straight down at the bottom, as photometric reports draw it. -->
<script setup lang="ts">
import { computed } from 'vue';
import { useData } from 'vitepress';
import { formatNumber, path, ticks } from '../diagrams/plot';

type XY = [number, number];
const props = defineProps<{
  chart: { planes: readonly [readonly XY[], readonly XY[]]; peakCd: number; beamDeg: number };
  /** The two planes' names, the beam angle's, and the rings' ("Rings every"), in the page's language. */
  labels: [string, string, string, string];
  caption?: string;
}>();

const { lang } = useData();
const SIZE = 360;
const C = SIZE / 2;
const R = 150;
const rings = computed(() => {
  const all = ticks(props.chart.peakCd, 4);
  return all.slice(1);
});
const outer = computed(() => rings.value[rings.value.length - 1]!);
/** Angle from straight down, positive to the right, and cd → screen point. */
const at = (angleDeg: number, cd: number): XY => {
  const r = (cd / outer.value) * R;
  const a = (angleDeg * Math.PI) / 180;
  return [C + r * Math.sin(a), C + r * Math.cos(a)];
};
const curves = computed(() =>
  props.chart.planes.map((plane) => path(plane.map(([a, cd]) => at(a, cd)))),
);
const spokes = [0, 30, 60, 90, 120, 150, 180, -30, -60, -90, -120, -150];
const beamEdge = computed(() => [
  at(-props.chart.beamDeg / 2, outer.value),
  at(props.chart.beamDeg / 2, outer.value),
]);
/** A beam wider than this says nothing: the light goes almost everywhere. */
const MAX_BEAM_DEG = 180;
const showBeam = computed(() => props.chart.beamDeg <= MAX_BEAM_DEG);
const ringStep = computed(() => rings.value[0]!);
</script>

<template>
  <figure class="lx-figure lx-polar">
    <svg :viewBox="`0 0 ${SIZE} ${SIZE + 40}`" role="img" :aria-label="caption ?? labels[0]">
      <g class="grid">
        <circle v-for="r in rings" :key="r" :cx="C" :cy="C" :r="(r / outer) * R" />
        <line
          v-for="s in spokes"
          :key="s"
          :x1="C"
          :y1="C"
          :x2="at(s, outer)[0]"
          :y2="at(s, outer)[1]"
        />
      </g>
      <g class="axis">
        <text :x="C" :y="C + R + 16" text-anchor="middle">0°</text>
        <text :x="C + R + 6" :y="C + 4">90°</text>
        <text :x="C - R - 6" :y="C + 4" text-anchor="end">90°</text>
        <text :x="C" :y="C - R - 6" text-anchor="middle">180°</text>
      </g>
      <g class="beam" v-if="showBeam">
        <line :x1="C" :y1="C" :x2="beamEdge[0]![0]" :y2="beamEdge[0]![1]" />
        <line :x1="C" :y1="C" :x2="beamEdge[1]![0]" :y2="beamEdge[1]![1]" />
      </g>
      <path :d="curves[0]" class="series" />
      <path :d="curves[1]" class="series dashed" />
      <g class="legend" :transform="`translate(8, ${SIZE + 10})`">
        <line x1="0" x2="24" y1="0" y2="0" class="series" />
        <text x="30" y="4">{{ labels[0] }}</text>
        <line x1="0" x2="24" y1="18" y2="18" class="series dashed" />
        <text x="30" y="22">{{ labels[1] }}</text>
        <template v-if="showBeam">
          <line x1="190" x2="214" y1="0" y2="0" class="beam-key" />
          <text x="220" y="4">{{ labels[2] }} {{ formatNumber(chart.beamDeg, lang) }}°</text>
        </template>
        <text x="190" y="22">{{ labels[3] }} {{ formatNumber(ringStep, lang) }} cd</text>
      </g>
    </svg>
    <figcaption v-if="caption">{{ caption }}</figcaption>
  </figure>
</template>
