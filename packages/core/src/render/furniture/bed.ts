// The bed: an oak frame, an upholstered headboard and soft bedding.

import * as THREE from 'three/webgpu';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { PieceBuilder } from './pieces';
import { FINISHES } from '../../furniture-kinds';
import {
  cushion,
  GAP,
  legCorners,
  material,
  panel,
  PANEL_THICKNESS,
  solid,
  taperedLeg,
} from './style';

/** Height of the oak side and foot rails, in m: the legs take up any change in the bed's height. */
const RAIL_HEIGHT = 0.105;
/** Shortest leg, for very low beds, in m. */
const MIN_LEG_HEIGHT = 0.04;
/** Legs sit further in than a table's, under the frame's rails, in m. */
const BED_LEG_INSET = 0.09;
/** Radii of the legs at the frame and at the floor, in m: a little sturdier than a sofa's. */
const LEG_TOP_RADIUS = 0.022;
const LEG_FOOT_RADIUS = 0.014;
/** Thickness of the oak side and foot rails, in m. */
const RAIL_THICKNESS = 0.03;
/** Thickness of the oak back plate the headboard's channels are fixed to, in m. */
const BACK_PLATE_THICKNESS = 0.03;
/** The oak plate shows around the channels by this much, in m. */
const BACK_PLATE_REVEAL = 0.025;
/** Depth of the upholstered headboard channels, in m. */
const CHANNEL_THICKNESS = 0.07;
/** About one headboard channel per this width, in m. */
const CHANNEL_WIDTH = 0.27;
/** How far each channel's face domes out, in m: well filled, so the channels read. */
const CHANNEL_DOME = 0.02;
/** The headboard rises this far above the bedding, in m (≈ 1.00 m on a standard bed). */
const HEADBOARD_RISE = 0.5;
const MATTRESS_THICKNESS = 0.24;
/** A mattress's top is only just crowned, in m. */
const MATTRESS_DOME = 0.008;
/** The mattress sits this far down inside the frame's rails, in m. */
const MATTRESS_SINK = 0.03;
const DUVET_THICKNESS = 0.035;
/** Share of the mattress's length the duvet covers, from the foot. */
const DUVET_SHARE = 0.68;
/** How far the duvet hangs down the mattress's sides and foot, in m. */
const DUVET_DRAPE = 0.17;
/** The duvet stands off the mattress's sides by this much, as a filled duvet does, in m. */
const DUVET_LOFT = 0.018;
/** Radius of the duvet's edges: a filled duvet rounds over the mattress, in m. */
const DUVET_RADIUS = 0.045;
/** Depth of the folded-back band at the duvet's head end, in m. */
const FOLD_DEPTH = 0.24;
const FOLD_THICKNESS = 0.03;
/** Radius of the fold's edges: crisper than the duvet's, like a pressed fold, in m. */
const FOLD_RADIUS = 0.025;
/** A throw across the foot of the bed, in m. */
const THROW_DEPTH = 0.42;
const THROW_THICKNESS = 0.012;
/** How far the throw's fold sits in from the duvet's foot edge, in m. */
const THROW_INSET = 0.1;
/** Pillow sizes, in m: a standard 50 × 70 cm pillow, filled. */
const PILLOW_WIDTH = 0.7;
const PILLOW_DEPTH = 0.46;
const PILLOW_THICKNESS = 0.15;
/** Edge radius of a pillow, as a share of its thickness: nearly round, like a filled case. */
const PILLOW_EDGE_SHARE = 0.45;
/** Share of the pillow's half-thickness left at its rim, on top and underneath. */
const PILLOW_RIM_SHARE = 0.4;
const PILLOW_BASE_SHARE = 0.8;
/** How much a pillow's sides draw in at their middles, as a share of its size. */
const PILLOW_WAIST = 0.05;
/** Pillows are propped against the headboard at this angle from flat, in radians. */
const PILLOW_TILT = 0.85;
/** Space between and beside the pillows, in m. */
const PILLOW_MARGIN = 0.05;
/** Pillows press into the mattress and the headboard by this much, in m. */
const PILLOW_SETTLE = 0.02;

