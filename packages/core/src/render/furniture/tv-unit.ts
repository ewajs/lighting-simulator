// The TV unit: a low walnut credenza with a 55" TV on a stand.

import * as THREE from 'three/webgpu';
import type { PieceBuilder } from './pieces';
import { FINISHES } from '../../furniture-kinds';
import { GAP, LEG_INSET, legCorners, material, panel, PANEL_THICKNESS, taperedLeg } from './style';

/** Height of the credenza's legs, in m: enough to see the floor under it. */
const CREDENZA_LEG_HEIGHT = 0.15;
/** About one door or drawer column per this width, in m. */
const CREDENZA_MODULE = 0.5;
/** Thickness of doors and drawer fronts, in m. */
const FRONT_THICKNESS = 0.018;
/**
 * How far the dark panel behind the fronts sits behind them, in m: the
 * reveals between fronts then read as shadow lines, like a real cabinet's.
 */
const REVEAL_DEPTH = 0.01;
/** Thickness of that dark panel, in m. */
const SHADOW_PANEL_THICKNESS = 0.004;

/** A 55" 16:9 television's screen size, in m (1.40 m diagonal). */
const TV_WIDTH = 1.23;
const TV_HEIGHT = 0.71;
/** Thickness of the screen panel, in m: a modern OLED. */
const TV_THICKNESS = 0.012;
/** Thickness of the cover glass on the screen's face, in m. */
const GLASS_THICKNESS = 0.002;
/** Width of the bezel around the glass, in m. */
const TV_BEZEL = 0.006;
/** The electronics box on the back of the screen: width, height and depth, in m. */
const TV_BACK = { width: 0.8, height: 0.36, depth: 0.03 } as const;
/** Height of the screen's bottom edge above its stand's foot, in m. */
const TV_LIFT = 0.07;
/** The stand's foot plate (width, thickness, depth) and its neck (width, depth), in m. */
const TV_FOOT = { width: 0.36, height: 0.01, depth: 0.22 } as const;
const TV_NECK = { width: 0.07, depth: 0.025 } as const;
/** Roughness of the screen glass: glossier than the charcoal bezel, so it mirrors the room. */
const SCREEN_ROUGHNESS = 0.12;

/** A credenza body's size and its inner opening, in m. */
interface CabinetBox {
  readonly width: number;
  readonly depth: number;
  /** Bottom and top of the body, above the legs. */
  readonly bottomY: number;
  readonly topY: number;
  /** Width and height of the opening inside the panels, and how many columns divide it. */
  readonly innerWidth: number;
  readonly innerHeight: number;
  readonly modules: number;
  readonly moduleWidth: number;
}

/** The x of a module's centre. */
function moduleX(box: CabinetBox, i: number): number {
  return -box.innerWidth / 2 + box.moduleWidth / 2 + i * (box.moduleWidth + PANEL_THICKNESS);
}

/** The credenza's carcass: top, bottom, sides and a divider between each column. */
function credenzaCarcass(box: CabinetBox, wood: THREE.Material): THREE.Object3D[] {
  const t = PANEL_THICKNESS;
  const { width, depth, bottomY, topY, innerHeight } = box;
  const midY = (bottomY + topY) / 2;
  const parts = [
    panel(width, t, depth, wood, [0, topY - t / 2, 0]),
    panel(width, t, depth, wood, [0, bottomY + t / 2, 0]),
    ...[-1, 1].map((side) =>
      panel(t, innerHeight, depth, wood, [side * (width / 2 - t / 2), midY, 0]),
    ),
  ];
  for (let i = 1; i < box.modules; i++) {
    const x = moduleX(box, i) - box.moduleWidth / 2 - t / 2;
    parts.push(panel(t, innerHeight, depth, wood, [x, midY, 0]));
  }
  return parts;
}

