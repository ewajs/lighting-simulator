<!-- A reference room's surfaces in numbers (ADR 0062): each one's average in
     Radiance and in Lux Studio, the difference, and its worst bright points. -->
<script setup lang="ts">
import { computed, ref } from 'vue';
import { useData } from 'vitepress';
import { langOf, SURFACES, WORDS } from '../../analysis/names';
import { percent } from '../../analysis/plot-frame';
import type { RoomPage, SurfaceSummary } from '../../analysis/types';

const props = defineProps<{ page: RoomPage }>();

const { lang } = useData();
const l = computed(() => langOf(lang.value));
const light = ref<'total' | 'direct' | 'bounced' | 'empty'>('total');
const furnished = computed(() => props.page.summary.withoutFurniture.length > 0);
const rows = computed((): readonly SurfaceSummary[] =>
  light.value === 'direct'
    ? props.page.summary.direct
    : light.value === 'bounced'
      ? props.page.summary.bounced
      : light.value === 'empty'
        ? props.page.summary.withoutFurniture
        : props.page.summary.total,
);
/** How a difference reads: within Radiance's noise, close, or off. */
const grade = (value: number) => {
  const v = Math.abs(value);
  return v < 0.01 ? 'good' : v < 0.05 ? 'fair' : 'poor';
};
const lx = (v: number) =>
  v.toLocaleString(lang.value, { maximumFractionDigits: 1, minimumFractionDigits: 1 });
</script>

<template>
  <div class="lx-surface-table">
    <div class="lx-controls" role="group">
      <span class="label">{{ WORDS[l].light }}</span>
      <button type="button" :class="{ active: light === 'total' }" @click="light = 'total'">
        {{ WORDS[l].totalShort }}
      </button>
      <button type="button" :class="{ active: light === 'direct' }" @click="light = 'direct'">
        {{ WORDS[l].directShort }}
      </button>
      <button type="button" :class="{ active: light === 'bounced' }" @click="light = 'bounced'">
        {{ WORDS[l].bouncedShort }}
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
    <table>
      <thead>
        <tr>
          <th>{{ WORDS[l].surface }}</th>
          <th class="num">Radiance Ē</th>
          <th class="num">Lux Studio Ē</th>
          <th class="num">{{ WORDS[l].tableDifference }}</th>
          <th class="num">{{ WORDS[l].tableFar }}</th>
          <th class="num">{{ WORDS[l].tableNear }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.surface">
          <td>{{ SURFACES[row.surface]?.[l] ?? row.surface }}</td>
          <td class="num">{{ lx(row.radianceAverageLx) }}</td>
          <td class="num">{{ lx(row.oursAverageLx) }}</td>
          <td class="num">
            <span :class="['chip', grade(row.averageError)]">{{
              percent(row.averageError, lang, 2)
            }}</span>
          </td>
          <td class="num">
            <span v-if="row.worstFar > 0" :class="['chip', grade(row.worstFar)]">{{
              percent(row.worstFar, lang, 1)
            }}</span>
            <span v-else>–</span>
          </td>
          <td class="num">
            <span v-if="row.worstNear > 0" :class="['chip', grade(row.worstNear)]">{{
              percent(row.worstNear, lang, 1)
            }}</span>
            <span v-else>–</span>
          </td>
        </tr>
      </tbody>
    </table>
    <p class="lx-note">{{ WORDS[l].tableNote }}</p>
  </div>
</template>
