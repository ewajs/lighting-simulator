// The furniture's shared design language: one calm, modern family, like an
// architect's clay model with real materials. Every piece is built from these
// helpers and constants, so proportions, edges and finishes match.
//
// Style guide (read before adding a piece):
// - Units are metres. The piece's origin is the centre of its footprint on the
//   floor (y = 0 is the floor); +z is its front, the side people face or sit on.
// - No sharp boxes. Panels and tops use `panel()`, with EDGE_RADIUS; anything
//   upholstered uses `cushion()`, softer and slightly domed. Parts that are
//   bent or shaped start from `softSlab()`; round vessels use `turned()`.
// - Legs are `taperedLeg()` (wood, round, narrowing towards the floor) or
//   `metalLeg()` (thin, square, charcoal). Inset legs LEG_INSET from the edges.
// - Gaps between cushions, doors and drawers are GAP: they make pieces read
//   as made of parts.
// - Parametric: when the size changes, parts keep their thickness and move;
//   nothing is stretched. Counts adapt (e.g. one seat cushion per ~0.65 m).
// - Finishes come from FINISHES (furniture-kinds.ts) only, so the palette
//   stays coordinated.

import * as THREE from 'three/webgpu';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Finish } from '../../furniture-kinds';

/** Edge radius of hard panels and tops, in m: just enough to catch a highlight. */
export const EDGE_RADIUS = 0.006;
/** Edge radius of cushions, in m. */
export const CUSHION_RADIUS = 0.035;
/** Gap between parts (cushions, doors, drawers), in m. */
export const GAP = 0.008;
/** How far legs sit in from a top's edges, in m. */
export const LEG_INSET = 0.06;
/** Thickness of tables' and desks' tops, in m. */
export const TOP_THICKNESS = 0.03;
/** Thickness of cabinet and shelf panels, in m. */
export const PANEL_THICKNESS = 0.018;

/** A standard material for a finish. Callers own it and dispose of it. */
export function material(
  finish: Finish,
  side: THREE.Side = THREE.FrontSide,
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: finish.color,
    roughness: finish.roughness,
    metalness: finish.metalness,
    side,
  });
}

/** A mesh that casts and receives shadows, as all furniture does. */
export function solid(geometry: THREE.BufferGeometry, mat: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * A hard panel or top with softened edges, centred at (x, y, z).
 * Width along x, height along y, depth along z.
 */
export function panel(
  width: number,
  height: number,
  depth: number,
  mat: THREE.Material,
  [x, y, z]: readonly [number, number, number],
): THREE.Mesh {
  const radius = Math.min(EDGE_RADIUS, width / 2, height / 2, depth / 2);
  const mesh = solid(new RoundedBoxGeometry(width, height, depth, 2, radius), mat);
  mesh.position.set(x, y, z);
  return mesh;
}

/** Segments along each flat face of a soft slab, so it can be bent smoothly. */
const SLAB_FACE_SEGMENTS = 10;
/** Segments around each rounded edge of a soft slab. */
const SLAB_CORNER_SEGMENTS = 4;

/**
 * A rounded box like RoundedBoxGeometry, but with its flat faces subdivided
 * so that it can be bent and shaped smoothly (RoundedBoxGeometry's faces are
 * one quad each). Centred on the origin, vertices shared so normals are smooth.
 */
export function softSlab(
  width: number,
  height: number,
  depth: number,
  radius: number,
): THREE.BufferGeometry {
  const r = Math.min(radius, width / 2, height / 2, depth / 2);
  const total = 2 * SLAB_CORNER_SEGMENTS + SLAB_FACE_SEGMENTS;
  const box = new THREE.BoxGeometry(2, 2, 2, total, total, total);
  const inner = [width / 2 - r, height / 2 - r, depth / 2 - r];
  const flat = SLAB_FACE_SEGMENTS / total;
  const positions = box.getAttribute('position') as THREE.BufferAttribute;
  const point = new THREE.Vector3();
  const centre = new THREE.Vector3();
  for (let i = 0; i < positions.count; i++) {
    point.fromBufferAttribute(positions, i);
    // Per axis: the flat middle maps linearly onto the inner box, the outer
    // segments become the corner's progress around the radius.
    for (let axis = 0; axis < 3; axis++) {
      const g = point.getComponent(axis);
      const reach = Math.min(Math.abs(g) / flat, 1);
      centre.setComponent(axis, Math.sign(g) * reach * inner[axis]!);
      const around = Math.max(0, (Math.abs(g) - flat) / (1 - flat));
      point.setComponent(axis, Math.sign(g) * around);
    }
    point.normalize().multiplyScalar(r).add(centre);
    positions.setXYZ(i, point.x, point.y, point.z);
  }
  box.deleteAttribute('normal');
  box.deleteAttribute('uv');
  const geometry = mergeVertices(box);
  box.dispose();
  return geometry;
}

/**
 * An upholstered cushion, centred at (x, y, z): very round edges and a top
 * that domes up by `dome` m in the middle, like a filled cushion.
 */
export function cushion(
  width: number,
  height: number,
  depth: number,
  mat: THREE.Material,
  [x, y, z]: readonly [number, number, number],
  dome = 0.012,
): THREE.Mesh {
  const geometry = softSlab(width, height, depth, CUSHION_RADIUS);
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < positions.count; i++) {
    const vy = positions.getY(i);
    if (vy <= 0) continue;
    const u = positions.getX(i) / (width / 2);
    const v = positions.getZ(i) / (depth / 2);
    // Most at the centre of the top, nothing at its edges.
    const lift = dome * (vy / (height / 2)) * Math.max(0, 1 - u * u) * Math.max(0, 1 - v * v);
    positions.setY(i, vy + lift);
  }
  geometry.computeVertexNormals();
  const mesh = solid(geometry, mat);
  mesh.position.set(x, y, z);
  return mesh;
}

