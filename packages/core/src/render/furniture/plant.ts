import * as THREE from 'three/webgpu';
import type { PieceBuilder } from './pieces';
import { FINISHES } from '../../furniture-kinds';
import { material, solid, turned } from './style';

const POT_HEIGHT_SHARE = 0.32;
/** Leaves of a snake plant: angle around the stem, lean outwards, share of the height, width. */
const LEAVES: readonly (readonly [
  aroundDeg: number,
  leanDeg: number,
  length: number,
  widthM: number,
])[] = [
  [0, 4, 1, 0.05],
  [52, 9, 0.86, 0.046],
  [104, 6, 0.95, 0.05],
  [151, 12, 0.74, 0.042],
  [203, 7, 0.9, 0.048],
  [248, 13, 0.7, 0.04],
  [297, 5, 0.83, 0.047],
  [330, 15, 0.62, 0.038],
  [80, 17, 0.55, 0.036],
  [180, 18, 0.5, 0.034],
];

/** A tapered pot with a rolled rim, turned on a lathe. */
function pot(radius: number, height: number, mat: THREE.Material): THREE.Mesh {
  // The rim's roll and the foot are fixed sizes in m, whatever the pot's height.
  const at = (m: number) => m / height;
  return turned(
    [
      [0, 0],
      [0.78, 0],
      [0.8, at(0.01)],
      [0.97, 1 - at(0.025)],
      [1, 1 - at(0.01)],
      [0.98, 1],
      [0.9, 1],
      [0.88, 1 - at(0.02)],
    ],
    radius,
    height,
    mat,
  );
}

/** One sword-shaped leaf, standing up the y axis, bowing towards +z. */
function leaf(length: number, width: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.bezierCurveTo(-width * 0.62, length * 0.45, -width * 0.3, length * 0.85, 0, length);
  shape.bezierCurveTo(width * 0.3, length * 0.85, width * 0.62, length * 0.45, width / 2, 0);
  const geometry = new THREE.ShapeGeometry(shape, 16);
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < positions.count; i++) {
    const t = positions.getY(i) / length;
    const x = positions.getX(i);
    // Bow outwards towards the tip, and fold along the midrib.
    positions.setZ(i, 0.06 * length * t * t + Math.abs(x) * 0.35);
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** A snake plant in a pot: upright sword leaves, two greens. `accent` is the pot. */
export const plant: PieceBuilder = ({ width, depth, height }, { accent }) => {
  const group = new THREE.Group();
  const radius = (Math.min(width, depth) / 2) * 0.75;
  const potHeight = height * POT_HEIGHT_SHARE;
  group.add(pot(radius, potHeight, material(accent)));
  const soil = solid(new THREE.CircleGeometry(radius * 0.88, 40), material(FINISHES.soil));
  soil.rotation.x = -Math.PI / 2;
  soil.position.y = potHeight - 0.02;
  group.add(soil);

  const greens = [
    material(FINISHES.leaf, THREE.DoubleSide),
    material(FINISHES.leafLight, THREE.DoubleSide),
  ];
  const leafSpace = height - potHeight + 0.02;
  LEAVES.forEach(([aroundDeg, leanDeg, share, leafWidth], i) => {
    const mesh = solid(leaf(leafSpace * share, leafWidth), greens[i % 2]!);
    const around = THREE.MathUtils.degToRad(aroundDeg);
    mesh.position.set(
      Math.sin(around) * radius * 0.25,
      potHeight - 0.02,
      Math.cos(around) * radius * 0.25,
    );
    mesh.rotation.set(0, around, 0, 'YXZ');
    // Local +z points away from the stem after turning: lean the tip that way.
    mesh.rotateX(THREE.MathUtils.degToRad(leanDeg));
    group.add(mesh);
  });
  return group;
};
