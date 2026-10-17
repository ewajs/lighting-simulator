<!-- The key to the false-colour maps (ADR 0059): the ramp from 0 to the maps'
     top value, with round lux ticks. One key under maps that share a scale. -->
<script setup lang="ts">
import { computed, useId } from 'vue';
import { useData } from 'vitepress';
import { formatNumber, rampColor, ticks } from '../diagrams/plot';

const props = defineProps<{
  /** The maps' scale top, in lx: the colour of a value is rampColor(value / maxLx). */
  maxLx: number;
  label: string;
}>();

const { lang } = useData();
const W = 460;
const BAR = { x: 8, y: 22, width: W - 16, height: 14 };
/** Gradient stops: enough that the ramp's five colours blend as on the maps. */
const STOPS = 20;
const stops = Array.from({ length: STOPS + 1 }, (_, k) => k / STOPS);
const marks = computed(() => ticks(props.maxLx, 5).filter((t) => t <= props.maxLx + 1e-9));
const x = (lx: number) => BAR.x + (lx / props.maxLx) * BAR.width;
// The same id when built and when the page hydrates in the browser.
const id = `lx-ramp${useId()}`;
</script>

<template>
  <figure class="lx-figure lx-color-scale">
    <svg :viewBox="`0 0 ${W} 60`" role="img" :aria-label="label">
      <defs>
        <linearGradient :id="id">
          <stop v-for="s in stops" :key="s" :offset="s" :stop-color="rampColor(s)" />
        </linearGradient>
      </defs>
      <text class="label" :x="BAR.x" y="14">{{ label }}</text>
      <rect
        :x="BAR.x"
        :y="BAR.y"
        :width="BAR.width"
        :height="BAR.height"
        :fill="`url(#${id})`"
        class="scale-bar"
      />
      <g class="axis">
        <line
          v-for="t in marks"
          :key="`t${t}`"
          :x1="x(t)"
          :x2="x(t)"
          :y1="BAR.y + BAR.height"
          :y2="BAR.y + BAR.height + 5"
        />
        <text v-for="t in marks" :key="`l${t}`" :x="x(t)" y="55" text-anchor="middle">
          {{ formatNumber(t, lang) }}
        </text>
      </g>
    </svg>
  </figure>
</template>
