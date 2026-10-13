// Framed artwork for a wall. Unlike floor pieces, its origin is the centre
// of its back face, on the wall, and +z points into the room.

import * as THREE from 'three/webgpu';
import type { PieceBuilder } from './pieces';
import { type Finish, FINISHES } from '../../furniture-kinds';
import { material, panel, solid } from './style';

/** Face width of the frame's moulding, in m: constant at any size. */
const FRAME_FACE = 0.022;
/** The canvas's front sits this far behind the frame's front, in m. */
const CANVAS_RECESS = 0.008;
const CANVAS_THICKNESS = 0.006;
/** Shapes stand proud of the canvas by this much, each layer a little more, in m. */
const RELIEF = 0.0025;
/** Blank margin around the composition, as a share of the canvas's shorter side. */
const MARGIN_SHARE = 0.16;
/** Curve segments for the circle and arch, enough to look round at arm's length. */
const CURVE_SEGMENTS = 48;
/** The moulding's edges are eased by this much, in m, to catch a line of light. */
const FRAME_BEVEL = 0.0015;

/** A shape in the composition's units and the finish it is painted in. */
interface Motif {
  readonly shape: THREE.Shape;
  readonly finish: Finish;
}

/** An axis-aligned rectangle from its centre and size. */
function rectangle(x: number, y: number, width: number, height: number): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(x - width / 2, y - height / 2);
  shape.lineTo(x + width / 2, y - height / 2);
  shape.lineTo(x + width / 2, y + height / 2);
  shape.lineTo(x - width / 2, y + height / 2);
  shape.closePath();
  return shape;
}

/** A round-topped arch standing on (x, bottom). */
function arch(x: number, bottom: number, width: number, height: number): THREE.Shape {
  const radius = width / 2;
  const shoulder = bottom + height - radius;
  const shape = new THREE.Shape();
  shape.moveTo(x - radius, bottom);
  shape.lineTo(x + radius, bottom);
  shape.lineTo(x + radius, shoulder);
  shape.absarc(x, shoulder, radius, 0, Math.PI, false);
  shape.closePath();
  return shape;
}

/**
 * The composition, in an area `width` × `height` centred on the origin: a slate
 * column, a terracotta sun setting behind an oak horizon, and a green arch
 * standing on it. Numbers are shares of the area: places scale with its width
 * and height, sizes with its shorter side `s`, so the circle and arch stay
 * round. Later motifs lie on top of earlier ones.
 */
function composition(width: number, height: number): Motif[] {
  const s = Math.min(width, height);
  const horizon = -0.22 * height;
  const band = 0.07 * s;
  const sunRadius = 0.27 * s;
  // A setting sun: partly below the horizon band, which is laid over it.
  const sun = new THREE.Shape();
  sun.absarc(-0.24 * width, horizon + 0.55 * sunRadius, sunRadius, 0, Math.PI * 2, false);
  return [
    { shape: rectangle(0.27 * width, 0, 0.3 * s, height), finish: FINISHES.slate },
    { shape: sun, finish: FINISHES.terracotta },
    { shape: rectangle(-0.04 * width, horizon, 0.92 * width, band), finish: FINISHES.oak },
    { shape: arch(0.03 * width, horizon + band / 2, 0.24 * s, 0.6 * s), finish: FINISHES.leaf },
  ];
}

/** The walnut moulding: a rectangle with a rectangular opening, extruded to the frame's depth. */
function frameGeometry(width: number, height: number, depth: number): THREE.BufferGeometry {
  const outer = rectangle(0, 0, width, height);
  outer.holes.push(rectangle(0, 0, width - 2 * FRAME_FACE, height - 2 * FRAME_FACE));
  // The bevel adds to the extrusion on both faces, so extrude less to keep the depth.
  return new THREE.ExtrudeGeometry(outer, {
    depth: depth - 2 * FRAME_BEVEL,
    bevelEnabled: true,
    bevelThickness: FRAME_BEVEL,
    bevelSize: FRAME_BEVEL,
    bevelSegments: 2,
  }).translate(0, 0, FRAME_BEVEL);
}

/**
 * A framed abstract artwork in a mid-century palette: a slim moulding around a
 * recessed canvas, and flat shapes standing just proud of it. `main` is the
 * frame, `accent` the canvas. Its origin is the centre of its back face, on
 * the wall, with +z out into the room; `depth` is how far it stands off the wall.
 */
export const artwork: PieceBuilder = ({ width, depth, height }, { main, accent }) => {
  const group = new THREE.Group();
  group.add(solid(frameGeometry(width, height, depth), material(main)));
  const innerWidth = width - 2 * FRAME_FACE;
  const innerHeight = height - 2 * FRAME_FACE;
  const canvasFront = depth - CANVAS_RECESS;
  group.add(
    panel(innerWidth, innerHeight, CANVAS_THICKNESS, material(accent), [
      0,
      0,
      canvasFront - CANVAS_THICKNESS / 2,
    ]),
  );
  const margin = MARGIN_SHARE * Math.min(innerWidth, innerHeight);
  composition(innerWidth - 2 * margin, innerHeight - 2 * margin).forEach(({ shape, finish }, i) => {
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: RELIEF * (i + 1),
      bevelEnabled: false,
      curveSegments: CURVE_SEGMENTS,
    });
    const mesh = solid(geometry, material(finish));
    mesh.position.z = canvasFront;
    group.add(mesh);
  });
  return group;
};
