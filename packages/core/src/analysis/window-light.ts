// Daylight through the windows (ADR 0080): each window is a source of light
// in its wall or the ceiling, as bright as what's seen through it.
//
// - Clear or tinted glass shows the sky (or the ground) behind it, so its
//   brightness changes with the direction it's seen from. It's split into
//   cells, and a point gets from each cell
//     E = τ · L(d) · cos θp · cos θw · A / r²,
//   L(d) being the sky's luminance along the line from the point through
//   the cell, τ the glass's transmittance, θp and θw the angles that line
//   makes with the point's surface and with the window, A the cell's area and
//   r its distance. The sun comes through it as a beam, Edn · τ · cos θp
//   where the line towards the sun passes through the opening.
// - Frosted glass or a sheer curtain or blind scatters what it lets
//   through: the window glows evenly, with luminance τ · E_out / π, E_out
//   being the sky's, the ground's and the sun's illuminance on its outside.
//   A point gets L · π · F, F the exact form factor to the window.
//
// Furniture shadows daylight as it does the luminaires' light.

import { add, dot, scale, subtract } from '../math';
import type { Room, RoomWindow, Scene, Vec3 } from '../types';
import { COVERINGS, GLAZINGS, windowRect, type WindowRect } from '../windows';
import { pointToPolygon } from './form-factor';
import {
  boundsMeetBlockers,
  prepareBlockers,
  segmentBlockedPrepared,
  type Blocker,
} from './occlusion';
import type { Patch } from './patches';
import { integrateSky, type Sky } from './sky';

/** One window as a source of daylight. */
export interface WindowSource {
  readonly rect: WindowRect;
  /** Its corners, in order round its edge. */
  readonly vertices: readonly Vec3[];
  /** The share of the light outside that it lets in: its glass's times its covering's. */
  readonly transmittance: number;
  /**
   * When it scatters (frosted glass, a curtain, a blind), its even luminance
   * into the room, in cd/m². Undefined for clear or tinted glass, which shows
   * the sky.
   */
  readonly panelLuminance: number | undefined;
  /** Its cells: points spread over it, each standing for an equal share of its area. */
  readonly cells: readonly Vec3[];
  readonly cellArea: number;
  /** A few points spread over it, for how much of a scattering window furniture hides from a point. */
  readonly samples: readonly Vec3[];
  /** Its bounds, min x, y, z then max x, y, z: no box near them and a point, nothing hides it. */
  readonly bounds: readonly number[];
}

/** A scene's daylight, ready to be read at any point with `daylightIlluminance`. */
export interface DaylightSources {
  /** The sky, or undefined with no daylight: night, the sun set, or daylight left out. */
  readonly sky: Sky | undefined;
  /** What the daylight depends on, as a string: equal keys, equal daylight everywhere (cache.ts). */
  readonly key: string;
  /** Every window, even with no daylight: the light inside still leaves through them. */
  readonly windows: readonly WindowSource[];
}

/** No windows and no sky: a room without daylight. */
export const NO_DAYLIGHT: DaylightSources = { sky: undefined, key: 'none', windows: [] };

/**
 * The scene's windows as sources of `sky`'s daylight (e.g. `skyFor(scene.daylight)`),
 * split into cells of at most `cellM`. With no sky, the windows are there for
 * the light that leaves through them, but let none in.
 */
export function daylightSources(
  scene: Scene,
  cellM: number,
  sky: Sky | undefined,
): DaylightSources {
  const windows = scene.windows.map((window) => windowSource(window, scene.room, sky, cellM));
  const key = JSON.stringify([sky ? scene.daylight : 'none', scene.windows, cellM]);
  return { sky, key, windows };
}

