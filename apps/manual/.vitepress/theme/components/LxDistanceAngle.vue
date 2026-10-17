<!-- The cosine and inverse-square laws, to play with (ADR 0059): a luminaire
     above a floor, seen from the side. The reader moves the point, the
     luminaire's height and the surface's tilt; the diagram shows d, γ and α,
     and E = I cos α / d² with I from the demo downlight's real IES file. -->
<script setup lang="ts">
import { computed, ref } from 'vue';
import { useData } from 'vitepress';
import { formatNumber, path } from '../diagrams/plot';
import {
  DEG,
  arcPath,
  clamp,
  dragHandlers,
  lookUp,
  screenAngle,
  turn,
  type XY,
} from '../diagrams/interactive';

const props = defineProps<{
  /** The luminaire's intensity by vertical angle: γ in degrees from straight down, cd. */
  profile: readonly XY[];
  /** In the page's language: the three sliders, and what to say when the surface faces away. */
  labels: { height: string; position: string; tilt: string; away: string };
  caption?: string;
}>();

const { lang } = useData();
const n = (v: number, digits = 0) => formatNumber(v, lang.value, digits);

const LIMITS = { heightM: [1.5, 3.5], positionM: [-4, 4], tiltDeg: [-90, 90] } as const;
const heightM = ref(2.7);
const positionM = ref(1.5);
const tiltDeg = ref(0);

// Side view: 1 m is PX pixels, the floor at y = FLOOR, the luminaire's axis at x = MID.
const W = 420;
const H = 208;
const PX = 46;
const MID = W / 2;
const FLOOR = H - 22;
const sx = (x: number) => MID + x * PX;
const sy = (y: number) => FLOOR - y * PX;
/** The polar curve drawn round the luminaire: its peak this long, in m. */
const LOBE_M = 1.2;
/** Half the small surface's length, and the normal's length, in m. */
const CARD_M = 0.45;
const NORMAL_M = 1.05;
/** How far short of the point the ray's arrow stops, in px. */
const GAP = 8;

const peakCd = computed(() => Math.max(...props.profile.map(([, cd]) => cd)));
const lamp = computed<XY>(() => [sx(0), sy(heightM.value)]);
const point = computed<XY>(() => [sx(positionM.value), sy(0)]);

/** Everything the formula needs, in world units (y up). */
const light = computed(() => {
  const [dx, dy] = [-positionM.value, heightM.value]; // from the point to the luminaire
  const d = Math.hypot(dx, dy);
  const gammaDeg = Math.atan2(Math.abs(dx), dy) / DEG;
  const tilt = tiltDeg.value * DEG;
  const normal: XY = [Math.sin(tilt), Math.cos(tilt)];
  const cosAlpha = (dx * normal[0] + dy * normal[1]) / d;
  const cd = lookUp(props.profile, gammaDeg);
  return {
    d,
    gammaDeg,
    normal,
    cosAlpha,
    alphaDeg: Math.acos(clamp(cosAlpha, -1, 1)) / DEG,
    cd,
    lux: cosAlpha > 0 ? (cd * cosAlpha) / (d * d) : 0,
  };
});

const lobe = computed(() => {
  const points: XY[] = [];
  for (let g = -90; g <= 90; g += 2) {
    const r = (lookUp(props.profile, Math.abs(g)) / peakCd.value) * LOBE_M * PX;
    points.push([lamp.value[0] + r * Math.sin(g * DEG), lamp.value[1] + r * Math.cos(g * DEG)]);
  }
  return `${path(points)} Z`;
});

/** The ray's direction on screen, from the luminaire to the point, and where it meets the curve. */
const ray = computed(() => {
  const [x0, y0] = lamp.value;
  const [x1, y1] = point.value;
  const length = Math.hypot(x1 - x0, y1 - y0);
  const u: XY = [(x1 - x0) / length, (y1 - y0) / length];
  const r = (light.value.cd / peakCd.value) * LOBE_M * PX;
  // The arrow stops short of the point, so the handle doesn't hide its head.
  const tip: XY = [x1 - u[0] * GAP, y1 - u[1] * GAP];
  return { u, tip, head: arrowHead(tip, u), onLobe: [x0 + u[0] * r, y0 + u[1] * r] as XY };
});

/** A filled arrow head with its tip at `tip`, pointing along the unit vector `u` (screen). */
function arrowHead([x, y]: XY, [ux, uy]: XY): string {
  const [l, w] = [13, 6];
  return `${x},${y} ${x - ux * l - uy * w},${y - uy * l + ux * w} ${x - ux * l + uy * w},${y - uy * l - ux * w}`;
}

const gammaArc = computed(() => {
  const toPoint = screenAngle(positionM.value, -heightM.value);
  return { d: arcPath(...lamp.value, 34, 0, toPoint), label: polar(lamp.value, 50, toPoint / 2) };
});

const surface = computed(() => {
  const [nx, ny] = light.value.normal;
  const [px, py] = point.value;
  const t: XY = [ny * CARD_M * PX, nx * CARD_M * PX]; // along the card, on screen
  const tip: XY = [px + nx * NORMAL_M * PX, py - ny * NORMAL_M * PX];
  const normalAngle = screenAngle(nx, ny);
  const lampAngle = screenAngle(-positionM.value, heightM.value);
  const sweep = turn(normalAngle, lampAngle);
  return {
    card: [px - t[0], py - t[1], px + t[0], py + t[1]],
    tip,
    head: arrowHead(tip, [nx, -ny]),
    alphaArc: arcPath(px, py, 30, normalAngle, sweep),
    alphaLabel: polar(point.value, 46, normalAngle + sweep / 2),
  };
});

