<!-- A room in plan with the work plane's border strip and its EN 12464-1
     calculation points (ADR 0059). -->
<script setup lang="ts">
type XY = [number, number];
defineProps<{
  room: { widthM: number; depthM: number };
  borderM: number;
  points: readonly XY[];
  /** The border's name, in the page's language. */
  borderLabel: string;
  caption?: string;
}>();
const PX = 70;
</script>

<template>
  <figure class="lx-figure lx-plan">
    <svg
      :viewBox="`-8 -8 ${room.widthM * PX + 16} ${room.depthM * PX + 16}`"
      role="img"
      :aria-label="caption"
    >
      <rect class="room-fill" x="0" y="0" :width="room.widthM * PX" :height="room.depthM * PX" />
      <rect
        class="border-band"
        :x="borderM * PX"
        :y="borderM * PX"
        :width="(room.widthM - 2 * borderM) * PX"
        :height="(room.depthM - 2 * borderM) * PX"
      />
      <rect class="room-outline" x="0" y="0" :width="room.widthM * PX" :height="room.depthM * PX" />
      <circle
        v-for="([x, z], k) in points"
        :key="k"
        class="grid-point"
        :cx="(x + room.widthM / 2) * PX"
        :cy="(z + room.depthM / 2) * PX"
        r="3.5"
      />
      <text
        class="axis"
        :x="(borderM * PX) / 2"
        :y="(room.depthM * PX) / 2"
        text-anchor="middle"
        :transform="`rotate(-90 ${(borderM * PX) / 2} ${(room.depthM * PX) / 2})`"
      >
        {{ borderLabel }}
      </text>
    </svg>
    <figcaption v-if="caption">{{ caption }}</figcaption>
  </figure>
</template>
