// Pure lighting and camera maths for the viewport. No three.js, so it can be
// unit-tested in Node. See SPEC §6, "Lighting model before IES".

import { add, length, scale } from '../math';
import { beamAngleDeg, totalFlux } from '../photometry/distribution';
import type { Photometry, Product, Room, Vec3 } from '../types';

/**
 * Display exposure at 0 EV. Scenes are lit in real units, so a white wall at
 * 100 lx has a radiance of ~25. This maps typical interiors (100–500 lx) into
 * the tone mapper's range.
 */
export const BASE_EXPOSURE = 0.025;

/** Small constant fill, in lx, so unlit areas are never pure black. */
export const MIN_FILL_LUX = 1.5;

/**
 * The product as the renderer should light it: when it has photometry, flux
 * and beam angle come from the IES file, which is the source of truth (ADR 0033).
 */
export function lightingProduct(product: Product, photometry: Photometry | undefined): Product {
  if (!photometry) return product;
  return { ...product, flux: totalFlux(photometry), beamDeg: beamAngleDeg(photometry) };
}

/** sRGB colour of a blackbody at `kelvin` (Tanner Helland fit), brightest channel = 1. */
export function kelvinToRgb(kelvin: number): { r: number; g: number; b: number } {
  const t = Math.min(40000, Math.max(1000, kelvin)) / 100;
  const r = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592);
  const g =
    t <= 66
      ? 99.4708025861 * Math.log(t) - 161.1195681661
      : 288.1221695283 * Math.pow(t - 60, -0.0755148492);
  const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  const [cr, cg, cb] = [r, g, b].map((v) => Math.min(255, Math.max(0, v)));
  const max = Math.max(cr!, cg!, cb!);
  return { r: cr! / max, g: cg! / max, b: cb! / max };
}

/**
 * Uniform indirect illuminance in lx from the integrating-sphere formula
 * E = Φ·ρ̄ / (A·(1 − ρ̄)), where ρ̄ is the area-weighted mean reflectance.
 */
export function indirectIlluminance(flux: number, room: Room): number {
  const floorArea = room.width * room.depth;
  const wallArea = 2 * (room.width + room.depth) * room.height;
  const area = 2 * floorArea + wallArea;
  const { floor, ceiling, walls } = room.surfaces;
  const rho =
    (floorArea * (floor.reflectance + ceiling.reflectance) + wallArea * walls.reflectance) / area;
  return (flux * rho) / (area * (1 - rho));
}

/** Tone-mapping exposure for a user exposure in EV stops. */
export function toneMappingExposure(ev: number): number {
  return BASE_EXPOSURE * Math.pow(2, ev);
}

/** Preset camera views. */
export type ViewName = 'perspective' | 'top' | 'front' | 'side';

/** Extra room around the framed room, as a factor of the fitting distance. */
export const FRAME_MARGIN = 1.05;

/** Viewing direction (from target towards camera) for each preset, not normalised. */
const VIEW_DIRECTIONS: Record<ViewName, Vec3> = {
  perspective: { x: 0.5, y: 0.48, z: 0.74 },
  // A tiny z component keeps OrbitControls' up vector well defined when looking straight down.
  top: { x: 0, y: 1, z: 0.001 },
  front: { x: 0, y: 0.1, z: 1 },
  side: { x: 1, y: 0.1, z: 0 },
};

/**
 * Camera position and look-at target that fit the whole room in view. The
 * room's bounding sphere (radius = half its diagonal) must fit the narrower of
 * the vertical and horizontal fields of view: distance = r / sin(fov / 2).
 */
export function viewPose(
  view: ViewName,
  room: Room,
  aspect: number,
  verticalFovDeg: number,
): { position: Vec3; target: Vec3 } {
  const { width, depth, height } = room;
  const radius = 0.5 * Math.hypot(width, depth, height);
  const verticalFov = (verticalFovDeg * Math.PI) / 180;
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect);
  const distance = (radius / Math.sin(Math.min(verticalFov, horizontalFov) / 2)) * FRAME_MARGIN;

  const direction = VIEW_DIRECTIONS[view];
  const target = { x: 0, y: height / 2, z: 0 };
  return { target, position: add(target, scale(direction, distance / length(direction))) };
}