/** Doors in the end columns, pairs of drawers between them, all set in with a GAP reveal. */
function credenzaFronts(
  box: CabinetBox,
  wood: THREE.Material,
  shadow: THREE.Material,
): THREE.Object3D[] {
  const { innerWidth, innerHeight, depth } = box;
  const midY = (box.bottomY + box.topY) / 2;
  const frontZ = depth / 2 - FRONT_THICKNESS / 2;
  const shadowZ = depth / 2 - FRONT_THICKNESS - REVEAL_DEPTH - SHADOW_PANEL_THICKNESS / 2;
  const parts = [
    panel(innerWidth, innerHeight, SHADOW_PANEL_THICKNESS, shadow, [0, midY, shadowZ]),
  ];
  const frontWidth = box.moduleWidth - 2 * GAP;
  for (let i = 0; i < box.modules; i++) {
    const x = moduleX(box, i);
    const isEnd = i === 0 || i === box.modules - 1;
    if (isEnd) {
      parts.push(
        panel(frontWidth, innerHeight - 2 * GAP, FRONT_THICKNESS, wood, [x, midY, frontZ]),
      );
      continue;
    }
    const drawerHeight = (innerHeight - 3 * GAP) / 2;
    for (const side of [-1, 1]) {
      const y = midY + side * (drawerHeight / 2 + GAP / 2);
      parts.push(panel(frontWidth, drawerHeight, FRONT_THICKNESS, wood, [x, y, frontZ]));
    }
  }
  return parts;
}

/** A 55" television on a pedestal stand, its foot centred on the origin. */
function television(): THREE.Group {
  const bezel = material(FINISHES.charcoal);
  const glass = material(FINISHES.charcoal);
  glass.roughness = SCREEN_ROUGHNESS;
  const stand = material(FINISHES.metal);
  const group = new THREE.Group();
  const screenY = TV_FOOT.height + TV_LIFT + TV_HEIGHT / 2;
  // Front to back: the screen, its electronics box, then the neck centred over the foot.
  const backZ = TV_NECK.depth / 2 + TV_BACK.depth / 2;
  const screenZ = backZ + TV_BACK.depth / 2 + TV_THICKNESS / 2;
  const backY = TV_FOOT.height + TV_LIFT + TV_BACK.height / 2;
  const neckHeight = TV_LIFT + TV_BACK.height / 2;
  group.add(
    panel(TV_FOOT.width, TV_FOOT.height, TV_FOOT.depth, stand, [0, TV_FOOT.height / 2, 0]),
    panel(TV_NECK.width, neckHeight, TV_NECK.depth, stand, [0, TV_FOOT.height + neckHeight / 2, 0]),
    panel(TV_BACK.width, TV_BACK.height, TV_BACK.depth, bezel, [0, backY, backZ]),
    panel(TV_WIDTH, TV_HEIGHT, TV_THICKNESS, bezel, [0, screenY, screenZ]),
    panel(TV_WIDTH - 2 * TV_BEZEL, TV_HEIGHT - 2 * TV_BEZEL, GLASS_THICKNESS, glass, [
      0,
      screenY,
      screenZ + TV_THICKNESS / 2,
    ]),
  );
  return group;
}

/**
 * A low TV credenza: a cabinet on short tapered `accent` legs, its front
 * divided into columns of ~0.5 m (doors at the ends, drawer pairs between),
 * and a 55" television on a pedestal stand centred on top. The size is the
 * cabinet's; the television stands above it.
 */
export const tvUnit: PieceBuilder = ({ width, depth, height }, { main, accent }) => {
  const wood = material(main);
  const legs = material(accent);
  const group = new THREE.Group();
  const innerWidth = width - 2 * PANEL_THICKNESS;
  const modules = Math.max(1, Math.round(width / CREDENZA_MODULE));
  const box: CabinetBox = {
    width,
    depth,
    bottomY: CREDENZA_LEG_HEIGHT,
    topY: height,
    innerWidth,
    innerHeight: height - CREDENZA_LEG_HEIGHT - 2 * PANEL_THICKNESS,
    modules,
    moduleWidth: (innerWidth - (modules - 1) * PANEL_THICKNESS) / modules,
  };
  group.add(...credenzaCarcass(box, wood));
  group.add(...credenzaFronts(box, wood, material(FINISHES.charcoal)));
  for (const corner of legCorners(width, depth, LEG_INSET)) {
    group.add(taperedLeg(CREDENZA_LEG_HEIGHT, legs, corner, { top: 0.022, bottom: 0.014 }));
  }
  const tv = television();
  tv.position.y = height;
  group.add(tv);
  return group;
};
