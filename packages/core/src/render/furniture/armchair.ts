// The armchair: the sofa's single-seat sibling, so its heights and parts match sofa.ts.

import * as THREE from 'three/webgpu';
import type { PieceBuilder } from './pieces';
import { cushion, GAP, legCorners, material, taperedLeg } from './style';

const ARMCHAIR_LEG_HEIGHT = 0.1;
/** How far the legs sit in from the base's edges, in m (as the sofa's). */
const ARMCHAIR_LEG_INSET = 0.08;
/** The upholstered base the cushions rest on, in m. */
const ARMCHAIR_BASE_HEIGHT = 0.18;
/** A little slimmer than the sofa's arms, so one seat between them still feels generous. */
const ARMCHAIR_ARM_WIDTH = 0.15;
const ARMCHAIR_ARM_TOP = 0.62;
const ARMCHAIR_BACK_THICKNESS = 0.17;
const ARMCHAIR_SEAT_HEIGHT = 0.13;
const ARMCHAIR_SEAT_DOME = 0.018;
const ARMCHAIR_BACK_CUSHION_THICKNESS = 0.16;
const ARMCHAIR_BACK_CUSHION_DOME = 0.03;
/** The back cushion leans back a little, in radians. */
const ARMCHAIR_BACK_LEAN = 0.14;
/** How far the back cushion rises above the back frame, in m. */
const ARMCHAIR_BACK_CUSHION_RISE = 0.005;

/** The sofa's upholstered shell: base, two arms and the back frame. */
function armchairShell(
  { width, depth, height }: { width: number; depth: number; height: number },
  fabric: THREE.Material,
): THREE.Mesh[] {
  const baseY = ARMCHAIR_LEG_HEIGHT + ARMCHAIR_BASE_HEIGHT / 2;
  const armHeight = ARMCHAIR_ARM_TOP - ARMCHAIR_LEG_HEIGHT;
  const backHeight = height - ARMCHAIR_LEG_HEIGHT;
  const parts = [cushion(width, ARMCHAIR_BASE_HEIGHT, depth, fabric, [0, baseY, 0], 0)];
  for (const side of [-1, 1]) {
    const x = side * (width / 2 - ARMCHAIR_ARM_WIDTH / 2);
    const armY = ARMCHAIR_LEG_HEIGHT + armHeight / 2;
    parts.push(cushion(ARMCHAIR_ARM_WIDTH, armHeight, depth, fabric, [x, armY, 0], 0.006));
  }
  const backZ = -depth / 2 + ARMCHAIR_BACK_THICKNESS / 2;
  const backY = ARMCHAIR_LEG_HEIGHT + backHeight / 2;
  const inner = width - 2 * ARMCHAIR_ARM_WIDTH;
  parts.push(cushion(inner, backHeight, ARMCHAIR_BACK_THICKNESS, fabric, [0, backY, backZ], 0));
  return parts;
}

/** The loose seat and back cushions between the arms. */
function armchairCushions(
  { width, depth, height }: { width: number; depth: number; height: number },
  fabric: THREE.Material,
): THREE.Mesh[] {
  const inner = width - 2 * ARMCHAIR_ARM_WIDTH;
  const cushionWidth = inner - 2 * GAP;
  const seatDepth = depth - ARMCHAIR_BACK_THICKNESS - GAP;
  const seatY = ARMCHAIR_LEG_HEIGHT + ARMCHAIR_BASE_HEIGHT + ARMCHAIR_SEAT_HEIGHT / 2;
  const seatTop = seatY + ARMCHAIR_SEAT_HEIGHT / 2;
  const seat = cushion(
    cushionWidth,
    ARMCHAIR_SEAT_HEIGHT,
    seatDepth,
    fabric,
    [0, seatY, depth / 2 - seatDepth / 2],
    ARMCHAIR_SEAT_DOME,
  );
  // Built lying flat so its dome faces the sitter once stood up, then leaned back.
  const backHeight = height - seatTop + ARMCHAIR_BACK_CUSHION_RISE;
  const back = cushion(
    cushionWidth,
    ARMCHAIR_BACK_CUSHION_THICKNESS,
    backHeight,
    fabric,
    [0, 0, 0],
    ARMCHAIR_BACK_CUSHION_DOME,
  );
  back.rotation.x = Math.PI / 2 - ARMCHAIR_BACK_LEAN;
  back.position.set(
    0,
    seatTop + backHeight / 2 - 0.01,
    -depth / 2 + ARMCHAIR_BACK_THICKNESS + ARMCHAIR_BACK_CUSHION_THICKNESS / 2 - 0.02,
  );
  return [seat, back];
}

/**
 * A lounge armchair, the single-seat sibling of the sofa: short tapered wooden
 * legs, an upholstered base, arms and back frame, and one loose seat and back
 * cushion. `main` is the upholstery, `accent` the legs.
 */
export const armchair: PieceBuilder = (size, { main, accent }) => {
  const fabric = material(main);
  const wood = material(accent);
  const group = new THREE.Group();
  for (const corner of legCorners(size.width, size.depth, ARMCHAIR_LEG_INSET)) {
    group.add(taperedLeg(ARMCHAIR_LEG_HEIGHT, wood, corner, { top: 0.018, bottom: 0.012 }));
  }
  group.add(...armchairShell(size, fabric), ...armchairCushions(size, fabric));
  return group;
};
