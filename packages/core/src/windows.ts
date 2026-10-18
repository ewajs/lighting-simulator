// Windows: glazed openings in a wall or the ceiling (ADR 0078). Plain data and
// pure functions, as the other scene items are: where a window can be, how it
// changes, and the rectangle it opens, for the picture and the calculation.

import type {
  GlazingKind,
  Room,
  RoomWindow,
  Scene,
  Vec3,
  WindowCovering,
  WindowSurface,
} from './types';
import { assertFinite, assertPositive } from './validate';

/** Every surface a window can be in, walls first. */
export const WINDOW_SURFACES: readonly WindowSurface[] = [
  'wall-x-',
  'wall-x+',
  'wall-z-',
  'wall-z+',
  'ceiling',
];

/** The kinds of window offered to add, each a starting size and place. */
export type WindowPreset = 'window' | 'tall-window' | 'skylight';

/** A preset's surface, size and, on a wall, sill height: the bottom edge's, in m. */
export interface WindowType {
  readonly surface: WindowSurface;
  readonly width: number;
  readonly height: number;
  /** On a wall, how high the bottom edge is; ignored in the ceiling. */
  readonly sill: number;
}

/**
 * The presets, in the catalog's order: a usual window over a sill, a tall
 * window down to the floor, and a skylight. Sizes are typical residential
 * ones; a wall window starts on the back wall, which the default camera faces.
 */
export const WINDOW_TYPES: Readonly<Record<WindowPreset, WindowType>> = {
  window: { surface: 'wall-z-', width: 1.2, height: 1.2, sill: 0.9 },
  'tall-window': { surface: 'wall-z-', width: 1.8, height: 2.1, sill: 0.1 },
  skylight: { surface: 'ceiling', width: 0.9, height: 0.9, sill: 0 },
};

/**
 * How much visible light each glass lets through at normal incidence, and
 * whether it scatters it. Typical values for double glazing: clear about
 * 0.8, tinted 0.4–0.6, acid-etched or sandblasted about 0.7 (manufacturers'
 * data sheets; e.g. EN 410 visible transmittance).
 */
export const GLAZINGS: Readonly<
  Record<GlazingKind, { readonly transmittance: number; readonly diffusing: boolean }>
> = {
  clear: { transmittance: 0.8, diffusing: false },
  tinted: { transmittance: 0.5, diffusing: false },
  frosted: { transmittance: 0.7, diffusing: true },
};

/**
 * What each covering lets through of what the glass does, and whether it
 * scatters it: a sheer curtain about 0.6, a closed blind little (light from
 * its slats' edges and gaps). Rough, for design, not a product's data.
 */
export const COVERINGS: Readonly<
  Record<WindowCovering, { readonly transmittance: number; readonly diffusing: boolean }>
> = {
  none: { transmittance: 1, diffusing: false },
  sheer: { transmittance: 0.6, diffusing: true },
  blind: { transmittance: 0.1, diffusing: true },
};

/** A window keeps this far from its surface's edges, in m: a wall needs some wall around it. */
export const WINDOW_MARGIN_M = 0.05;
/** The smallest window side, in m. */
export const MIN_WINDOW_SIDE_M = 0.2;
/** How far beside its source a copied window lands, along its surface, beyond its own width, in m. */
const DUPLICATE_GAP_M = 0.2;

/**
 * The rectangle a window opens, in the room: a corner and the two directions
 * its sides run along (`u` for width, `v` for height), unit vectors, and the
 * normal pointing into the room.
 */
export interface WindowRect {
  readonly corner: Vec3;
  readonly u: Vec3;
  readonly v: Vec3;
  readonly width: number;
  readonly height: number;
  readonly normal: Vec3;
}

/**
 * Each surface's frame: the coordinate that's fixed on it (as a function of the
 * room), the directions width and height run along, and its inward normal.
 */
function surfaceFrame(
  surface: WindowSurface,
  room: Room,
): {
  readonly fixed: { readonly axis: 'x' | 'y' | 'z'; readonly value: number };
  readonly u: Vec3;
  readonly v: Vec3;
  readonly normal: Vec3;
  readonly extent: readonly [number, number];
} {
  const [w, d, h] = [room.width / 2, room.depth / 2, room.height];
  switch (surface) {
    case 'wall-x-':
      return { fixed: { axis: 'x', value: -w }, u: Z, v: Y, normal: X, extent: [room.depth, h] };
    case 'wall-x+':
      return { fixed: { axis: 'x', value: w }, u: Z, v: Y, normal: NEG_X, extent: [room.depth, h] };
    case 'wall-z-':
      return { fixed: { axis: 'z', value: -d }, u: X, v: Y, normal: Z, extent: [room.width, h] };
    case 'wall-z+':
      return { fixed: { axis: 'z', value: d }, u: X, v: Y, normal: NEG_Z, extent: [room.width, h] };
    case 'ceiling':
      return {
        fixed: { axis: 'y', value: h },
        u: X,
        v: Z,
        normal: NEG_Y,
        extent: [room.width, room.depth],
      };
  }
}
const X: Vec3 = { x: 1, y: 0, z: 0 };
const Y: Vec3 = { x: 0, y: 1, z: 0 };
const Z: Vec3 = { x: 0, y: 0, z: 1 };
const NEG_X: Vec3 = { x: -1, y: 0, z: 0 };
const NEG_Y: Vec3 = { x: 0, y: -1, z: 0 };
const NEG_Z: Vec3 = { x: 0, y: 0, z: -1 };

