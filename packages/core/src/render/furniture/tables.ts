// Tables and work surfaces: a coffee table, a home-office desk and a kitchen
// island. They share the dining table's language: solid tops, slim tapered
// legs inset from the edges, and fronts read as parts through GAP reveals.

import * as THREE from 'three/webgpu';
import type { PieceBuilder } from './pieces';
import { FINISHES } from '../../furniture-kinds';
import {
  GAP,
  legCorners,
  material,
  panel,
  PANEL_THICKNESS,
  taperedLeg,
  TOP_THICKNESS,
} from './style';

/** Height of a slim bar pull, in m. */
const PULL_HEIGHT = 0.012;
/** How far a pull stands proud of its front, in m. */
const PULL_DEPTH = 0.016;

/** A slim horizontal pull whose back touches the front surface at z = `frontZ`. */
function pull(
  length: number,
  mat: THREE.Material,
  [x, y, frontZ]: readonly [number, number, number],
): THREE.Mesh {
  return panel(length, PULL_HEIGHT, PULL_DEPTH, mat, [x, y, frontZ + PULL_DEPTH / 2]);
}

// --- Coffee table -----------------------------------------------------------

/** Coffee-table legs sit this far in from the top's edges, in m (the dining table uses 0.085). */
const COFFEE_LEG_INSET = 0.075;
const COFFEE_LEG = { top: 0.021, bottom: 0.013 };
/** Height of the lower shelf's underside above the floor, in m. */
const SHELF_LIFT = 0.09;
const SHELF_THICKNESS = 0.02;
/** How far the shelf runs past the legs' centres, so they pass through it, in m. */
const SHELF_PAST_LEGS = 0.03;

/**
 * A low living-room table: a solid top on four slim tapered legs, and a lower
 * shelf in the accent wood a few centimetres above the floor, which the legs
 * pass through. `main` is the top and legs, `accent` the shelf.
 */
export const coffeeTable: PieceBuilder = ({ width, depth, height }, { main, accent }) => {
  const wood = material(main);
  const group = new THREE.Group();
  group.add(panel(width, TOP_THICKNESS, depth, wood, [0, height - TOP_THICKNESS / 2, 0]));
  for (const corner of legCorners(width, depth, COFFEE_LEG_INSET)) {
    group.add(taperedLeg(height - TOP_THICKNESS, wood, corner, COFFEE_LEG));
  }
  const shelfWidth = width - 2 * (COFFEE_LEG_INSET - SHELF_PAST_LEGS);
  const shelfDepth = depth - 2 * (COFFEE_LEG_INSET - SHELF_PAST_LEGS);
  const shelfY = SHELF_LIFT + SHELF_THICKNESS / 2;
  group.add(panel(shelfWidth, SHELF_THICKNESS, shelfDepth, material(accent), [0, shelfY, 0]));
  return group;
};

// --- Desk -------------------------------------------------------------------

/** Desk legs sit this far in from the top's edges, like the dining table's, in m. */
const DESK_LEG_INSET = 0.085;
const DESK_LEG = { top: 0.022, bottom: 0.014 };
/** The oak apron joining the legs on the sides and back, in m. */
const DESK_APRON_HEIGHT = 0.06;
const DESK_APRON_THICKNESS = 0.02;
const DESK_APRON_INSET = 0.075;
/** Drawer box under the top: about this share of the desk's width, within limits, in m. */
const DRAWER_SHARE = 0.36;
const DRAWER_MIN_WIDTH = 0.38;
const DRAWER_MAX_WIDTH = 0.6;
const DRAWER_HEIGHT = 0.1;
const DRAWER_DEPTH = 0.45;
/** How far the drawer box's front sits back from the top's front edge, in m. */
const DRAWER_SETBACK = 0.04;
/** The drawer's pull: about a fifth of the front, in m. */
const DESK_PULL_LENGTH = 0.11;

/**
 * A calm home-office desk: a white top on tapered oak legs joined by an apron
 * at the sides and back, with a shallow white drawer box under the top at the
 * front. `main` is the top and drawer, `accent` the legs, apron and pull.
 */