/** Where the bed's layers sit, worked out once from its size. */
interface BedLayout {
  readonly width: number;
  readonly depth: number;
  readonly height: number;
  /** z of the headboard channels' front face. */
  readonly headFront: number;
  readonly mattressTop: number;
  /** Top of the frame's rails, and the height of its legs below them. */
  readonly railTop: number;
  readonly legHeight: number;
  readonly mattressWidth: number;
  /** z of the mattress's head and foot ends. */
  readonly mattressHead: number;
  readonly mattressFoot: number;
}

/** Lays the bed out from its size: the bedding sets the mattress, which sets the frame. */
function bedLayout(width: number, depth: number, height: number): BedLayout {
  const headFront = -depth / 2 + BACK_PLATE_THICKNESS + CHANNEL_THICKNESS;
  const mattressTop = height - DUVET_THICKNESS;
  const railTop = mattressTop - MATTRESS_THICKNESS + MATTRESS_SINK;
  return {
    width,
    depth,
    height,
    headFront,
    mattressTop,
    railTop,
    legHeight: Math.max(MIN_LEG_HEIGHT, railTop - RAIL_HEIGHT),
    mattressWidth: width - 2 * (RAIL_THICKNESS + GAP),
    mattressHead: headFront + GAP,
    mattressFoot: depth / 2 - RAIL_THICKNESS - GAP,
  };
}

/** The oak base: four tapered legs, side and foot rails, and a hidden deck under the mattress. */
function bedFrame(bed: BedLayout, wood: THREE.Material): THREE.Mesh[] {
  const parts = legCorners(bed.width, bed.depth, BED_LEG_INSET).map((corner) =>
    taperedLeg(bed.legHeight, wood, corner, { top: LEG_TOP_RADIUS, bottom: LEG_FOOT_RADIUS }),
  );
  const railHeight = bed.railTop - bed.legHeight;
  const railY = bed.legHeight + railHeight / 2;
  const back = -bed.depth / 2 + BACK_PLATE_THICKNESS;
  const railLength = bed.depth / 2 - back;
  for (const side of [-1, 1]) {
    const x = side * (bed.width / 2 - RAIL_THICKNESS / 2);
    parts.push(
      panel(RAIL_THICKNESS, railHeight, railLength, wood, [x, railY, back + railLength / 2]),
    );
  }
  const footWidth = bed.width - 2 * RAIL_THICKNESS;
  parts.push(
    panel(footWidth, railHeight, RAIL_THICKNESS, wood, [
      0,
      railY,
      bed.depth / 2 - RAIL_THICKNESS / 2,
    ]),
  );
  // The deck the mattress rests on, so the bed never looks hollow from low angles.
  const deckY = bed.railTop - MATTRESS_SINK - PANEL_THICKNESS / 2;
  parts.push(
    panel(footWidth, PANEL_THICKNESS, railLength, wood, [0, deckY, back + railLength / 2]),
  );
  return parts;
}

/** An oak back plate with upholstered vertical channels in front of it. */
function headboard(bed: BedLayout, wood: THREE.Material, fabric: THREE.Material): THREE.Mesh[] {
  const top = bed.height + HEADBOARD_RISE;
  const plateHeight = top - bed.legHeight;
  const plateZ = -bed.depth / 2 + BACK_PLATE_THICKNESS / 2;
  const parts = [
    panel(bed.width, plateHeight, BACK_PLATE_THICKNESS, wood, [
      0,
      bed.legHeight + plateHeight / 2,
      plateZ,
    ]),
  ];
  const inner = bed.width - 2 * BACK_PLATE_REVEAL;
  const count = Math.max(2, Math.round(inner / CHANNEL_WIDTH));
  const channelWidth = (inner - (count - 1) * GAP) / count;
  // The channels start where the mattress hides them and stop short of the plate's top.
  const bottom = bed.mattressTop - MATTRESS_THICKNESS / 2;
  const channelHeight = top - BACK_PLATE_REVEAL - bottom;
  const z = -bed.depth / 2 + BACK_PLATE_THICKNESS + CHANNEL_THICKNESS / 2;
  for (let i = 0; i < count; i++) {
    const x = -inner / 2 + channelWidth / 2 + i * (channelWidth + GAP);
    // Built lying flat so the dome faces the room once stood up.
    const channel = cushion(
      channelWidth,
      CHANNEL_THICKNESS,
      channelHeight,
      fabric,
      [0, 0, 0],
      CHANNEL_DOME,
    );
    channel.rotation.x = Math.PI / 2;
    channel.position.set(x, bottom + channelHeight / 2, z);
    parts.push(channel);
  }
  return parts;
}

