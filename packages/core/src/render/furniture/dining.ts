import * as THREE from 'three/webgpu';
import type { PieceBuilder } from './pieces';
import {
  bend,
  cushion,
  legCorners,
  material,
  panel,
  softSlab,
  solid,
  taperedLeg,
  TOP_THICKNESS,
} from './style';

/** Depth of the apron frame under a table top, in m. */
const APRON_HEIGHT = 0.07;
const APRON_THICKNESS = 0.02;
/** How far the apron sits in from the top's edges, in m. */
const APRON_INSET = 0.07;

/** A dining table: a solid top on four tapered legs, joined by a slim apron. */
export const diningTable: PieceBuilder = ({ width, depth, height }, { main }) => {
  const wood = material(main);
  const group = new THREE.Group();
  group.add(panel(width, TOP_THICKNESS, depth, wood, [0, height - TOP_THICKNESS / 2, 0]));
  const legHeight = height - TOP_THICKNESS;
  for (const corner of legCorners(width, depth, 0.085)) {
    group.add(taperedLeg(legHeight, wood, corner, { top: 0.024, bottom: 0.015 }));
  }
  const apronY = height - TOP_THICKNESS - APRON_HEIGHT / 2;
  const innerWidth = width - 2 * APRON_INSET;
  const innerDepth = depth - 2 * APRON_INSET;
  for (const side of [-1, 1]) {
    group.add(
      panel(innerWidth, APRON_HEIGHT, APRON_THICKNESS, wood, [0, apronY, (side * innerDepth) / 2]),
    );
    group.add(
      panel(APRON_THICKNESS, APRON_HEIGHT, innerDepth, wood, [(side * innerWidth) / 2, apronY, 0]),
    );
  }
  return group;
};

const SEAT_HEIGHT = 0.46;
const SEAT_THICKNESS = 0.024;
const SEAT_PAD = 0.035;
/** The backrest is bent like plywood around this radius, in m. */
const BACK_RADIUS = 0.36;
const BACKREST_HEIGHT = 0.11;
const CHAIR_APRON = 0.05;
/** Legs lean out a little at the floor, in radians. */
const SPLAY = 0.035;

/**
 * A Scandinavian dining chair: an upholstered seat on an apron frame, slightly
 * splayed tapered legs, and rear legs rising to a bent backrest that sits
 * flush with their tops. `main` is the wood, `accent` the seat upholstery.
 */
export const chair: PieceBuilder = ({ width, depth, height }, { main, accent }) => {
  const wood = material(main);
  const fabric = material(accent);
  const group = new THREE.Group();
  const inset = 0.03;
  const frameTop = SEAT_HEIGHT - SEAT_PAD;

  // Seat board and its padded cushion.
  group.add(panel(width, SEAT_THICKNESS, depth, wood, [0, frameTop - SEAT_THICKNESS / 2, 0]));
  group.add(
    cushion(
      width - 0.012,
      SEAT_PAD,
      depth - 0.012,
      fabric,
      [0, frameTop + SEAT_PAD / 2, 0.002],
      0.01,
    ),
  );

  // Apron under the seat, between the legs.
  const apronY = frameTop - SEAT_THICKNESS - CHAIR_APRON / 2;
  const innerW = width - 2 * inset;
  const innerD = depth - 2 * inset;
  for (const side of [-1, 1]) {
    group.add(panel(innerW, CHAIR_APRON, 0.018, wood, [0, apronY, (side * innerD) / 2]));
    group.add(panel(0.018, CHAIR_APRON, innerD, wood, [(side * innerW) / 2, apronY, 0]));
  }

  // Front legs to the seat, rear legs up to the backrest; all splay outwards at the floor.
  const legTop = frameTop - SEAT_THICKNESS;
  const rearHeight = height;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const rear = sz < 0;
      const legHeight = rear ? rearHeight : legTop;
      const leg = taperedLeg(legHeight, wood, [0, 0], { top: 0.016, bottom: 0.011 });
      // Pivot at the leg's top so it stays under the seat while its foot moves out.
      const pivot = new THREE.Group();
      pivot.position.set(sx * (width / 2 - inset), legHeight, sz * (depth / 2 - inset));
      leg.position.y = -legHeight / 2;
      pivot.add(leg);
      pivot.rotation.set(-sz * SPLAY, 0, sx * SPLAY);
      group.add(pivot);
    }
  }
  const backrest = solid(
    bend(softSlab(width + 0.01, BACKREST_HEIGHT, 0.02, 0.008), BACK_RADIUS),
    wood,
  );
  // Bowed forwards between the rear legs: its ends meet the legs, its top flush with theirs.
  const halfSpan = width / 2 - inset;
  const bow = (halfSpan * halfSpan) / (2 * BACK_RADIUS);
  backrest.position.set(0, rearHeight - BACKREST_HEIGHT / 2, -depth / 2 + inset + bow);
  group.add(backrest);
  return group;
};
