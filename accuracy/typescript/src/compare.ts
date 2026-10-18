// Lux Studio's illuminance against Radiance's, at the points of each
// reference room (ADR 0058, 0060). The references come from accuracy/python;
// this rebuilds each room with core's own code and computes the same points,
// direct light and total (direct plus every bounce).

import {
  DEFAULT_DAYLIGHT,
  DEFAULT_CALCULATION_OPTIONS,
  DEFAULT_ROOM,
  coveredByFurniture,
  directLight,
  fixtureLayout,
  illuminanceAt,
  indirectLight,
  daylightSources,
  luminaireFrame,
  parseIes,
  skyFor,
  type AnalysisSettings,
  type Blocker,
  type CalculationOptions,
  type Catalog,
  type Daylight,
  type Luminaire,
  type Photometry,
  type Product,
  type Room,
  type RoomWindow,
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
    /** Openings in the walls and ceiling, as Lux Studio's windows without ids (ADR 0081). */
    readonly windows?: readonly Omit<RoomWindow, 'id'>[];
    /** The daylight outside them, as Lux Studio's. */
    readonly daylight?: Daylight;
  };
  readonly radiance: {
    readonly release: string;
    readonly direct: readonly string[];
    readonly bounced: readonly (readonly string[])[];
    /** How long Radiance took, on which machine and with how many processes (ADR 0061). */
    readonly timing?: RadianceTiming;
    /** By day: rtrace's options for daylight's first arrival. */
    readonly daylight?: readonly string[];
  };
  /**
   * By day (ADR 0081): where the Python put the sun, the sky's and the sun's
   * levels it gave gensky, and the windows' transmittance it dimmed them by.
   */
  readonly daylight?: {
    readonly sun: { readonly altitudeDeg: number; readonly azimuthDeg: number };
    readonly horizontalSkyLx: number;
    readonly sunNormalLx: number;
    readonly transmittance: number;
    readonly sky: string;
  };
  readonly points: readonly {
    readonly surface: string;
    readonly position: Vec3;
    readonly normal: Vec3;
    readonly direct: number;
    readonly total: number;
    /** By day: daylight's first arrival, from the sky, the ground and the sun, before any bounce. */
    readonly daylight?: number;
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
  /** Daylight's first arrival on each side; 0 in a room with none. */
  readonly radianceDaylightLx: number;
  readonly oursDaylightLx: number;
  /** Covered by one of the room's pieces, as the app leaves out of its figures (ADR 0074). */
  readonly covered: boolean;
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
  const boxes = furniture && options.furnitureShadows ? referenceBoxes(reference) : [];
  // As in the reference; black for the feature study's "furniture only hides" step.
  const blockers = blackFurniture ? boxes.map((box) => ({ ...box, reflectance: 0 })) : boxes;
  const direct = {
    ...directLight(
      { room, luminaires, furniture: [], windows: [], daylight: DEFAULT_DAYLIGHT },
      { catalog, photometry: (id) => photometry.get(id), modelFile: () => undefined },
      AS_INSTALLED,
      options,
    ),
    blockers,
  };
  // By day, its windows and their daylight (ADR 0081): openings in any case.
  const scene = {
    room,
    luminaires: [],
    furniture: [],
    windows: (reference.room.windows ?? []).map((window, k) => ({ ...window, id: `w${k}` })),
    daylight: reference.room.daylight ?? DEFAULT_DAYLIGHT,
  };
  const sky = reference.room.daylight && options.daylight ? skyFor(scene.daylight) : undefined;
  const cellM = options.splitOpenings ? options.sourceCellM : Number.POSITIVE_INFINITY;
  const daylight = daylightSources(scene, cellM, sky);
  return { direct, daylight, indirect: indirectLight(room, direct, options, undefined, daylight) };
}

