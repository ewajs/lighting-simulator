// The office chair: a calm contemporary task chair.

import * as THREE from 'three/webgpu';
import type { PieceBuilder } from './pieces';
import { FINISHES } from '../../furniture-kinds';
import { material, softSlab, solid } from './style';

/** Top of the seat cushion, in m: a standard desk seat height. */
const OFFICE_SEAT_HEIGHT = 0.47;
const OFFICE_SEAT_THICKNESS = 0.08;
const OFFICE_SEAT_DOME = 0.01;
/** How far the seat's front edge rolls down (waterfall edge), and over what depth, in m. */
const OFFICE_WATERFALL_DROP = 0.03;
const OFFICE_WATERFALL_DEPTH = 0.12;
/** Space beside the seat for each armrest, in m. */
const OFFICE_ARM_ZONE = 0.06;
/** Margin between the seat's front and the footprint's front, in m. */
const OFFICE_SEAT_FRONT_MARGIN = 0.035;
/** Seat depth is the footprint's depth minus this, in m. */
const OFFICE_SEAT_DEPTH_TRIM = 0.16;
const OFFICE_SHELL_THICKNESS = 0.012;
const OFFICE_MECHANISM_HEIGHT = 0.045;
const OFFICE_MECHANISM_SIZE = 0.2;

const OFFICE_BACK_THICKNESS = 0.06;
/** Gap between the seat and the bottom of the backrest, in m. */
const OFFICE_BACK_GAP = 0.07;
/** The backrest is narrower than the seat by this much, in m. */
const OFFICE_BACK_NARROWING = 0.04;
/** The backrest reclines a little, in radians. */
const OFFICE_BACK_LEAN = 0.12;
/** Horizontal wrap of the backrest around the sitter: radius, in m. */
const OFFICE_BACK_WRAP_RADIUS = 0.6;
/** Lumbar support: how far it pushes forward (m), where (share of height), how wide (share). */
const OFFICE_LUMBAR_DEPTH = 0.022;
const OFFICE_LUMBAR_AT = 0.3;
const OFFICE_LUMBAR_SPREAD = 0.22;
const OFFICE_BACK_DOME = 0.01;
/** The backrest narrows to this share of its width at the bottom, reaching full width at the shoulders. */
const OFFICE_BACK_WAIST = 0.86;
const OFFICE_BACK_SHOULDER_AT = 0.65;

/** Top of the armrest pads above the seat, in m. */
const OFFICE_ARM_RISE = 0.2;
const OFFICE_ARM_PAD = { width: 0.06, height: 0.026, depth: 0.26 } as const;
const OFFICE_ARM_POST_RADIUS = 0.011;
/** Radius of the bend where an armrest's bracket turns up into its post, in m. */
const OFFICE_ARM_CORNER = 0.04;

const STAR_ARMS = 5;
const STAR_HUB_RADIUS = 0.045;
/** Star arms: height and width at the hub and at the tip, in m; their undersides are flat. */
const STAR_ARM_HUB = { height: 0.05, width: 0.05 } as const;
const STAR_ARM_TIP = { height: 0.024, width: 0.032 } as const;
const STAR_ARM_BOTTOM = 0.062;
const CASTER_RADIUS = 0.024;
const CASTER_WIDTH = 0.024;
/** Clearance between a caster and the footprint's edge, in m. */
const CASTER_MARGIN = 0.008;
const COLUMN_SLEEVE_RADIUS = 0.028;
const COLUMN_SLEEVE_HEIGHT = 0.14;
const COLUMN_RADIUS = 0.016;
/** The back's spine is a flattened tube: radius in m, and how much wider than deep. */
const SPINE_RADIUS = 0.013;
const SPINE_FLATTEN = 2.4;

/** How far into the outline's corners the superellipse rounding reaches (1 would pinch them to a point). */
const OUTLINE_REACH = 0.97;
/** Superellipse exponents for the seat's plan and the backrest's outline: lower is rounder. */
const SEAT_OUTLINE_EXPONENT = 10;
const BACK_OUTLINE_EXPONENT = 6;

/**
 * How much to narrow a slab at `s` (−1…1 along its length) so its outline
 * becomes a superellipse: rounded corners on a near-rectangular shape.
 */
function outlineScale(s: number, exponent: number): number {
  return (1 - Math.abs(s * OUTLINE_REACH) ** exponent) ** (1 / exponent);
}