/** A round wooden leg standing on the floor at (x, z), narrowing towards the floor. */
export function taperedLeg(
  height: number,
  mat: THREE.Material,
  [x, z]: readonly [number, number],
  { top = 0.02, bottom = 0.013 } = {},
): THREE.Mesh {
  const mesh = solid(new THREE.CylinderGeometry(top, bottom, height, 20), mat);
  mesh.position.set(x, height / 2, z);
  return mesh;
}

/** A thin square metal leg standing on the floor at (x, z). */
export function metalLeg(
  height: number,
  mat: THREE.Material,
  [x, z]: readonly [number, number],
  size = 0.018,
): THREE.Mesh {
  return panel(size, height, size, mat, [x, height / 2, z]);
}

/** The four leg positions under a top of this size, inset LEG_INSET from its edges. */
export function legCorners(width: number, depth: number, inset = LEG_INSET): [number, number][] {
  const x = width / 2 - inset;
  const z = depth / 2 - inset;
  return [
    [-x, -z],
    [x, -z],
    [-x, z],
    [x, z],
  ];
}

/**
 * Bends a geometry built flat in the xy plane (or a thin panel) into an arc
 * curving towards −z as |x| grows, like bent plywood: radius `radius` m.
 * It moves vertices, so the geometry needs them along x: use `softSlab()`.
 */
export function bend<T extends THREE.BufferGeometry>(geometry: T, radius: number): T {
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    positions.setZ(i, positions.getZ(i) - (x * x) / (2 * radius));
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** A profile point for a turned object, as shares of its radius and height. */
export type ProfilePoint = readonly [radiusShare: number, heightShare: number];

/** Segments around a turned object: smooth at the sizes it is seen. */
const LATHE_SEGMENTS = 48;

/** A round object turned on a lathe from a profile, standing on y = 0: vases, bowls, pots. */
export function turned(
  profile: readonly ProfilePoint[],
  radius: number,
  height: number,
  mat: THREE.Material,
): THREE.Mesh {
  const points = profile.map(([r, y]) => new THREE.Vector2(r * radius, y * height));
  return solid(new THREE.LatheGeometry(points, LATHE_SEGMENTS), mat);
}

/** Frees every geometry and material under a piece. */
export function disposePiece(root: THREE.Object3D): void {
  const materials = new Set<THREE.Material>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    (object.geometry as THREE.BufferGeometry).dispose();
    for (const mat of [object.material as THREE.Material | THREE.Material[]].flat())
      materials.add(mat);
  });
  materials.forEach((mat) => mat.dispose());
}
