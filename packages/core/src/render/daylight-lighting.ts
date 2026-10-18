// Daylight in the picture (ADR 0082): the same sky the calculation uses
// (ADR 0080), turned into lights a real-time renderer can draw. Pure maths, no
// three.js, so it's unit-tested in Node.
//
// - The sun: a parallel beam of its direct normal illuminance times the clear
//   windows' transmittance, in lx. The walls' shadows keep it to the openings.
// - Each window: a wide spot just inside it, aimed into the room, as bright
//   as a panel of the sky's average luminance seen through it: a Lambertian
//   panel of luminance L and area A has intensity L · A at its normal, in cd.
// - The light it all brings in, in lm, for the room's overall bounce and for
//   the eye's adaptation: by day a room is ten times brighter than by lamps.

import { integrateSky, skyFor } from '../analysis/sky';
import { dot, scale } from '../math';
import type { Room, Scene, SkyKind, Vec3 } from '../types';
import { COVERINGS, GLAZINGS, windowRect } from '../windows';
import { indirectIlluminance } from './lighting';

/** A window's glow: a spot at `position` facing `normal`, of `candela` at its axis. */
export interface WindowGlow {
  readonly id: string;
  readonly position: Vec3;
  readonly normal: Vec3;
  readonly candela: number;
}

/** The lights daylight brings into the picture. */
export interface DaylightLighting {
  readonly sky: SkyKind;
  /** The sun on a clear day, above the horizon: the way to it, its beam in lx, and its colour. */
  readonly sun:
    { readonly direction: Vec3; readonly lux: number; readonly kelvin: number } | undefined;
  /** One per window letting light in. */
  readonly windows: readonly WindowGlow[];
  /** The sky's colour through the windows, in K. */
  readonly skyKelvin: number;
  /** All the daylight coming in, in lm. */
  readonly fluxLm: number;
}

/** A window's glow sits this far inside it, in m, so it lights the room, not its own wall. */
const GLOW_INSET_M = 0.05;
/** The overcast sky's colour: daylight white. */
const OVERCAST_KELVIN = 6500;
/** The clear sky's, away from the sun: bluer. */
const CLEAR_SKY_KELVIN = 9000;
/** The sun's colour, warm at the horizon and white from SUN_WHITE_ALTITUDE_DEG up. */
const SUN_HORIZON_KELVIN = 2000;
const SUN_WHITE_KELVIN = 5500;
const SUN_WHITE_ALTITUDE_DEG = 40;
const DEG = Math.PI / 180;

/** No daylight: night, or the sun set. */
const NONE = { sun: undefined, windows: [], fluxLm: 0 } as const;

/** The lights `scene`'s daylight brings in through its windows. */
export function daylightLighting(scene: Scene): DaylightLighting {
  const { daylight } = scene;
  const skyKelvin = daylight.sky === 'clear' ? CLEAR_SKY_KELVIN : OVERCAST_KELVIN;
  const sky = skyFor(daylight);
  if (!sky || scene.windows.length === 0) return { sky: daylight.sky, skyKelvin, ...NONE };
  let fluxLm = 0;
  let clearTransmittance = 0;
  const windows = scene.windows.map((window): WindowGlow => {
    const rect = windowRect(window, scene.room);
    const glazing = GLAZINGS[window.glazing];
    const covering = COVERINGS[window.covering];
    const transmittance = glazing.transmittance * covering.transmittance;
    const outward = scale(rect.normal, -1);
    const area = rect.width * rect.height;
    const skyLx = integrateSky(sky.luminance, outward);
    const sunLx = sky.sun ? sky.sun.normalLx * Math.max(0, dot(sky.sun.direction, outward)) : 0;
    const diffusing = glazing.diffusing || covering.diffusing;
    // A scattering window takes the sun into its glow; a clear one lets it through as a beam.
    const glowLx = skyLx + (diffusing ? sunLx : 0);
    if (!diffusing) clearTransmittance = Math.max(clearTransmittance, transmittance);
    fluxLm += transmittance * (skyLx + sunLx) * area;
    const { x, y, z } = window.position;
    return {
      id: window.id,
      position: {
        x: x + rect.normal.x * GLOW_INSET_M,
        y: y + rect.normal.y * GLOW_INSET_M,
        z: z + rect.normal.z * GLOW_INSET_M,
      },
      normal: rect.normal,
      // L = τ · E / π, and I = L · A.
      candela: ((transmittance * glowLx) / Math.PI) * area,
    };
  });
  const sun =
    sky.sun && clearTransmittance > 0
      ? {
          direction: sky.sun.direction,
          lux: sky.sun.normalLx * clearTransmittance,
          kelvin: sunKelvin(Math.asin(sky.sun.direction.y) / DEG),
        }
      : undefined;
  return { sky: daylight.sky, sun, windows, skyKelvin, fluxLm };
}

/** The sun's colour at `altitudeDeg`: warm low, white high. */
export function sunKelvin(altitudeDeg: number): number {
  const t = Math.min(1, Math.max(0, altitudeDeg / SUN_WHITE_ALTITUDE_DEG));
  return SUN_HORIZON_KELVIN + t * (SUN_WHITE_KELVIN - SUN_HORIZON_KELVIN);
}

/**
 * Up to this average illuminance, in lx, the exposure stays as calibrated for
 * lamps (BASE_EXPOSURE). Above it, as by day, it's lowered in proportion, as
 * the eye adapts.
 */
export const ADAPTATION_LUX = 300;

/**
 * How much to scale the exposure for daylight of `fluxLm` in `room`: 1 with
 * little or none, less as the room's average illuminance by daylight (the
 * integrating-sphere estimate) rises above ADAPTATION_LUX.
 */
export function daylightExposureScale(fluxLm: number, room: Room): number {
  if (fluxLm <= 0) return 1;
  const area = 2 * room.width * room.depth + 2 * (room.width + room.depth) * room.height;
  // Direct and bounced together: Φ / A, then every bounce of it.
  const averageLx = fluxLm / area + indirectIlluminance(fluxLm, room);
  return Math.min(1, ADAPTATION_LUX / averageLx);
}