/** How far a hanging edge flares out at its hem, in m. */
const DRAPE_FLARE = 0.012;
/** How much a layer of bedding puffs up in its middle, in m. */
const BEDDING_PUFF = 0.02;

/**
 * Softens a box of bedding: its top (the `thickness` m nearest the top) puffs
 * up in the middle, and its sides flare out a little towards the hem, as a
 * filled duvet falling over a mattress's edge does. The head end (−z) lies on
 * the mattress, so only the sides and the foot flare.
 */
function drape(geometry: THREE.BufferGeometry, thickness: number): THREE.BufferGeometry {
  geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox!;
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);
    const u = x / max.x;
    const v = z / max.z;
    const out = DRAPE_FLARE * ((max.y - y) / (max.y - min.y)) ** 2;
    const inTop = THREE.MathUtils.clamp((y - (max.y - thickness)) / thickness, 0, 1);
    const puff = BEDDING_PUFF * inTop * Math.max(0, 1 - u * u) * Math.max(0, 1 - v * v);
    positions.setXYZ(i, x + out * u, y + puff, z + out * Math.max(0, v));
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** Where one layer of bedding lies, in m. */
interface BeddingLayer {
  /** Height of its top face. */
  readonly top: number;
  readonly thickness: number;
  /** How far it hangs below its top face, down the sides and foot. */
  readonly hang: number;
  /** z of its head and foot ends. */
  readonly head: number;
  readonly foot: number;
  /** How far it stands off the mattress's sides. */
  readonly loft: number;
  /** Radius of its edges, so a layer over another follows its curve. */
  readonly radius: number;
}

/** A layer of bedding over the mattress, as one softened box hiding the mattress inside it. */
function bedding(bed: BedLayout, mat: THREE.Material, layer: BeddingLayer): THREE.Mesh {
  const width = bed.mattressWidth + 2 * layer.loft;
  const height = layer.thickness + layer.hang;
  const depth = layer.foot - layer.head;
  const geometry = new RoundedBoxGeometry(width, height, depth, 6, layer.radius);
  const mesh = solid(drape(geometry, layer.thickness), mat);
  mesh.position.set(0, layer.top - height / 2, (layer.head + layer.foot) / 2);
  return mesh;
}

/** The duvet over the foot of the bed, with its top folded back and a throw across its foot. */
function duvetLayers(
  bed: BedLayout,
  mattressDepth: number,
): [duvet: BeddingLayer, fold: BeddingLayer, throwLayer: BeddingLayer] {
  const duvet: BeddingLayer = {
    top: bed.mattressTop + DUVET_THICKNESS,
    thickness: DUVET_THICKNESS,
    hang: DUVET_DRAPE,
    head: bed.mattressFoot - mattressDepth * DUVET_SHARE,
    foot: bed.mattressFoot + DUVET_LOFT,
    loft: DUVET_LOFT,
    radius: DUVET_RADIUS,
  };
  // A layer lying on the duvet wraps it: it grows by its thickness all round. A
  // smaller radius than the duvet's plus its thickness still clears the duvet, with a crisper edge.
  const over = (thickness: number, head: number, foot: number, radius: number): BeddingLayer => ({
    top: duvet.top + thickness,
    thickness,
    hang: duvet.hang + thickness,
    head,
    foot,
    loft: duvet.loft + thickness,
    radius,
  });
  const throwFoot = duvet.foot - THROW_INSET;
  return [
    duvet,
    over(FOLD_THICKNESS, duvet.head - FOLD_THICKNESS / 2, duvet.head + FOLD_DEPTH, FOLD_RADIUS),
    over(THROW_THICKNESS, throwFoot - THROW_DEPTH, throwFoot, duvet.radius + THROW_THICKNESS),
  ];
}

