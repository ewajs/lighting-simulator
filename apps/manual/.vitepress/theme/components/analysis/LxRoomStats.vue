<!-- A reference room at a glance (ADR 0062): the full calculation's worst
     surface average and mean point difference against Radiance, and how long
     each took. -->
<script setup lang="ts">
import { computed } from 'vue';
import { useData } from 'vitepress';
import { langOf, METRICS, WORDS } from '../../analysis/names';
import { percent } from '../../analysis/plot-frame';
import type { RoomPage } from '../../analysis/types';

const props = defineProps<{ page: RoomPage }>();

const { lang } = useData();
const l = computed(() => langOf(lang.value));
const full = computed(() => props.page.summary.features[props.page.summary.features.length - 1]!);
const oursMs = computed(() => {
  const steps = props.page.timings?.steps;
  return steps ? steps[steps.length - 1]!.medianMs : undefined;
});
const radianceS = computed(() => {
  const r = props.page.timings?.radiance;
  return r ? r.direct.wallSeconds + r.bounced.wallSeconds : undefined;
});
</script>

<template>
  <div class="lx-stats">
    <div class="stat">
      <div class="value">{{ percent(full.worstAverage, lang, 1) }}</div>
      <div class="name">{{ METRICS.worstAverage![l].name }}</div>
    </div>
    <div class="stat">
      <div class="value">{{ percent(full.meanPointError, lang, 1) }}</div>
      <div class="name">{{ METRICS.meanPointError![l].name }}</div>
    </div>
    <div v-if="oursMs !== undefined" class="stat">
      <div class="value">{{ Math.round(oursMs).toLocaleString(lang) }} ms</div>
      <div class="name">{{ WORDS[l].oursFull }}</div>
    </div>
    <div v-if="radianceS !== undefined" class="stat">
      <div class="value">{{ radianceS.toLocaleString(lang, { maximumFractionDigits: 0 }) }} s</div>
      <div class="name">{{ WORDS[l].radianceFull }}</div>
    </div>
  </div>
</template>
