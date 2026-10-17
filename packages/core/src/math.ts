// Small math helpers used across core: plain vectors, clamping and angles.

import type { Vec3 } from './types';

/** Radians per degree. */
export const DEG = Math.PI / 180;

/** An angle in degrees wrapped into [−180, 180). */
export function wrapDeg(deg: number): number {
  return ((((deg + 180) % 360) + 360) % 360) - 180;
}

/** `value` kept within [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** a + b. */
export function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

/** a − b. */
export function subtract(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

/** The dot product a · b. */
export function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/** a × b: the cross product, perpendicular to both by the right-hand rule. */
export function cross(a: Vec3, b: Vec3): Vec3 {
  return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
}

/** v · k: `v` scaled by `k`. */
export function scale(v: Vec3, k: number): Vec3 {
  return { x: v.x * k, y: v.y * k, z: v.z * k };
}

/** |v|: the length of `v`. */
export function length(v: Vec3): number {
  return Math.hypot(v.x, v.y, v.z);
}

/** |a − b|: the distance between two points. */
export function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

/**
 * `v` turned about the x axis by `angleRad`, as three.js turns it: a
 * positive angle takes +y towards +z.
 */
export function rotateX(v: Vec3, angleRad: number): Vec3 {
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);
  return { x: v.x, y: v.y * c - v.z * s, z: v.y * s + v.z * c };
}

/**
 * `v` turned about the vertical (y) axis by `angleRad`, as three.js turns
 * it: a positive angle takes +z towards +x.
 */
export function rotateY(v: Vec3, angleRad: number): Vec3 {
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);
  return { x: v.x * c + v.z * s, y: v.y, z: -v.x * s + v.z * c };
}
