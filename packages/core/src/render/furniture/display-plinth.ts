// The display plinth: a gallery block with a sculpture to light.

import * as THREE from 'three/webgpu';
import type { PieceBuilder } from './pieces';
import { FINISHES } from '../../furniture-kinds';
import { material, panel, type ProfilePoint, turned } from './style';

/** Height of the plinth's recessed base, in m. */
const PLINTH_BASE_HEIGHT = 0.04;
/** How far the base sits in from the block's faces, in m: the shadow gap that lifts it off the floor. */
const PLINTH_BASE_INSET = 0.02;
/** A tall sculptural vase: an ovoid body drawn in to a small neck. */
const SCULPTURE_PROFILE: readonly ProfilePoint[] = [
  [0, 0],
  [0.5, 0],
  [0.55, 0.015],
  [0.86, 0.2],
  [1, 0.42],
  [0.93, 0.62],
  [0.62, 0.82],
  [0.38, 0.93],
  [0.4, 1],
  [0.32, 1],
  [0.3, 0.92],
];
/** The sculpture's radius and height as shares of the plinth top's smaller side. */
const SCULPTURE_RADIUS_SHARE = 0.22;
const SCULPTURE_HEIGHT_SHARE = 0.72;

/**
 * A gallery display plinth: a crisp block in `main` floating on a recessed
 * shadow-gap base, with a sculptural vase in `accent` on top to light.
 */
export const displayPlinth: PieceBuilder = ({ width, depth, height }, { main, accent }) => {
  const group = new THREE.Group();
  const blockHeight = height - PLINTH_BASE_HEIGHT;
  group.add(panel(width, blockHeight, depth, material(main), [0, height - blockHeight / 2, 0]));
  // Dark, like the shadow a real recess holds, so the block floats in any light.
  const baseWidth = width - 2 * PLINTH_BASE_INSET;
  const baseDepth = depth - 2 * PLINTH_BASE_INSET;
  const base = material(FINISHES.charcoal);
  group.add(panel(baseWidth, PLINTH_BASE_HEIGHT, baseDepth, base, [0, PLINTH_BASE_HEIGHT / 2, 0]));
  const side = Math.min(width, depth);
  const sculpture = turned(
    SCULPTURE_PROFILE,
    side * SCULPTURE_RADIUS_SHARE,
    side * SCULPTURE_HEIGHT_SHARE,
    material(accent),
  );
  sculpture.position.y = height;
  group.add(sculpture);
  return group;
};