export const desk: PieceBuilder = ({ width, depth, height }, { main, accent }) => {
  const white = material(main);
  const wood = material(accent);
  const group = new THREE.Group();
  const topY = height - TOP_THICKNESS;
  group.add(panel(width, TOP_THICKNESS, depth, white, [0, topY + TOP_THICKNESS / 2, 0]));
  for (const corner of legCorners(width, depth, DESK_LEG_INSET)) {
    group.add(taperedLeg(topY, wood, corner, DESK_LEG));
  }
  group.add(deskApron(width, depth, topY, wood));
  const drawerWidth = THREE.MathUtils.clamp(
    width * DRAWER_SHARE,
    DRAWER_MIN_WIDTH,
    DRAWER_MAX_WIDTH,
  );
  const frontZ = depth / 2 - DRAWER_SETBACK;
  group.add(drawerBox(drawerWidth, topY, frontZ, white, wood));
  return group;
};

/** The apron on the desk's sides and back; the front stays open for the knees and drawer. */
function deskApron(width: number, depth: number, topY: number, wood: THREE.Material): THREE.Group {
  const apron = new THREE.Group();
  const y = topY - DESK_APRON_HEIGHT / 2;
  const innerW = width - 2 * DESK_APRON_INSET;
  const innerD = depth - 2 * DESK_APRON_INSET;
  apron.add(panel(innerW, DESK_APRON_HEIGHT, DESK_APRON_THICKNESS, wood, [0, y, -innerD / 2]));
  for (const side of [-1, 1]) {
    apron.add(
      panel(DESK_APRON_THICKNESS, DESK_APRON_HEIGHT, innerD, wood, [(side * innerW) / 2, y, 0]),
    );
  }
  return apron;
}

/**
 * The drawer box hanging under the top: a carcass whose sides and bottom frame
 * a drawer front, with a GAP reveal all round it and a small pull.
 */
function drawerBox(
  width: number,
  topY: number,
  frontZ: number,
  white: THREE.Material,
  pullMat: THREE.Material,
): THREE.Group {
  const box = new THREE.Group();
  const centreY = topY - DRAWER_HEIGHT / 2;
  const centreZ = frontZ - DRAWER_DEPTH / 2;
  // Sides and bottom form the frame; the drawer front is set inside them.
  for (const side of [-1, 1]) {
    const x = side * (width / 2 - PANEL_THICKNESS / 2);
    box.add(panel(PANEL_THICKNESS, DRAWER_HEIGHT, DRAWER_DEPTH, white, [x, centreY, centreZ]));
  }
  const innerWidth = width - 2 * PANEL_THICKNESS;
  const bottomY = topY - DRAWER_HEIGHT + PANEL_THICKNESS / 2;
  box.add(panel(innerWidth, PANEL_THICKNESS, DRAWER_DEPTH, white, [0, bottomY, centreZ]));
  // A recessed body behind the front, so the reveal reads as depth rather than a slot.
  const bodyHeight = DRAWER_HEIGHT - PANEL_THICKNESS;
  const bodyY = topY - bodyHeight / 2;
  const bodyDepth = DRAWER_DEPTH - 2 * PANEL_THICKNESS;
  box.add(panel(innerWidth, bodyHeight, bodyDepth, white, [0, bodyY, centreZ - PANEL_THICKNESS]));
  const front = { width: innerWidth - 2 * GAP, height: bodyHeight - 2 * GAP };
  const frontY = topY - GAP - front.height / 2;
  box.add(
    panel(front.width, front.height, PANEL_THICKNESS, white, [
      0,
      frontY,
      frontZ - PANEL_THICKNESS / 2,
    ]),
  );
  box.add(pull(DESK_PULL_LENGTH, pullMat, [0, frontY, frontZ]));
  return box;
}

// --- Kitchen island ---------------------------------------------------------