/** Shapes a seat slab: rounded corners in plan, a soft dome on top and a front edge that rolls down. */
function shapeSeat(geometry: THREE.BufferGeometry, width: number, height: number, depth: number) {
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
  const frontStart = depth / 2 - OFFICE_WATERFALL_DEPTH;
  for (let i = 0; i < positions.count; i++) {
    const [x, y, z] = [positions.getX(i), positions.getY(i), positions.getZ(i)];
    const up = (y + height / 2) / height;
    const u = x / (width / 2);
    const v = z / (depth / 2);
    const dome = OFFICE_SEAT_DOME * Math.max(0, 1 - u * u) * Math.max(0, 1 - v * v);
    const roll = Math.max(0, (z - frontStart) / OFFICE_WATERFALL_DEPTH);
    positions.setY(i, y + up * (dome - OFFICE_WATERFALL_DROP * roll * roll));
    positions.setX(i, x * outlineScale(v, SEAT_OUTLINE_EXPONENT));
  }
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Shapes an upright backrest slab (bottom at y = 0, facing +z): it wraps
 * around the sitter, its outline is softly rounded and narrows towards the
 * seat, and its front swells into a lumbar support.
 */
function shapeBack(geometry: THREE.BufferGeometry, width: number, height: number) {
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < positions.count; i++) {
    const [x, y, z] = [positions.getX(i), positions.getY(i), positions.getZ(i)];
    const front = (z + OFFICE_BACK_THICKNESS / 2) / OFFICE_BACK_THICKNESS;
    const t = y / height;
    const lumbar = Math.exp(-(((t - OFFICE_LUMBAR_AT) / OFFICE_LUMBAR_SPREAD) ** 2));
    const u = x / (width / 2);
    const dome = Math.max(0, 1 - u * u) * Math.max(0, 1 - (2 * t - 1) ** 2);
    const wrap = (x * x) / (2 * OFFICE_BACK_WRAP_RADIUS);
    positions.setZ(i, z + wrap + front * (OFFICE_LUMBAR_DEPTH * lumbar + OFFICE_BACK_DOME * dome));
    const waist = THREE.MathUtils.lerp(
      OFFICE_BACK_WAIST,
      1,
      THREE.MathUtils.smoothstep(t, 0, OFFICE_BACK_SHOULDER_AT),
    );
    positions.setX(i, x * waist * outlineScale(2 * t - 1, BACK_OUTLINE_EXPONENT));
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** One arm of the star base, from the hub out along +x: tapering, its top sloping down. */
function starArm(length: number, mat: THREE.Material): THREE.Mesh {
  const geometry = softSlab(length, STAR_ARM_HUB.height, STAR_ARM_HUB.width, 0.01);
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < positions.count; i++) {
    const s = positions.getX(i) / length + 0.5;
    const heightScale = THREE.MathUtils.lerp(1, STAR_ARM_TIP.height / STAR_ARM_HUB.height, s);
    const widthScale = THREE.MathUtils.lerp(1, STAR_ARM_TIP.width / STAR_ARM_HUB.width, s);
    const fromBottom = positions.getY(i) + STAR_ARM_HUB.height / 2;
    positions.setY(i, STAR_ARM_BOTTOM + fromBottom * heightScale);
    positions.setZ(i, positions.getZ(i) * widthScale);
  }
  geometry.translate(length / 2, 0, 0);
  geometry.computeVertexNormals();
  return solid(geometry, mat);
}

/** A caster under a star arm's tip at distance `reach`: a stem and a wheel rolling outwards. */
function caster(reach: number, metal: THREE.Material, rubber: THREE.Material): THREE.Mesh[] {
  const stemHeight = STAR_ARM_BOTTOM - CASTER_RADIUS + 0.004;
  const stem = solid(new THREE.CylinderGeometry(0.008, 0.008, stemHeight, 12), metal);
  stem.position.set(reach, CASTER_RADIUS + stemHeight / 2, 0);
  const wheel = solid(
    new THREE.CylinderGeometry(CASTER_RADIUS, CASTER_RADIUS, CASTER_WIDTH, 24),
    rubber,
  );
  // Axle across the arm, so the wheel rolls along it.
  wheel.rotation.x = Math.PI / 2;
  wheel.position.set(reach, CASTER_RADIUS, 0);
  return [stem, wheel];
}

/** The five-star base on casters, the hub and the gas column up to `columnTop`. */
function starBase(
  footprint: number,
  columnTop: number,
  metal: THREE.Material,
  rubber: THREE.Material,
) {
  const group = new THREE.Group();
  const tipReach = footprint / 2 - CASTER_RADIUS - CASTER_MARGIN;
  for (let i = 0; i < STAR_ARMS; i++) {
    const arm = new THREE.Group();
    arm.add(starArm(tipReach + 0.012, metal), ...caster(tipReach, metal, rubber));
    // One arm points straight back, under the backrest's weight.
    arm.rotation.y = Math.PI / 2 + (i * 2 * Math.PI) / STAR_ARMS;
    group.add(arm);
  }
  const hubHeight = STAR_ARM_HUB.height + 0.01;
  const hub = solid(
    new THREE.CylinderGeometry(STAR_HUB_RADIUS * 0.8, STAR_HUB_RADIUS, hubHeight, 32),
    metal,
  );
  hub.position.y = STAR_ARM_BOTTOM + hubHeight / 2;
  const sleeveBottom = STAR_ARM_BOTTOM + hubHeight;
  const sleeve = solid(
    new THREE.CylinderGeometry(
      COLUMN_SLEEVE_RADIUS * 0.9,
      COLUMN_SLEEVE_RADIUS,
      COLUMN_SLEEVE_HEIGHT,
      32,
    ),
    metal,
  );
  sleeve.position.y = sleeveBottom + COLUMN_SLEEVE_HEIGHT / 2;
  const rodHeight = columnTop - sleeveBottom;
  const rod = solid(new THREE.CylinderGeometry(COLUMN_RADIUS, COLUMN_RADIUS, rodHeight, 24), metal);
  rod.position.y = sleeveBottom + rodHeight / 2;
  group.add(hub, sleeve, rod);
  return group;
}

/** Where the office chair's parts go, derived from its size. */
interface OfficeLayout {
  readonly seatWidth: number;
  readonly seatDepth: number;
  readonly seatZ: number;
  /** Bottom of the seat cushion, in m. */
  readonly seatBottom: number;
  readonly mechanismTop: number;
  readonly backWidth: number;
  readonly backHeight: number;
}

function officeLayout({ width, depth, height }: { width: number; depth: number; height: number }) {
  const seatDepth = depth - OFFICE_SEAT_DEPTH_TRIM;
  const seatBottom = OFFICE_SEAT_HEIGHT - OFFICE_SEAT_DOME - OFFICE_SEAT_THICKNESS;
  const seatWidth = width - 2 * OFFICE_ARM_ZONE;
  return {
    seatWidth,
    seatDepth,
    seatZ: depth / 2 - OFFICE_SEAT_FRONT_MARGIN - seatDepth / 2,
    seatBottom,
    mechanismTop: seatBottom - OFFICE_SHELL_THICKNESS,
    backWidth: seatWidth - OFFICE_BACK_NARROWING,
    backHeight: height - (OFFICE_SEAT_HEIGHT + OFFICE_BACK_GAP),
  } satisfies OfficeLayout;
}

/** The seat: shaped cushion on a thin shell, on the tilt mechanism. */
function officeSeat(layout: OfficeLayout, fabric: THREE.Material, metal: THREE.Material) {
  const { seatWidth, seatDepth, seatZ, seatBottom, mechanismTop } = layout;
  const seat = solid(
    shapeSeat(
      softSlab(seatWidth, OFFICE_SEAT_THICKNESS, seatDepth, 0.035),
      seatWidth,
      OFFICE_SEAT_THICKNESS,
      seatDepth,
    ),
    fabric,
  );
  seat.position.set(0, seatBottom + OFFICE_SEAT_THICKNESS / 2, seatZ);
  const shell = solid(
    softSlab(seatWidth - 0.03, OFFICE_SHELL_THICKNESS, seatDepth - 0.04, 0.005),
    metal,
  );
  shell.position.set(0, mechanismTop + OFFICE_SHELL_THICKNESS / 2, seatZ - 0.01);
  const mechanism = solid(
    softSlab(OFFICE_MECHANISM_SIZE, OFFICE_MECHANISM_HEIGHT, OFFICE_MECHANISM_SIZE, 0.008),
    metal,
  );
  mechanism.position.set(0, mechanismTop - OFFICE_MECHANISM_HEIGHT / 2, 0);
  return [seat, shell, mechanism];
}

/** The reclined backrest and the spine that carries it from under the seat. */
function officeBack(
  layout: OfficeLayout,
  fabric: THREE.Material,
  metal: THREE.Material,
): THREE.Mesh[] {
  const { backWidth, backHeight, seatZ, seatDepth, mechanismTop } = layout;
  const geometry = softSlab(backWidth, backHeight, OFFICE_BACK_THICKNESS, 0.03);
  geometry.translate(0, backHeight / 2, 0);
  const back = solid(shapeBack(geometry, backWidth, backHeight), fabric);
  const seatRear = seatZ - seatDepth / 2;
  back.position.set(0, OFFICE_SEAT_HEIGHT + OFFICE_BACK_GAP, seatRear);
  back.rotation.x = -OFFICE_BACK_LEAN;
  back.updateMatrix();

  // The spine leaves the mechanism's rear, curves up and fixes to the back's lower third.
  const behind = -OFFICE_BACK_THICKNESS / 2 - SPINE_RADIUS + 0.004;
  const fixLow = new THREE.Vector3(0, backHeight * 0.1, behind).applyMatrix4(back.matrix);
  const fixHigh = new THREE.Vector3(0, backHeight * 0.45, behind).applyMatrix4(back.matrix);
  const start = new THREE.Vector3(0, mechanismTop - OFFICE_MECHANISM_HEIGHT / 2, 0);
  const curve = new THREE.CubicBezierCurve3(
    start,
    new THREE.Vector3(0, start.y, fixLow.z),
    new THREE.Vector3(0, start.y, fixLow.z - 0.01),
    fixHigh,
  );
  const spineGeometry = new THREE.TubeGeometry(curve, 48, SPINE_RADIUS, 14);
  spineGeometry.scale(SPINE_FLATTEN, 1, 1);
  return [back, solid(spineGeometry, metal)];
}

/** One armrest at side `sx`: a bracket under the seat that bends up into a post, and a pad. */
function officeArm(
  sx: number,
  layout: OfficeLayout,
  metal: THREE.Material,
  pad: THREE.Material,
): THREE.Mesh[] {
  const { seatWidth, seatZ, mechanismTop } = layout;
  const armX = sx * (seatWidth / 2 + OFFICE_ARM_ZONE / 2);
  const bracketY = mechanismTop - OFFICE_MECHANISM_HEIGHT / 2;
  const padY = OFFICE_SEAT_HEIGHT + OFFICE_ARM_RISE - OFFICE_ARM_PAD.height / 2;
  const z = seatZ - 0.06;
  const path = new THREE.CurvePath<THREE.Vector3>();
  const corner = new THREE.Vector3(armX, bracketY, z);
  const beforeCorner = new THREE.Vector3(armX - sx * OFFICE_ARM_CORNER, bracketY, z);
  const afterCorner = new THREE.Vector3(armX, bracketY + OFFICE_ARM_CORNER, z);
  path.add(new THREE.LineCurve3(new THREE.Vector3(0, bracketY, z), beforeCorner));
  path.add(new THREE.QuadraticBezierCurve3(beforeCorner, corner, afterCorner));
  path.add(new THREE.LineCurve3(afterCorner, new THREE.Vector3(armX, padY, z)));
  const frame = solid(new THREE.TubeGeometry(path, 64, OFFICE_ARM_POST_RADIUS, 12), metal);
  const { width, height, depth } = OFFICE_ARM_PAD;
  const top = solid(softSlab(width, height, depth, 0.011), pad);
  top.position.set(armX, padY, z + 0.04);
  return [frame, top];
}

/**
 * A contemporary task chair: a five-star base on casters, a gas column, an
 * upholstered seat with a rolled front edge, a reclined backrest with a
 * lumbar curve, and two slim armrests. `main` is the upholstery, `accent`
 * the metal frame; casters and arm pads are charcoal.
 */
export const officeChair: PieceBuilder = (size, { main, accent }) => {
  const fabric = material(main);
  const metal = material(accent);
  const charcoal = material(FINISHES.charcoal);
  const layout = officeLayout(size);
  const group = new THREE.Group();
  const columnTop = layout.mechanismTop - OFFICE_MECHANISM_HEIGHT + 0.005;
  group.add(starBase(Math.min(size.width, size.depth), columnTop, metal, charcoal));
  group.add(...officeSeat(layout, fabric, metal), ...officeBack(layout, fabric, metal));
  for (const sx of [-1, 1]) group.add(...officeArm(sx, layout, metal, charcoal));
  return group;
};