function windowSource(
  window: RoomWindow,
  room: Room,
  sky: Sky | undefined,
  cellM: number,
): WindowSource {
  const rect = windowRect(window, room);
  const glazing = GLAZINGS[window.glazing];
  const covering = COVERINGS[window.covering];
  const transmittance = glazing.transmittance * covering.transmittance;
  const diffusing = glazing.diffusing || covering.diffusing;
  const outward = scale(rect.normal, -1);
  const outsideLx = sky
    ? integrateSky(sky.luminance, outward) +
      (sky.sun ? sky.sun.normalLx * Math.max(0, dot(sky.sun.direction, outward)) : 0)
    : 0;
  const columns = Math.max(1, Math.ceil(rect.width / cellM));
  const rows = Math.max(1, Math.ceil(rect.height / cellM));
  const at = (a: number, b: number) => add(rect.corner, add(scale(rect.u, a), scale(rect.v, b)));
  const grid = (across: number, up: number) => {
    const points: Vec3[] = [];
    for (let j = 0; j < up; j++) {
      for (let i = 0; i < across; i++) {
        points.push(at(((i + 0.5) * rect.width) / across, ((j + 0.5) * rect.height) / up));
      }
    }
    return points;
  };
  const vertices = [at(0, 0), at(rect.width, 0), at(rect.width, rect.height), at(0, rect.height)];
  const [xs, ys, zs] = [
    vertices.map((v) => v.x),
    vertices.map((v) => v.y),
    vertices.map((v) => v.z),
  ];
  return {
    rect,
    vertices,
    transmittance,
    panelLuminance: diffusing ? (transmittance * outsideLx) / Math.PI : undefined,
    cells: grid(columns, rows),
    cellArea: (rect.width / columns) * (rect.height / rows),
    samples: grid(SAMPLES_PER_SIDE, SAMPLES_PER_SIDE),
    bounds: [
      Math.min(...xs),
      Math.min(...ys),
      Math.min(...zs),
      Math.max(...xs),
      Math.max(...ys),
      Math.max(...zs),
    ],
  };
}

/** A scattering window is seen past furniture through 4 × 4 sample points. */
const SAMPLES_PER_SIDE = 4;

/**
 * The daylight in lx on a surface at `point` facing `normal` (a unit
 * vector): through every window, from the sky, the ground and the sun, past
 * the furniture's `blockers`.
 */
export function daylightIlluminance(
  point: Vec3,
  normal: Vec3,
  daylight: DaylightSources,
  blockers: readonly Blocker[],
): number {
  const { sky } = daylight;
  if (!sky) return 0;
  const all = blockers.length > 0 ? prepareBlockers(blockers) : undefined;
  let lux = 0;
  for (const window of daylight.windows) {
    // A point in the window's own plane, or outside it, sees nothing through it.
    const facing = dot(subtract(point, window.rect.corner), window.rect.normal);
    if (facing <= 0) continue;
    // Most windows are seen past no furniture at all: then there's nothing to test.
    const b = window.bounds;
    const boxes =
      all &&
      boundsMeetBlockers(
        all,
        Math.min(point.x, b[0]!),
        Math.min(point.y, b[1]!),
        Math.min(point.z, b[2]!),
        Math.max(point.x, b[3]!),
        Math.max(point.y, b[4]!),
        Math.max(point.z, b[5]!),
      )
        ? all
        : undefined;
    const clear = (to: Vec3) =>
      !boxes || !segmentBlockedPrepared(boxes, point.x, point.y, point.z, to.x, to.y, to.z);
    if (window.panelLuminance !== undefined) {
      if (window.panelLuminance === 0) continue;
      const factor = pointToPolygon(point, normal, window.vertices);
      if (factor === 0) continue;
      const seen = boxes ? window.samples.filter(clear).length / window.samples.length : 1;
      lux += window.panelLuminance * Math.PI * factor * seen;
      continue;
    }
    lux += throughClearGlass(point, normal, window, sky, clear);
  }
  return lux;
}

