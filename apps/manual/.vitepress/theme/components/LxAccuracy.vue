<!-- Lux Studio against Radiance, room by room (ADR 0058, 0059): from
     accuracy/summary.json, which a test keeps current. -->
<script setup lang="ts">
import { computed } from 'vue';
import { useData } from 'vitepress';
import { formatNumber } from '../diagrams/plot';

const props = defineProps<{
  summary: {
    rooms: readonly {
      name: string;
      total: readonly { averageError: number; worstFar: number; worstNear: number }[];
    }[];
  };
  /** Each room's name in the page's language, by its file name. */
  roomNames: Record<string, string>;
  /** Column headings: room, surface averages, bright points far, bright points near. */
  headings: [string, string, string, string];
}>();

const { lang } = useData();
const pct = (value: number) => `${formatNumber(value * 100, lang.value, 2)} %`;
const rows = computed(() =>
  props.summary.rooms.map((room) => ({
    name: props.roomNames[room.name] ?? room.name,
    average: Math.max(...room.total.map((s) => Math.abs(s.averageError))),
    far: Math.max(...room.total.map((s) => s.worstFar)),
    near: Math.max(...room.total.map((s) => s.worstNear)),
  })),
);
</script>

<template>
  <table>
    <thead>
      <tr>
        <th v-for="h in headings" :key="h">{{ h }}</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="row in rows" :key="row.name">
        <td>{{ row.name }}</td>
        <td>{{ pct(row.average) }}</td>
        <td>{{ row.far > 0 ? pct(row.far) : '–' }}</td>
        <td>{{ row.near > 0 ? pct(row.near) : '–' }}</td>
      </tr>
    </tbody>
  </table>
</template>
