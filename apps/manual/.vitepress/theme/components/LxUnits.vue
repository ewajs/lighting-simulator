<!-- The three units of light in one picture (ADR 0059): flux leaving a
     luminaire (lumen), its intensity in one direction (candela), and what
     lands on a surface (lux). -->
<script setup lang="ts">
defineProps<{
  /** Labels for the flux, the intensity and the illuminance, in the page's language. */
  labels: [string, string, string];
  caption?: string;
}>();
</script>

<template>
  <figure class="lx-figure lx-units">
    <svg viewBox="0 0 640 310" role="img" :aria-label="caption">
      <!-- The light's cone, from a downlight in the ceiling to the floor. -->
      <line class="room-outline" x1="40" y1="30" x2="600" y2="30" />
      <line class="room-outline" x1="40" y1="270" x2="600" y2="270" />
      <polygon class="cone" points="300,34 340,34 470,268 170,268" />
      <rect class="luminaire-body" x="296" y="26" width="48" height="10" rx="2" />
      <!-- One direction: the intensity. -->
      <line class="ray" x1="320" y1="40" x2="420" y2="262" />
      <polygon class="ray-head" points="420,262 410,246 424,248" />
      <!-- A patch of floor: the illuminance. -->
      <ellipse class="patch" cx="230" cy="268" rx="40" ry="7" />
      <text x="360" y="90" class="label">{{ labels[0] }}</text>
      <text x="400" y="190" class="label">{{ labels[1] }}</text>
      <text x="230" y="298" class="label" text-anchor="middle">{{ labels[2] }}</text>
    </svg>
    <figcaption v-if="caption">{{ caption }}</figcaption>
  </figure>
</template>