/** The sky's and the sun's light through one clear (or tinted) window, in lx. */
function throughClearGlass(
  point: Vec3,
  normal: Vec3,
  window: WindowSource,
  sky: Sky,
  clear: (to: Vec3) => boolean,
): number {
  const { rect, transmittance, cellArea } = window;
  let lux = 0;
  for (const cell of window.cells) {
    const toCell = subtract(cell, point);
    const r2 = dot(toCell, toCell);
    const r = Math.sqrt(r2);
    const d = scale(toCell, 1 / r);
    const cosPoint = dot(normal, d);
    if (cosPoint <= 0) continue;
    // The window faces into the room: the line leaves through it, against its normal.
    const cosWindow = -dot(rect.normal, d);
    if (cosWindow <= 0) continue;
    if (!clear(cell)) continue;
    lux += (transmittance * sky.luminance(d) * cosPoint * cosWindow * cellArea) / r2;
  }
  if (sky.sun) lux += sunThrough(point, normal, window, sky.sun, clear);
  return lux;
}

/** The sun's beam on the point, if the line towards the sun leaves through this window. */
function sunThrough(
  point: Vec3,
  normal: Vec3,
  window: WindowSource,
  sun: NonNullable<Sky['sun']>,
  clear: (to: Vec3) => boolean,
): number {
  const { rect } = window;
  const cosPoint = dot(normal, sun.direction);
  const towardsWindow = dot(sun.direction, rect.normal);
  if (cosPoint <= 0 || towardsWindow >= 0) return 0;
  const t = dot(subtract(rect.corner, point), rect.normal) / towardsWindow;
  if (t <= 0) return 0;
  const hit = add(point, scale(sun.direction, t));
  const a = dot(subtract(hit, rect.corner), rect.u);
  const b = dot(subtract(hit, rect.corner), rect.v);
  if (a < 0 || a > rect.width || b < 0 || b > rect.height) return 0;
  if (!clear(hit)) return 0;
  return window.transmittance * sun.normalLx * cosPoint;
}

/** Closer than this to a window's plane, in m, a point or patch is in its surface. */
const IN_PLANE_M = 1e-6;

/**
 * Whether a point on a surface facing `normal` is in a window's opening: on
 * the glass, where nobody measures, so the figures leave it out.
 */
export function inWindow(point: Vec3, normal: Vec3, windows: readonly WindowSource[]): boolean {
  return windows.some(({ rect }) => {
    if (dot(normal, rect.normal) < 1 - 1e-9) return false;
    const offset = subtract(point, rect.corner);
    if (Math.abs(dot(offset, rect.normal)) > IN_PLANE_M) return false;
    const [a, b] = [dot(offset, rect.u), dot(offset, rect.v)];
    return a >= 0 && a <= rect.width && b >= 0 && b <= rect.height;
  });
}

/**
 * A room patch with the windows in it taken out of what it reflects: its
 * reflectance times the share of it that's still wall. Light reaching a
 * window leaves the room.
 */
export function withoutOpenings(patch: Patch, windows: readonly WindowSource[]): Patch {
  let open = 0;
  for (const { rect } of windows) {
    if (dot(patch.normal, rect.normal) < 1 - 1e-9) continue;
    if (Math.abs(dot(subtract(patch.centre, rect.corner), rect.normal)) > IN_PLANE_M) continue;
    open += overlapArea(patch, rect);
  }
  if (open === 0) return patch;
  return { ...patch, reflectance: patch.reflectance * Math.max(0, 1 - open / patch.area) };
}

/** The area a patch and a window in the same plane share, in m²: both are rectangles along the window's sides. */
function overlapArea(patch: Patch, rect: WindowRect): number {
  const along = (v: Vec3) => [
    dot(subtract(v, rect.corner), rect.u),
    dot(subtract(v, rect.corner), rect.v),
  ];
  const coords = patch.vertices.map(along);
  const as = coords.map(([a]) => a!);
  const bs = coords.map(([, b]) => b!);
  const width = Math.min(Math.max(...as), rect.width) - Math.max(Math.min(...as), 0);
  const height = Math.min(Math.max(...bs), rect.height) - Math.max(Math.min(...bs), 0);
  return width > 0 && height > 0 ? width * height : 0;
}