function polar([x, y]: XY, r: number, angle: number): XY {
  return [x + r * Math.sin(angle), y + r * Math.cos(angle)];
}

const dLabel = computed<XY>(() => {
  const [x0, y0] = lamp.value;
  const [x1, y1] = point.value;
  const [ux, uy] = ray.value.u;
  // Beside the ray's middle, on the side away from the luminaire's axis.
  const side = positionM.value >= 0 ? -1 : 1;
  return [(x0 + x1) / 2 - uy * 16 * side, (y0 + y1) / 2 + ux * 16 * side + 4];
});

const movePoint = dragHandlers(([x]) => {
  positionM.value = round(clamp((x - MID) / PX, ...LIMITS.positionM), 0.05);
});
const moveLamp = dragHandlers(([, y]) => {
  heightM.value = round(clamp((FLOOR - y) / PX, ...LIMITS.heightM), 0.1);
});
// Adding 0 turns −0 into 0, which would print as "−0,00".
const round = (value: number, step: number) => Math.round(value / step) * step + 0;
</script>

<template>
  <figure class="lx-figure lx-interactive">
    <svg :viewBox="`0 0 ${W} ${H}`" role="img" :aria-label="caption">
      <rect class="floor-band" x="0" :y="FLOOR" :width="W" :height="H - FLOOR" />
      <line class="room-outline" x1="0" :x2="W" :y1="FLOOR" :y2="FLOOR" />
      <path class="lobe" :d="lobe" />
      <!-- Straight down: where γ starts. -->
      <line class="nadir" :x1="lamp[0]" :y1="lamp[1]" :x2="lamp[0]" :y2="FLOOR" />
      <text
        :x="lamp[0] + (positionM >= 0 ? -8 : 8)"
        :y="(lamp[1] + FLOOR) / 2 + 30"
        :text-anchor="positionM >= 0 ? 'end' : 'start'"
      >
        h
      </text>
      <path class="angle-arc" :d="gammaArc.d" />
      <text class="symbol" :x="gammaArc.label[0]" :y="gammaArc.label[1] + 5" text-anchor="middle">
        γ
      </text>
      <line class="ray" :x1="lamp[0]" :y1="lamp[1]" :x2="ray.tip[0]" :y2="ray.tip[1]" />
      <polygon class="ray-head" :points="ray.head" />
      <circle class="lobe-mark" :cx="ray.onLobe[0]" :cy="ray.onLobe[1]" r="4.5" />
      <text class="symbol" :x="dLabel[0]" :y="dLabel[1]" text-anchor="middle">d</text>
      <!-- The small surface at the point, its normal and the angle α to the light. -->
      <line
        class="normal"
        :x1="point[0]"
        :y1="point[1]"
        :x2="surface.tip[0]"
        :y2="surface.tip[1]"
      />
      <polygon class="normal-head" :points="surface.head" />
      <path class="angle-arc" :d="surface.alphaArc" />
      <text
        class="symbol"
        :x="surface.alphaLabel[0]"
        :y="surface.alphaLabel[1] + 5"
        text-anchor="middle"
      >
        α
      </text>
      <line
        class="surface"
        :x1="surface.card[0]"
        :y1="surface.card[1]"
        :x2="surface.card[2]"
        :y2="surface.card[3]"
      />
      <!-- Handles: the luminaire moves up and down, the point along the floor. -->
      <g class="handle" v-on="moveLamp">
        <rect
          class="luminaire-body"
          :x="lamp[0] - 14"
          :y="lamp[1] - 9"
          width="28"
          height="9"
          rx="2"
        />
        <circle class="handle-hit" :cx="lamp[0]" :cy="lamp[1] - 4" r="22" />
      </g>
      <g class="handle" v-on="movePoint">
        <circle class="handle-dot" :cx="point[0]" :cy="point[1]" r="7" />
        <circle class="handle-hit" :cx="point[0]" :cy="point[1]" r="22" />
      </g>
    </svg>
    <div class="lx-readout" aria-live="polite">
      <span>d = {{ n(light.d, 2) }} m</span>
      <span>γ = {{ n(light.gammaDeg) }}°</span>
      <span>I = {{ n(light.cd) }} cd</span>
      <span>α = {{ n(light.alphaDeg) }}°</span>
      <strong v-if="light.cosAlpha > 0">
        E = I · cos α / d² = {{ n(light.cd) }} · {{ n(light.cosAlpha, 2) }} / {{ n(light.d, 2) }}² =
        {{ n(light.lux) }} lx
      </strong>
      <strong v-else>E = 0 lx: {{ labels.away }}</strong>
    </div>
    <div class="lx-controls">
      <label>
        <span>{{ labels.height }}</span>
        <input
          v-model.number="heightM"
          type="range"
          :min="LIMITS.heightM[0]"
          :max="LIMITS.heightM[1]"
          step="0.1"
        />
        <output>{{ n(heightM, 1) }} m</output>
      </label>
      <label>
        <span>{{ labels.position }}</span>
        <input
          v-model.number="positionM"
          type="range"
          :min="LIMITS.positionM[0]"
          :max="LIMITS.positionM[1]"
          step="0.05"
        />
        <output>{{ n(positionM, 2) }} m</output>
      </label>
      <label>
        <span>{{ labels.tilt }}</span>
        <input
          v-model.number="tiltDeg"
          type="range"
          :min="LIMITS.tiltDeg[0]"
          :max="LIMITS.tiltDeg[1]"
          step="5"
        />
        <output>{{ n(tiltDeg) }}°</output>
      </label>
    </div>
    <figcaption v-if="caption">{{ caption }}</figcaption>
  </figure>
</template>
