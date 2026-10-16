// Lux Studio's illuminance against Radiance's, at the points of each
// reference room (ADR 0058). The references come from accuracy/python; this
// rebuilds each room with core's own code and computes the same points.

import {
  directIlluminance,
  directLight,
  fixtureLayout,
  luminaireFrame,
  parseIes,
  type AnalysisSettings,
  type Blocker,
  type Catalog,
  type Luminaire,
  type Photometry,
  type Product,
  type Room,
  type Vec3,
} from '@luxstudio/core';

/** A reference room's file, as accuracy/python writes it. */
export interface Reference {
  readonly format: 'lux-studio-accuracy-reference';
  readonly version: 1;
  readonly room: {
    readonly description: string;
    readonly room: { readonly width: number; readonly depth: number; readonly height: number };
    readonly luminaires: readonly {
      readonly ies: string;
      readonly origin: Vec3;
      readonly tiltDeg?: number;
      readonly panDeg?: number;
    }[];
    readonly blockers?: readonly {
      readonly centre: Vec3;
      readonly half: Vec3;
      readonly yawDeg?: number;
    }[];
  };
  readonly radiance: { readonly release: string; readonly rtrace: readonly string[] };
  readonly points: readonly {
    readonly surface: string;
    readonly position: Vec3;
    readonly normal: Vec3;
    readonly lux: number;
  }[];
}

/** One point: where it is, Radiance's value and ours. */
export interface PointComparison {
  readonly surface: string;
  readonly position: Vec3;
  readonly radianceLx: number;
  readonly oursLx: number;
}

/** No maintenance factor and no border: Radiance computes the light as installed, everywhere. */
const AS_INSTALLED: AnalysisSettings = { workPlaneHeightM: 0, borderM: 0, maintenanceFactor: 1 };

/**
 * Computes every point of a reference with Lux Studio's code.
 *
 * Each luminaire is a recessed product with the room's IES file, placed so
 * its light leaves from the reference's origin (the placeholder's light sits
 * 3 cm below the fixture), and aimed with the reference's tilt and pan. The
 * reference's shadow boxes are used as they are.
 *
 * @param iesFiles The IES files' text by file name.
 */
export function compareReference(
  reference: Reference,
  iesFiles: Readonly<Record<string, string>>,
): PointComparison[] {
  const { width, depth, height } = reference.room.room;
  const room: Room = {
    width,
    depth,
    height,
    surfaces: {
      floor: { color: '#808080', reflectance: 0.5 },
      walls: { color: '#808080', reflectance: 0.5 },
      ceiling: { color: '#808080', reflectance: 0.5 },
    },
  };
  const photometry = new Map<string, Photometry>();
  const products = new Map<string, Product>();
  for (const { ies } of reference.room.luminaires) {
    const text = iesFiles[ies];
    if (text === undefined) throw new Error(`No IES file ${ies}`);
    photometry.set(ies, parseIes(text));
    products.set(ies, { id: ies, mount: 'recessed', power: 1, flux: 1, cct: 3000, beamDeg: 60 });
  }
  const catalog: Catalog = { get: (id) => products.get(id) };

  const luminaires = reference.room.luminaires.map((item, index): Luminaire => {
    const aim = { tiltDeg: item.tiltDeg ?? 0, panDeg: item.panDeg ?? 0 };
    const product = products.get(item.ies)!;
    const { lightOrigin } = fixtureLayout(product);
    const placed: Luminaire = {
      id: `l${index}`,
      productId: item.ies,
      position: subtract(item.origin, lightOrigin),
      aim,
      dimming: 1,
      on: true,
      cct: 3000,
    };
    // A recessed fixture's light offset is straight down, so no turn moves it.
    const { origin } = luminaireFrame(placed, product.mount, room, fixtureLayout(product));
    if (
      Math.hypot(origin.x - item.origin.x, origin.y - item.origin.y, origin.z - item.origin.z) >
      1e-9
    ) {
      throw new Error(`Luminaire ${index}'s light isn't where the reference puts it`);
    }
    return placed;
  });

  const light = directLight(
    { room, luminaires, furniture: [] },
    { catalog, photometry: (id) => photometry.get(id), modelFile: () => undefined },
    AS_INSTALLED,
  );
  const blockers: Blocker[] = (reference.room.blockers ?? []).map(({ centre, half, yawDeg }) => ({
    centre,
    half,
    yawRad: ((yawDeg ?? 0) * Math.PI) / 180,
  }));
  return reference.points.map(({ surface, position, normal, lux }) => ({
    surface,
    position,
    radianceLx: lux,
    oursLx: directIlluminance(position, normal, light.sources, blockers),
  }));
}

function subtract(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

/** Points dimmer than this share of the room's brightest are left out of per-point figures: tiny values make noisy ratios. */
export const BRIGHT_SHARE = 0.1;
/** Closer than this to a luminaire, in m, a point is "near": both tools approximate a glowing opening there. */
export const NEAR_M = 1;

/** How one surface compares: its averages, and its worst bright points far from and near a luminaire. */
export interface SurfaceSummary {
  readonly surface: string;
  readonly points: number;
  readonly radianceAverageLx: number;
  readonly oursAverageLx: number;
  /** ours / Radiance − 1, for the averages. */
  readonly averageError: number;
  /** The largest |ours / Radiance − 1| among bright points at least NEAR_M from every luminaire; 0 if none. */
  readonly worstFar: number;
  /** The same among bright points nearer than NEAR_M; 0 if none. */
  readonly worstNear: number;
}

/**
 * Summarises a room's comparison surface by surface.
 *
 * @param origins Where each luminaire's light leaves from, to tell near points from far ones.
 */
export function summarize(
  points: readonly PointComparison[],
  origins: readonly Vec3[],
): SurfaceSummary[] {
  const brightest = Math.max(...points.map((point) => point.radianceLx));
  const near = (point: PointComparison) =>
    origins.some(
      (o) =>
        Math.hypot(point.position.x - o.x, point.position.y - o.y, point.position.z - o.z) < NEAR_M,
    );
  const worst = (selected: PointComparison[]) =>
    Math.max(0, ...selected.map((point) => Math.abs(point.oursLx / point.radianceLx - 1)));
  const surfaces = [...new Set(points.map((point) => point.surface))];
  return surfaces.map((surface) => {
    const on = points.filter((point) => point.surface === surface);
    const radianceAverageLx = on.reduce((sum, point) => sum + point.radianceLx, 0) / on.length;
    const oursAverageLx = on.reduce((sum, point) => sum + point.oursLx, 0) / on.length;
    const bright = on.filter((point) => point.radianceLx >= BRIGHT_SHARE * brightest);
    return {
      surface,
      points: on.length,
      radianceAverageLx,
      oursAverageLx,
      averageError: oursAverageLx / radianceAverageLx - 1,
      worstFar: worst(bright.filter((point) => !near(point))),
      worstNear: worst(bright.filter(near)),
    };
  });
}
