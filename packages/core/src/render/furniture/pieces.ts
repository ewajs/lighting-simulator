// The type every furniture builder shares (ADR 0047).

import type * as THREE from 'three/webgpu';
import type { Finish } from '../../furniture-kinds';
import type { FurnitureSize } from '../../types';

/** A piece's outer size, in m: width along x, depth along z, height along y. */
export type PieceSize = FurnitureSize;

/** A piece's finishes: `main` for its body or upholstery, `accent` for legs, frame or pot. */
export interface PieceFinishes {
  readonly main: Finish;
  readonly accent: Finish;
}

/**
 * Builds one piece at a size, in its finishes. The origin is the centre of
 * its footprint on the floor and +z its front (see style.ts).
 */
export type PieceBuilder = (size: PieceSize, finishes: PieceFinishes) => THREE.Group;