/** The mattress, the duvet with its folded-back band, and a throw across the foot. */
function mattressAndBedding(
  bed: BedLayout,
  fabric: THREE.Material,
  white: THREE.Material,
  throwFabric: THREE.Material,
): THREE.Mesh[] {
  const mattressDepth = bed.mattressFoot - bed.mattressHead;
  const mattress = cushion(
    bed.mattressWidth,
    MATTRESS_THICKNESS,
    mattressDepth,
    white,
    [0, bed.mattressTop - MATTRESS_THICKNESS / 2, (bed.mattressHead + bed.mattressFoot) / 2],
    MATTRESS_DOME,
  );
  const [duvet, fold, throwLayer] = duvetLayers(bed, mattressDepth);
  return [
    mattress,
    bedding(bed, fabric, duvet),
    bedding(bed, fabric, fold),
    bedding(bed, throwFabric, throwLayer),
  ];
}

/** A filled pillow, lying flat: domed on both faces, its corners thinner than its middle. */
function pillowGeometry(width: number, thickness: number, depth: number): THREE.BufferGeometry {
  const geometry = new RoundedBoxGeometry(
    width,
    thickness,
    depth,
    6,
    thickness * PILLOW_EDGE_SHARE,
  );
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < positions.count; i++) {
    const u = positions.getX(i) / (width / 2);
    const v = positions.getZ(i) / (depth / 2);
    // 1 in the middle, 0 at the edges: the filling gathers in the centre. The
    // underside rests on the bed, so it stays flatter than the top.
    const fill = Math.sqrt(Math.max(0, 1 - u * u) * Math.max(0, 1 - v * v));
    const y = positions.getY(i);
    const keep = y > 0 ? PILLOW_RIM_SHARE : PILLOW_BASE_SHARE;
    // The sides draw in at their middles, leaving the corners as soft points.
    const x = positions.getX(i) * (1 - PILLOW_WAIST * Math.max(0, 1 - v * v));
    const z = positions.getZ(i) * (1 - PILLOW_WAIST * Math.max(0, 1 - u * u));
    positions.setXYZ(i, x, y * (keep + (1 - keep) * fill), z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** One pillow per sleeper, propped against the headboard and pressed into the mattress. */
function pillows(bed: BedLayout, mat: THREE.Material): THREE.Mesh[] {
  const space = bed.mattressWidth - PILLOW_MARGIN;
  const count = Math.max(1, Math.round(space / (PILLOW_WIDTH + PILLOW_MARGIN)));
  const width = Math.min(PILLOW_WIDTH, space / count - PILLOW_MARGIN);
  const parts: THREE.Mesh[] = [];
  for (let i = 0; i < count; i++) {
    // Tilted in the geometry, so its bounds say where it touches the mattress and headboard.
    const geometry = pillowGeometry(width, PILLOW_THICKNESS, PILLOW_DEPTH).rotateX(PILLOW_TILT);
    geometry.computeBoundingBox();
    const { min } = geometry.boundingBox!;
    const pillow = solid(geometry, mat);
    const x = (i - (count - 1) / 2) * (width + PILLOW_MARGIN);
    pillow.position.set(
      x,
      bed.mattressTop - PILLOW_SETTLE - min.y,
      bed.headFront - PILLOW_SETTLE - min.z,
    );
    parts.push(pillow);
  }
  return parts;
}

/**
 * A calm modern bed: an oak frame on short tapered legs, an upholstered
 * channelled headboard on an oak plate, a white mattress, a duvet with a
 * folded-back band over the foot two-thirds, a slate throw and two pillows.
 * `main` is the upholstery and bedding, `accent` the wood. `height` is the
 * top of the bedding; the headboard rises HEADBOARD_RISE above it.
 */
export const bed: PieceBuilder = ({ width, depth, height }, { main, accent }) => {
  const fabric = material(main);
  const wood = material(accent);
  const white = material(FINISHES.white);
  const throwFabric = material(FINISHES.slate);
  const layout = bedLayout(width, depth, height);
  const group = new THREE.Group();
  group.add(
    ...bedFrame(layout, wood),
    ...headboard(layout, wood, fabric),
    ...mattressAndBedding(layout, fabric, white, throwFabric),
    ...pillows(layout, white),
  );
  return group;
};
