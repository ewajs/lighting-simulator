import * as THREE from 'three/webgpu';
import type { PieceBuilder } from './pieces';
import { cushion, GAP, legCorners, material, taperedLeg } from './style';

const LEG_HEIGHT = 0.1;
/** The upholstered base the cushions rest on, in m. */
const BASE_HEIGHT = 0.18;
const ARM_WIDTH = 0.17;
const ARM_TOP = 0.62;
const BACK_THICKNESS = 0.17;
const SEAT_CUSHION_HEIGHT = 0.13;
const BACK_CUSHION_THICKNESS = 0.16;
/** Back cushions lean back a little, in radians. */
const BACK_LEAN = 0.14;
/** Back cushions rise this far above the back, in m, so they read as loose and soft. */
const BACK_CUSHION_RISE = 0.005;
/** About one seat per this width, in m. */
const SEAT_WIDTH = 0.65;

/** A modern sofa: short wooden legs, upholstered base and arms, loose seat and back cushions. */
export const sofa: PieceBuilder = ({ width, depth, height }, { main, accent }) => {
  const fabric = material(main);
  const wood = material(accent);
  const group = new THREE.Group();

  for (const corner of legCorners(width, depth, 0.08)) {
    group.add(taperedLeg(LEG_HEIGHT, wood, corner, { top: 0.018, bottom: 0.012 }));
  }
  const baseY = LEG_HEIGHT + BASE_HEIGHT / 2;
  group.add(cushion(width, BASE_HEIGHT, depth, fabric, [0, baseY, 0], 0));

  const armHeight = ARM_TOP - LEG_HEIGHT;
  for (const side of [-1, 1]) {
    const x = side * (width / 2 - ARM_WIDTH / 2);
    group.add(
      cushion(ARM_WIDTH, armHeight, depth, fabric, [x, LEG_HEIGHT + armHeight / 2, 0], 0.006),
    );
  }
  const inner = width - 2 * ARM_WIDTH;
  const backHeight = height - LEG_HEIGHT;
  group.add(
    cushion(
      inner,
      backHeight,
      BACK_THICKNESS,
      fabric,
      [0, LEG_HEIGHT + backHeight / 2, -depth / 2 + BACK_THICKNESS / 2],
      0,
    ),
  );

  const seats = Math.max(1, Math.round(inner / SEAT_WIDTH));
  const seatWidth = (inner - (seats + 1) * GAP) / seats;
  const seatDepth = depth - BACK_THICKNESS - GAP;
  const seatY = LEG_HEIGHT + BASE_HEIGHT + SEAT_CUSHION_HEIGHT / 2;
  const backCushionHeight = height - (seatY + SEAT_CUSHION_HEIGHT / 2) + BACK_CUSHION_RISE;
  for (let i = 0; i < seats; i++) {
    const x = -inner / 2 + GAP + seatWidth / 2 + i * (seatWidth + GAP);
    group.add(
      cushion(
        seatWidth,
        SEAT_CUSHION_HEIGHT,
        seatDepth,
        fabric,
        [x, seatY, depth / 2 - seatDepth / 2],
        0.018,
      ),
    );
    // Built lying flat so its dome faces the sitter once stood up, then leaned back.
    const back = cushion(
      seatWidth,
      BACK_CUSHION_THICKNESS,
      backCushionHeight,
      fabric,
      [0, 0, 0],
      0.03,
    );
    back.rotation.x = Math.PI / 2 - BACK_LEAN;
    back.position.set(
      x,
      seatY + SEAT_CUSHION_HEIGHT / 2 + backCushionHeight / 2 - 0.01,
      -depth / 2 + BACK_THICKNESS + BACK_CUSHION_THICKNESS / 2 - 0.02,
    );
    group.add(back);
  }
  return group;
};
