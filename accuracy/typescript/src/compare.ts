// Lux Studio's illuminance against Radiance's, at the points of each
// reference room (ADR 0058, 0060). The references come from accuracy/python;
// this rebuilds each room with core's own code and computes the same points,
// direct light and total (direct plus every bounce).

import {
  DEFAULT_CALCULATION_OPTIONS,
  DEFAULT_ROOM,
  directLight,
  fixtureLayout,
  illuminanceAt,
  indirectLight,
  luminaireFrame,
  parseIes,
  type AnalysisSettings,
  type Blocker,
  type CalculationOptions,
  type Catalog,
  type Luminaire,
  type Photometry,
  type Product,
  type Room,
  type SceneLight,
  type Vec3,
} from '@luxstudio/core';

/** A reference room's file, as accuracy/python writes it (version 2). */
export interface Reference {
  readonly format: 'lux-studio-accuracy-reference';
  readonly version: 2;
  readonly room: {
    readonly description: string;
    readonly room: { readonly width: number; readonly depth: number; readonly height: number };
    /** The surfaces' reflectances; Lux Studio's default room's where left out. */
    readonly surfaces?: {
      readonly floor?: number;
      readonly walls?: number;
      readonly ceiling?: number;
    };
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
      readonly reflectance?: number;
    }[];
  };
  readonly radiance: {
    readonly release: string;
    readonly direct: readonly string[];
    readonly bounced: readonly (readonly string[])[];
    /** How long Radiance took, on which machine and with how many processes (ADR 0061). */
    readonly timing?: RadianceTiming;
  };
  readonly points: readonly {
    readonly surface: string;
    readonly position: Vec3;
    readonly normal: Vec3;
    readonly direct: number;
    readonly total: number;
  }[];
  /** For a room with furniture: Radiance's values again with the furniture taken out. */
  readonly withoutFurniture?: {
    readonly direct: readonly number[];
    readonly total: readonly number[];
  };
}

/** Seconds a Radiance run took: wall clock, and CPU summed over its processes. */
export interface RunSeconds {
  readonly wallSeconds: number;
  readonly cpuSeconds: number;
}

/** How long Radiance took for a reference: direct light, and the two runs bounced light takes. */
export interface RadianceTiming {
  readonly machine: string;
  readonly processes: number;
  readonly direct: RunSeconds;
  readonly bounced: RunSeconds;
}

/** One point: where it is, and Radiance's and Lux Studio's direct and total light, in lx. */
export interface PointComparison {
  readonly surface: string;
  readonly position: Vec3;
  readonly radianceDirectLx: number;
  readonly radianceTotalLx: number;
  readonly oursDirectLx: number;
  readonly oursTotalLx: number;
}

/** No maintenance factor and no border: Radiance computes the light as installed, everywhere. */
const AS_INSTALLED: AnalysisSettings = { workPlaneHeightM: 0, borderM: 0, maintenanceFactor: 1 };

/** The reference's room for core: its size, and its surfaces' reflectances. */
export function referenceRoom(reference: Reference): Room {
  const { width, depth, height } = reference.room.room;
  const surfaces = reference.room.surfaces ?? {};
  const surface = (name: 'floor' | 'walls' | 'ceiling') => ({
    color: '#808080',
    reflectance: surfaces[name] ?? DEFAULT_ROOM.surfaces[name].reflectance,
  });
  return {
    width,
    depth,
    height,
    surfaces: { floor: surface('floor'), walls: surface('walls'), ceiling: surface('ceiling') },
  };
}

/**
 * A reference room's light, computed by Lux Studio's code.
 *
 * Each luminaire is a recessed product with the room's IES file, placed so
 * its light leaves from the reference's origin (the placeholder's light sits
 * 3 cm below the fixture), and aimed with the reference's tilt and pan. The
 * reference's boxes are furniture as Lux Studio models it: they cast shadows,
 * and hide and reflect bounced light, as the options say.
 *
 * @param iesFiles The IES files' text by file name.
 * @param furniture Whether the reference's boxes are there: false matches its
 *   `withoutFurniture` values.
 * @param blackFurniture Whether the boxes reflect nothing, whatever the reference says.
 */