/** The window's rectangle in the room (see WindowRect). */
export function windowRect(window: RoomWindow, room: Room): WindowRect {
  const { u, v, normal } = surfaceFrame(window.surface, room);
  const { position: c, width, height } = window;
  return {
    corner: {
      x: c.x - (u.x * width + v.x * height) / 2,
      y: c.y - (u.y * width + v.y * height) / 2,
      z: c.z - (u.z * width + v.z * height) / 2,
    },
    u,
    v,
    width,
    height,
    normal,
  };
}

/**
 * Keeps a window where it can be: on its surface's plane, its sides at least
 * MIN_WINDOW_SIDE_M and no bigger than the surface allows, and the whole of it
 * WINDOW_MARGIN_M inside the surface's edges.
 */
export function constrainWindow(window: RoomWindow, room: Room): RoomWindow {
  const { fixed, u, v, extent } = surfaceFrame(window.surface, room);
  const [extentU, extentV] = extent;
  const fit = (side: number, along: number) =>
    Math.min(Math.max(side, MIN_WINDOW_SIDE_M), Math.max(along - 2 * WINDOW_MARGIN_M, 0));
  const width = fit(window.width, extentU);
  const height = fit(window.height, extentV);
  // Coordinates along u and v, measured from the surface's low edge (walls start at the floor).
  const along = (axis: Vec3) =>
    window.position.x * axis.x + window.position.y * axis.y + window.position.z * axis.z;
  const low = (axis: Vec3, total: number) => (axis === Y ? 0 : -total / 2);
  const clamp = (value: number, half: number, axis: Vec3, total: number) => {
    const min = low(axis, total) + WINDOW_MARGIN_M + half;
    const max = low(axis, total) + total - WINDOW_MARGIN_M - half;
    return min > max ? (min + max) / 2 : Math.min(Math.max(value, min), max);
  };
  const a = clamp(along(u), width / 2, u, extentU);
  const b = clamp(along(v), height / 2, v, extentV);
  const inPlane = { x: u.x * a + v.x * b, y: u.y * a + v.y * b, z: u.z * a + v.z * b };
  const position = { ...inPlane, [fixed.axis]: fixed.value };
  return { ...window, width, height, position };
}

/** The window fields a host may change. Changing `surface` moves it onto that surface. */
export type WindowPatch = Partial<Omit<RoomWindow, 'id'>>;

/**
 * Adds a window of `preset`: on its surface, centred along it, at its sill
 * height on a wall. `patch` overrides any field, e.g. another wall or place.
 */
export function addWindow(
  scene: Scene,
  preset: WindowPreset,
  id: string,
  patch: WindowPatch = {},
): Scene {
  const type = WINDOW_TYPES[preset];
  if (!type) throw new RangeError(`Unknown window preset "${preset}"`);
  const surface = patch.surface ?? type.surface;
  const height = patch.height ?? type.height;
  const centreHeight = surface === 'ceiling' ? scene.room.height : type.sill + height / 2;
  const window = constrainWindow(
    {
      id,
      surface,
      // Centred along its surface; constrainWindow puts it on the surface's plane.
      position: { x: 0, y: centreHeight, z: 0 },
      width: type.width,
      height,
      glazing: 'clear',
      covering: 'none',
      ...patch,
    },
    scene.room,
  );
  assertWindow(window);
  return { ...scene, windows: [...scene.windows, window] };
}

/** Applies `patch` to one window, then keeps it on its surface (see constrainWindow). */
export function updateWindow(scene: Scene, id: string, patch: WindowPatch): Scene {
  const current = scene.windows.find((w) => w.id === id);
  if (!current) throw new Error(`Unknown window "${id}"`);
  const next = { ...current, ...patch };
  assertWindow(next);
  const constrained = constrainWindow(next, scene.room);
  return { ...scene, windows: scene.windows.map((w) => (w.id === id ? constrained : w)) };
}

/** A copy of `source` with id `id`, beside it along its surface, kept on the surface. */
export function copyWindow(source: RoomWindow, id: string, room: Room): RoomWindow {
  const { u } = surfaceFrame(source.surface, room);
  const step = source.width + DUPLICATE_GAP_M;
  const { x, y, z } = source.position;
  return constrainWindow(
    { ...source, id, position: { x: x + u.x * step, y: y + u.y * step, z: z + u.z * step } },
    room,
  );
}

/** Throws a RangeError naming the field if a window isn't valid. */
export function assertWindow(window: RoomWindow): void {
  const name = `window "${window.id}"`;
  if (!WINDOW_SURFACES.includes(window.surface)) {
    throw new RangeError(`${name} has an unknown surface "${window.surface}"`);
  }
  for (const axis of ['x', 'y', 'z'] as const) {
    assertFinite(`${name} position.${axis}`, window.position[axis]);
  }
  assertPositive(`${name} width`, window.width);
  assertPositive(`${name} height`, window.height);
  if (!Object.hasOwn(GLAZINGS, window.glazing)) {
    throw new RangeError(`${name} has an unknown glazing "${window.glazing}"`);
  }
  if (!Object.hasOwn(COVERINGS, window.covering)) {
    throw new RangeError(`${name} has an unknown covering "${window.covering}"`);
  }
}
