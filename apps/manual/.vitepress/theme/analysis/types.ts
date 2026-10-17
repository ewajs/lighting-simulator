// The shapes of the accuracy workspace's outputs the Analysis pages read
// (ADR 0061, 0062): summary.json, comparison.json and timings.json. They're
// written by accuracy/typescript, whose own types are the source; these
// mirror the parts the pages use.

/** How one surface compares, for direct or total light (summary.json). */
export interface SurfaceSummary {
  readonly surface: string;
  readonly points: number;
  readonly radianceAverageLx: number;
  readonly oursAverageLx: number;
  /** ours / Radiance − 1, for the averages. */
  readonly averageError: number;
  /** The largest |ours / Radiance − 1| among bright points at least 1 m from a luminaire. */
  readonly worstFar: number;
  /** The same nearer than 1 m; 0 if none. */
  readonly worstNear: number;
}

/** One feature step in one room, against Radiance's full light (ADR 0061). */
export interface FeatureResult {
  readonly step: string;
  readonly worstAverage: number;
  readonly meanPointError: number;
  readonly worstFar: number;
  readonly worstNear: number;
  readonly surfaces: readonly { readonly surface: string; readonly averageError: number }[];
}

/** One reference room in summary.json. */
export interface RoomSummary {
  readonly name: string;
  readonly radianceRelease: string;
  readonly points: number;
  readonly direct: readonly SurfaceSummary[];
  readonly total: readonly SurfaceSummary[];
  /** Total light with the furniture taken out on both sides; empty without furniture. */
  readonly withoutFurniture: readonly SurfaceSummary[];
  readonly features: readonly FeatureResult[];
}

/** accuracy/summary.json. */
export interface AccuracySummary {
  readonly brightShare: number;
  readonly nearM: number;
  readonly rooms: readonly RoomSummary[];
}

/** A point in Lux Studio's coordinates, in m: x right, y up, z towards the front. */
export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** A reference room as built: its size, surfaces, luminaires and boxes. */
export interface RoomSpec {
  readonly room: { readonly width: number; readonly depth: number; readonly height: number };
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
}

/** One surface's points, both sides' light at each (comparison.json). */
export interface SurfaceComparison {
  readonly surface: string;
  readonly normal: Vec3;
  readonly points: readonly (readonly [number, number, number])[];
  readonly radiance: { readonly direct: readonly number[]; readonly total: readonly number[] };
  readonly ours: { readonly direct: readonly number[]; readonly total: readonly number[] };
  /** Lux Studio's total at each feature step, by step id. */
  readonly steps: Readonly<Record<string, readonly number[]>>;
  readonly withoutFurniture?: {
    readonly radiance: readonly number[];
    readonly ours: readonly number[];
  };
}

/** One room in comparison.json. */
export interface RoomComparison {
  readonly name: string;
  readonly room: RoomSpec;
  readonly surfaces: readonly SurfaceComparison[];
}

/** Seconds a Radiance run took: wall clock, and CPU over all its processes. */
export interface RunSeconds {
  readonly wallSeconds: number;
  readonly cpuSeconds: number;
}

/** One room in timings.json. */
export interface RoomTimings {
  readonly name: string;
  readonly points: number;
  /** Lux Studio's median time per feature step, in ms. */
  readonly steps: readonly { readonly step: string; readonly medianMs: number }[];
  readonly radiance?: {
    readonly machine: string;
    readonly processes: number;
    readonly direct: RunSeconds;
    readonly bounced: RunSeconds;
  };
}

/** accuracy/timings.json. */
export interface Timings {
  readonly generated: string;
  readonly machine: {
    readonly cpu: string;
    readonly cores: number;
    readonly platform: string;
    readonly node: string;
  };
  readonly runs: number;
  readonly rooms: readonly RoomTimings[];
}

/** A luminaire on the room's plan: where its light leaves from, and where it points. */
export interface PlanLuminaire {
  readonly x: number;
  readonly z: number;
  readonly heightM: number;
  /** Its aim's horizontal part, as long as the sine of its tilt: 0 for straight down. */
  readonly aimX: number;
  readonly aimZ: number;
}

/** Everything a room's Analysis page shows. */
export interface RoomPage {
  readonly plan: readonly PlanLuminaire[];
  readonly summary: RoomSummary;
  readonly comparison: RoomComparison;
  readonly timings: RoomTimings | undefined;
  /** The processor the timings were taken on, e.g. "Apple M1 Pro". */
  readonly machine: string;
  readonly brightShare: number;
  readonly nearM: number;
}