/** The reference's boxes, as core's furniture blocks light with them. */
export function referenceBoxes(reference: Reference): Blocker[] {
  return (reference.room.blockers ?? []).map(({ centre, half, yawDeg, reflectance }) => ({
    centre,
    half,
    yawRad: ((yawDeg ?? 0) * Math.PI) / 180,
    reflectance: reflectance ?? 0,
  }));
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
  const boxes = furniture ? referenceBoxes(reference) : [];
  return reference.points.map(({ surface, position, normal, direct, total, daylight }, k) => {
    const ours = illuminanceAt(light, position, normal);
    return {
      surface,
      position,
      radianceDirectLx: furniture ? direct : bare!.direct[k]!,
      radianceTotalLx: furniture ? total : bare!.total[k]!,
      oursDirectLx: ours.directLx,
      oursTotalLx: ours.totalLx,
      radianceDaylightLx: daylight ?? 0,
      oursDaylightLx: ours.daylightLx,
      covered: coveredByFurniture(position, normal, boxes),
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
  /** The surface's least illuminance, Emin, on each side: what a report quotes with Ē. */
  readonly radianceMinLx: number;
  readonly oursMinLx: number;
  /**
   * ours / Radiance − 1 for Emin, and for the uniformity U₀ = Emin / Ē; null
   * when Radiance's Emin is below MIN_SHARE of its average (a point inside a
   * piece of furniture, where both are near 0 and the ratio means nothing).
   */
  readonly minError: number | null;
  readonly uniformityError: number | null;
}

/** An Emin below this share of the surface's average isn't compared: see `SurfaceSummary.minError`. */
export const MIN_SHARE = 0.01;

/**
 * Which light to summarise: straight from the luminaires, bounced (total
 * less direct), both, or daylight's first arrival (ADR 0081).
 */
export type Light = 'direct' | 'bounced' | 'total' | 'daylight';

/** Radiance's light at a point, in lx: direct, bounced or total. */
export function radianceLx(point: PointComparison, light: Light): number {
  if (light === 'direct') return point.radianceDirectLx;
  if (light === 'total') return point.radianceTotalLx;
  if (light === 'daylight') return point.radianceDaylightLx;
  return point.radianceTotalLx - point.radianceDirectLx;
}

/** Lux Studio's light at a point, in lx: direct, bounced or total. */
export function oursLx(point: PointComparison, light: Light): number {
  if (light === 'direct') return point.oursDirectLx;
  if (light === 'total') return point.oursTotalLx;
  if (light === 'daylight') return point.oursDaylightLx;
  return point.oursTotalLx - point.oursDirectLx;
}

/**
 * Summarises a room's comparison surface by surface, for direct or total light.
 *
 * @param origins Where each luminaire's light leaves from, to tell near points from far ones.
 */
export function summarize(
  points: readonly PointComparison[],
  origins: readonly Vec3[],
  light: Light,
  brightShare = BRIGHT_SHARE,
): SurfaceSummary[] {
  const radiance = (p: PointComparison) => radianceLx(p, light);
  const ours = (p: PointComparison) => oursLx(p, light);
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
    // As the app does (ADR 0074): a point inside a piece isn't measured.
    const on = points.filter((point) => point.surface === surface && !point.covered);
    const radianceAverageLx = on.reduce((sum, point) => sum + radiance(point), 0) / on.length;
    const oursAverageLx = on.reduce((sum, point) => sum + ours(point), 0) / on.length;
    // In a room with no such light (direct light by day alone), no point is bright.
    const bright = brightest > 0 ? on.filter((p) => radiance(p) >= brightShare * brightest) : [];
    const radianceMinLx = Math.min(...on.map(radiance));
    const oursMinLx = Math.min(...on.map(ours));
    const comparable = radianceMinLx >= MIN_SHARE * radianceAverageLx;
    return {
      surface,
      points: on.length,
      radianceAverageLx,
      oursAverageLx,
      // No light on either side (a ceiling above downlights, in direct light) agrees.
      averageError:
        radianceAverageLx === 0 && oursAverageLx === 0 ? 0 : oursAverageLx / radianceAverageLx - 1,
      worstFar: worst(bright.filter((point) => !near(point))),
      worstNear: worst(bright.filter(near)),
      radianceMinLx,
      oursMinLx,
      minError: comparable ? oursMinLx / radianceMinLx - 1 : null,
      uniformityError: comparable
        ? oursMinLx / oursAverageLx / (radianceMinLx / radianceAverageLx) - 1
        : null,
    };
  });
}

/**
 * How many of the room's bright points (as `summarize` counts them) are off
 * Radiance by more than `beyond` (a share: 0.1 is 10 %), out of how many.
 */
export function brightPointsOff(
  points: readonly PointComparison[],
  light: Light,
  beyond: number,
): { readonly off: number; readonly bright: number } {
  const radiance = (p: PointComparison) => radianceLx(p, light);
  const ours = (p: PointComparison) => oursLx(p, light);
  const brightest = Math.max(...points.map(radiance));
  const bright = brightest > 0 ? points.filter((p) => radiance(p) >= BRIGHT_SHARE * brightest) : [];
  const off = bright.filter((p) => Math.abs(ours(p) / radiance(p) - 1) > beyond).length;
  return { off, bright: bright.length };
}

function subtract(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}
