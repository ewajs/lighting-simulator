<!-- A reference room seen from above (ADR 0062): its walls, its furniture as
     the boxes the calculation uses, its luminaires with an arrow where a
     tilted one points, and the surfaces where it's measured. -->
<script setup lang="ts">
import { computed } from 'vue';
import { useData } from 'vitepress';
import { mapExtent, mapPoints } from '../../analysis/geometry';
import { langOf, SURFACES, WORDS } from '../../analysis/names';
import type { RoomPage } from '../../analysis/types';

const props = defineProps<{ page: RoomPage }>();

const { lang } = useData();
const l = computed(() => langOf(lang.value));
/** Pixels per metre, and room around the plan for the walls' names. */
const PX = 80;
const PAD = 34;
const room = computed(() => props.page.comparison.room.room);
const W = computed(() => room.value.width * PX);
const D = computed(() => room.value.depth * PX);
/** Lux Studio's x and z (centred on the room) to the plan's px. */
const px = (x: number) => PAD + (x + room.value.width / 2) * PX;
const pz = (z: number) => PAD + (z + room.value.depth / 2) * PX;
/** How long an arrow is for a luminaire tilted level, in m. */
const ARROW_M = 0.6;

const measured = computed(() => props.page.comparison.surfaces.map((s) => s.surface));
const walls = computed(() => {
  const [x0, x1, z0, z1] = [
    px(-room.value.width / 2),
    px(room.value.width / 2),
    pz(-room.value.depth / 2),
    pz(room.value.depth / 2),
  ];
  return [
    { id: 'wall-z-', x1: x0, y1: z0, x2: x1, y2: z0, lx: (x0 + x1) / 2, ly: z0 - 10, rotate: 0 },
    { id: 'wall-z+', x1: x0, y1: z1, x2: x1, y2: z1, lx: (x0 + x1) / 2, ly: z1 + 22, rotate: 0 },
    { id: 'wall-x-', x1: x0, y1: z0, x2: x0, y2: z1, lx: x0 - 12, ly: (z0 + z1) / 2, rotate: -90 },
    { id: 'wall-x+', x1: x1, y1: z0, x2: x1, y2: z1, lx: x1 + 12, ly: (z0 + z1) / 2, rotate: 90 },
  ];
});
const boxes = computed(() =>
  (props.page.comparison.room.blockers ?? []).map((b) => ({
    x: px(b.centre.x - b.half.x),
    y: pz(b.centre.z - b.half.z),
    width: 2 * b.half.x * PX,
    height: 2 * b.half.z * PX,
    rotate: `rotate(${-(b.yawDeg ?? 0)} ${px(b.centre.x)} ${pz(b.centre.z)})`,
    topM: b.centre.y + b.half.y,
  })),
);
/** The work plane's measured area, from its points: as large as its grid's cells reach. */
const workPlane = computed(() => {
  const surface = props.page.comparison.surfaces.find((s) => s.surface === 'work-plane');
  if (!surface) return undefined;
  const { u0, u1, v0, v1 } = mapExtent(mapPoints(surface));
  return { x: px(u0), y: pz(v0), width: (u1 - u0) * PX, height: (v1 - v0) * PX };
});
</script>

<template>
  <figure class="lx-figure lx-room-plan">
    <svg :viewBox="`0 0 ${W + 2 * PAD} ${D + 2 * PAD}`" role="img" :aria-label="page.summary.name">
      <rect class="room-fill" :x="PAD" :y="PAD" :width="W" :height="D" />
      <rect
        v-if="workPlane"
        class="work-plane"
        :x="workPlane.x"
        :y="workPlane.y"
        :width="workPlane.width"
        :height="workPlane.height"
      />
      <g v-for="wall in walls" :key="wall.id">
        <line
          :class="['wall', { measured: measured.includes(wall.id) }]"
          :x1="wall.x1"
          :y1="wall.y1"
          :x2="wall.x2"
          :y2="wall.y2"
        />
        <text
          class="wall-name"
          text-anchor="middle"
          :x="wall.lx"
          :y="wall.ly"
          :transform="wall.rotate ? `rotate(${wall.rotate} ${wall.lx} ${wall.ly})` : undefined"
        >
          {{ SURFACES[wall.id]![l] }}
        </text>
      </g>
      <g v-for="(box, k) in boxes" :key="`b${k}`">
        <rect
          class="furniture"
          :x="box.x"
          :y="box.y"
          :width="box.width"
          :height="box.height"
          :transform="box.rotate"
        />
      </g>
      <g v-for="(lum, k) in page.plan" :key="`l${k}`">
        <line
          v-if="Math.hypot(lum.aimX, lum.aimZ) > 0.01"
          class="aim"
          :x1="px(lum.x)"
          :y1="pz(lum.z)"
          :x2="px(lum.x + lum.aimX * ARROW_M)"
          :y2="pz(lum.z + lum.aimZ * ARROW_M)"
          marker-end="url(#lx-plan-arrow)"
        />
        <circle class="luminaire" :cx="px(lum.x)" :cy="pz(lum.z)" r="7" />
      </g>
      <defs>
        <marker
          id="lx-plan-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 z" class="aim-head" />
        </marker>
      </defs>
    </svg>
    <ul class="lx-legend">
      <li><span class="swatch c1 round"></span>{{ WORDS[l].planLuminaire }}</li>
      <li v-if="boxes.length">
        <span class="swatch neutral faint"></span>{{ WORDS[l].planFurniture }}
      </li>
      <li><span class="swatch c2 line"></span>{{ WORDS[l].planMeasured }}</li>
      <li v-if="workPlane"><span class="swatch c2 dashed"></span>{{ WORDS[l].planWorkPlane }}</li>
    </ul>
    <figcaption><slot /></figcaption>
  </figure>
</template>