export function referenceLight(
  reference: Reference,
  iesFiles: Readonly<Record<string, string>>,
  options: CalculationOptions = DEFAULT_CALCULATION_OPTIONS,
  furniture = true,
  blackFurniture = false,
): SceneLight {
  const room = referenceRoom(reference);
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
    const gap = Math.hypot(
      origin.x - item.origin.x,
      origin.y - item.origin.y,
      origin.z - item.origin.z,
    );
    if (gap > 1e-9) throw new Error(`Luminaire ${index}'s light isn't where the reference puts it`);
    return placed;
  });

  // The reference's boxes stand in for furniture: they cast shadows when the
  // options say furniture does.
  const boxes = furniture && options.furnitureShadows ? (reference.room.blockers ?? []) : [];
  const blockers: Blocker[] = boxes.map(({ centre, half, yawDeg, reflectance }) => ({
    centre,
    half,
    yawRad: ((yawDeg ?? 0) * Math.PI) / 180,
    // As in the reference; black for the feature study's "furniture only hides" step.
    reflectance: blackFurniture ? 0 : (reflectance ?? 0),
  }));
  const direct = {
    ...directLight(
      { room, luminaires, furniture: [] },
      { catalog, photometry: (id) => photometry.get(id), modelFile: () => undefined },
      AS_INSTALLED,
      options,
    ),
    blockers,
  };
  return { direct, indirect: indirectLight(room, direct, options) };
}

/**
 * Computes every point of a reference with Lux Studio's code, direct and total
 * (see `referenceLight`).
 *
 * @param furniture false compares the room without its furniture, against
 *   the reference's `withoutFurniture` values.
 * @param blackFurniture As for `referenceLight`.
 */
export function compareReference(
  reference: Reference,
  iesFiles: Readonly<Record<string, string>>,
  options: CalculationOptions = DEFAULT_CALCULATION_OPTIONS,
  furniture = true,
  blackFurniture = false,
): PointComparison[] {
  const bare = reference.withoutFurniture;
  if (!furniture && !bare) throw new Error('This reference has no values without furniture');
  const light = referenceLight(reference, iesFiles, options, furniture, blackFurniture);
  return reference.points.map(({ surface, position, normal, direct, total }, k) => {
    const ours = illuminanceAt(light, position, normal);
    return {
      surface,
      position,
      radianceDirectLx: furniture ? direct : bare!.direct[k]!,
      radianceTotalLx: furniture ? total : bare!.total[k]!,
      oursDirectLx: ours.directLx,
      oursTotalLx: ours.totalLx,
    };
  });
}

/** Points dimmer than this share of the room's brightest are left out of per-point figures: tiny values make noisy ratios. */
export const BRIGHT_SHARE = 0.1;
/** Closer than this to a luminaire, in m, a point is "near": both tools approximate a glowing opening there. */
export const NEAR_M = 1;

/** How one surface compares, for direct or total light: its averages, and its worst bright points far from and near a luminaire. */
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

/** Which light to summarise: straight from the luminaires, or with every bounce. */
export type Light = 'direct' | 'total';

/**
 * Summarises a room's comparison surface by surface, for direct or total light.
 *
 * @param origins Where each luminaire's light leaves from, to tell near points from far ones.
 */
export function summarize(
  points: readonly PointComparison[],
  origins: readonly Vec3[],
  light: Light,
): SurfaceSummary[] {
  const radiance = (p: PointComparison) =>
    light === 'direct' ? p.radianceDirectLx : p.radianceTotalLx;
  const ours = (p: PointComparison) => (light === 'direct' ? p.oursDirectLx : p.oursTotalLx);
  const brightest = Math.max(...points.map(radiance));
  const near = (point: PointComparison) =>
    origins.some(
      (o) =>
        Math.hypot(point.position.x - o.x, point.position.y - o.y, point.position.z - o.z) < NEAR_M,
    );
  const worst = (selected: PointComparison[]) =>
    Math.max(0, ...selected.map((point) => Math.abs(ours(point) / radiance(point) - 1)));
  const surfaces = [...new Set(points.map((point) => point.surface))];
  return surfaces.map((surface) => {
    const on = points.filter((point) => point.surface === surface);
    const radianceAverageLx = on.reduce((sum, point) => sum + radiance(point), 0) / on.length;
    const oursAverageLx = on.reduce((sum, point) => sum + ours(point), 0) / on.length;
    const bright = on.filter((point) => radiance(point) >= BRIGHT_SHARE * brightest);
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

function subtract(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}