const WORKTOP_THICKNESS = 0.04;
/** The worktop overhangs the cabinet body: a little at the front and ends, in m. */
const WORKTOP_OVERHANG = 0.02;
/** …and more at the back, where stools tuck in, in m. */
const WORKTOP_BACK_OVERHANG = 0.1;
/** The recessed toe-kick plinth, in m. */
const PLINTH_HEIGHT = 0.1;
const PLINTH_SETBACK = 0.06;
/** About one cabinet module (a drawer over a door) per this width, in m. */
const MODULE_WIDTH = 0.55;
/** Height of the top drawer row, including its share of the reveals, in m. */
const DRAWER_ROW_HEIGHT = 0.18;
/** Pulls run along this share of a front's width, up to a maximum, in m. */
const PULL_SHARE = 0.35;
const PULL_MAX_LENGTH = 0.18;
/** How far a door's pull sits below its top edge, in m. */
const DOOR_PULL_DROP = 0.05;

/**
 * A kitchen island: a white cabinet body with a drawer row over doors, all
 * separated by GAP reveals, on a recessed charcoal toe-kick, under a
 * concrete worktop that overhangs more at the back for stools. Modules adapt
 * to the width. `main` is the cabinet, `accent` the worktop.
 */
export const kitchenIsland: PieceBuilder = ({ width, depth, height }, { main, accent }) => {
  const white = material(main);
  const group = new THREE.Group();
  const body = {
    width: width - 2 * WORKTOP_OVERHANG,
    depth: depth - WORKTOP_OVERHANG - WORKTOP_BACK_OVERHANG,
    bottom: PLINTH_HEIGHT,
    top: height - WORKTOP_THICKNESS,
  };
  const bodyZ = (WORKTOP_BACK_OVERHANG - WORKTOP_OVERHANG) / 2;
  const worktopY = height - WORKTOP_THICKNESS / 2;
  group.add(panel(width, WORKTOP_THICKNESS, depth, material(accent), [0, worktopY, 0]));
  const plinth = material(FINISHES.charcoal);
  const plinthSize = [body.width - 2 * PLINTH_SETBACK, body.depth - 2 * PLINTH_SETBACK] as const;
  group.add(
    panel(plinthSize[0], PLINTH_HEIGHT, plinthSize[1], plinth, [0, PLINTH_HEIGHT / 2, bodyZ]),
  );
  // The carcass stops a front's thickness short, so the fronts finish flush with its sides.
  const carcassDepth = body.depth - PANEL_THICKNESS;
  const bodyHeight = body.top - body.bottom;
  const carcassY = body.bottom + bodyHeight / 2;
  group.add(
    panel(body.width, bodyHeight, carcassDepth, white, [0, carcassY, bodyZ - PANEL_THICKNESS / 2]),
  );
  group.add(islandFronts(body, bodyZ + body.depth / 2, white));
  return group;
};

/** The cabinet body's extent, in m. */
interface CabinetBody {
  readonly width: number;
  readonly bottom: number;
  readonly top: number;
}

/** The island's drawer and door fronts with their pulls, the front face at z = `frontZ`. */
function islandFronts(body: CabinetBody, frontZ: number, white: THREE.Material): THREE.Group {
  const fronts = new THREE.Group();
  const pullMat = material(FINISHES.metal);
  const modules = Math.max(1, Math.round(body.width / MODULE_WIDTH));
  const pitch = body.width / modules;
  const frontWidth = pitch - GAP;
  const z = frontZ - PANEL_THICKNESS / 2;
  const pullLength = Math.min(PULL_MAX_LENGTH, frontWidth * PULL_SHARE);
  // Reveals under the worktop and between the rows; the plinth's shadow closes the bottom.
  const drawerTop = body.top - GAP;
  const drawerHeight = DRAWER_ROW_HEIGHT - GAP;
  const doorTop = drawerTop - drawerHeight - GAP;
  const doorHeight = doorTop - body.bottom;
  for (let i = 0; i < modules; i++) {
    const x = -body.width / 2 + pitch * (i + 0.5);
    const drawerY = drawerTop - drawerHeight / 2;
    fronts.add(panel(frontWidth, drawerHeight, PANEL_THICKNESS, white, [x, drawerY, z]));
    fronts.add(pull(pullLength, pullMat, [x, drawerY, frontZ]));
    fronts.add(
      panel(frontWidth, doorHeight, PANEL_THICKNESS, white, [x, doorTop - doorHeight / 2, z]),
    );
    fronts.add(pull(pullLength, pullMat, [x, doorTop - DOOR_PULL_DROP, frontZ]));
  }
  return fronts;
}
