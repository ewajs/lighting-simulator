// The few figures the Analysis pages' prose quotes (ADR 0062), computed from
// the data so the text can't contradict the charts.
import type { AccuracySummary, RoomSummary, SurfaceSummary, Timings } from './types';

const worstAverage = (surfaces: readonly SurfaceSummary[]) =>
  Math.max(...surfaces.map((s) => Math.abs(s.averageError)));
const worstFar = (surfaces: readonly SurfaceSummary[]) =>
  Math.max(...surfaces.map((s) => s.worstFar));
/** The largest Emin or U₀ difference where they can be compared. */
const worstMin = (surfaces: readonly SurfaceSummary[]) =>
  Math.max(
    0,
    ...surfaces.flatMap((s) =>
      [s.minError, s.uniformityError].flatMap((e) => (e === null ? [] : [Math.abs(e)])),
    ),
  );

/**
 * The busy open-plan room, whose worst points are penumbrae between furniture
 * (ADR 0068): the pages quote them apart, so one room's few points don't stand
 * for every room's.
 */
export const BUSY_ROOM = 'busy-open-plan';

/** The section's headline figures. */
export interface Headline {
  /** Reference points in all rooms. */
  readonly points: number;
  readonly rooms: number;
  /** The worst surface average, every room as it is, furniture and all. */
  readonly worstAverage: number;
  /** The worst far point, every room but BUSY_ROOM; and BUSY_ROOM's. */
  readonly worstFar: number;
  readonly busyWorstFar: number;
  /** The worst Emin or U₀ difference in total light, every room but BUSY_ROOM; and BUSY_ROOM's. */
  readonly worstMin: number;
  readonly busyWorstMin: number;
  /** The furnished rooms' worst mean point error before furniture took part in bounced light, and after. */
  readonly furnishedBefore: number;
  readonly furnishedAfter: number;
  /** The first feature step's mean point error, at its best and worst room. */
  readonly directOnlyMin: number;
  readonly directOnlyMax: number;
  /** Lux Studio's full calculation and Radiance's bounced light, fastest and slowest room, in ms and s. */
  readonly oursMinMs: number;
  readonly oursMaxMs: number;
  readonly radianceMinS: number;
  readonly radianceMaxS: number;
  readonly machine: string;
}

/** The headline figures from summary.json and timings.json. */
export function headline(summary: AccuracySummary, timings: Timings): Headline {
  const furnished = summary.rooms.filter((r) => r.withoutFurniture.length > 0);
  const directOnly = summary.rooms.map((r) => r.features[0]!.meanPointError);
  const ours = timings.rooms.map((r) => r.steps[r.steps.length - 1]!.medianMs);
  const radiance = timings.rooms.flatMap((r) =>
    r.radiance ? [r.radiance.direct.wallSeconds + r.radiance.bounced.wallSeconds] : [],
  );
  return {
    points: summary.rooms.reduce((sum, r) => sum + r.points, 0),
    rooms: summary.rooms.length,
    worstAverage: Math.max(...summary.rooms.map((r) => worstAverage(r.total))),
    worstFar: Math.max(
      ...summary.rooms.filter((r) => r.name !== BUSY_ROOM).map((r) => worstFar(r.total)),
    ),
    busyWorstFar: worstFar(summary.rooms.find((r) => r.name === BUSY_ROOM)?.total ?? []),
    worstMin: Math.max(
      ...summary.rooms.filter((r) => r.name !== BUSY_ROOM).map((r) => worstMin(r.total)),
    ),
    busyWorstMin: worstMin(summary.rooms.find((r) => r.name === BUSY_ROOM)?.total ?? []),
    furnishedBefore: Math.max(
      ...furnished.map(
        (r) => r.features.find((f) => f.step === 'furniture-shadows')!.meanPointError,
      ),
    ),
    furnishedAfter: Math.max(
      ...furnished.map((r) => r.features[r.features.length - 1]!.meanPointError),
    ),
    directOnlyMin: Math.min(...directOnly),
    directOnlyMax: Math.max(...directOnly),
    oursMinMs: Math.min(...ours),
    oursMaxMs: Math.max(...ours),
    radianceMinS: Math.min(...radiance),
    radianceMaxS: Math.max(...radiance),
    machine: timings.machine.cpu,
  };
}

/** What each feature step does, over all rooms: the figures the feature page quotes. */
export interface StepFigures {
  /** Mean point error after adding bounced light, worst room without furniture. */
  readonly bouncedEmptyMax: number;
  /** Worst near point before and after splitting openings, worst room. */
  readonly nearBeforeSplit: number;
  readonly nearAfterSplit: number;
  /** The largest rise in a room's worst surface average from splitting openings. */
  readonly splitAverageRise: number;
  /** Mean point error before and after furniture shadows, worst furnished room. */
  readonly beforeShadows: number;
  readonly afterShadows: number;
  /** The largest rise in a room's worst near point from furniture shadows. */
  readonly shadowsNearRise: number;
  /** The furnished rooms' worst mean point error with black furniture hiding bounced light, and with it reflecting too. */
  readonly hidesOnly: number;
  readonly hidesAndReflects: number;
  /** Each step's median time, averaged over the rooms, in ms. */
  readonly stepMs: readonly { readonly step: string; readonly ms: number }[];
}

/** Figures for each feature step, from summary.json and timings.json. */
export function stepFigures(summary: AccuracySummary, timings: Timings): StepFigures {
  const at = (room: RoomSummary, step: string) => room.features.find((f) => f.step === step)!;
  const empty = summary.rooms.filter((r) => r.withoutFurniture.length === 0);
  const furnished = summary.rooms.filter((r) => r.withoutFurniture.length > 0);
  const steps = timings.rooms[0]!.steps.map((s) => s.step);
  return {
    bouncedEmptyMax: Math.max(...empty.map((r) => at(r, 'bounced-light').meanPointError)),
    nearBeforeSplit: Math.max(...summary.rooms.map((r) => at(r, 'bounced-light').worstNear)),
    nearAfterSplit: Math.max(...summary.rooms.map((r) => at(r, 'split-openings').worstNear)),
    splitAverageRise: Math.max(
      0,
      ...summary.rooms.map(
        (r) => at(r, 'split-openings').worstAverage - at(r, 'bounced-light').worstAverage,
      ),
    ),
    beforeShadows: Math.max(...furnished.map((r) => at(r, 'split-openings').meanPointError)),
    afterShadows: Math.max(...furnished.map((r) => at(r, 'furniture-shadows').meanPointError)),
    shadowsNearRise: Math.max(
      0,
      ...summary.rooms.map(
        (r) => at(r, 'furniture-shadows').worstNear - at(r, 'split-openings').worstNear,
      ),
    ),
    hidesOnly: Math.max(...furnished.map((r) => at(r, 'furniture-hides-bounce').meanPointError)),
    hidesAndReflects: Math.max(
      ...furnished.map((r) => at(r, 'furniture-in-bounce').meanPointError),
    ),
    stepMs: steps.map((step) => ({
      step,
      ms:
        timings.rooms.reduce((sum, r) => sum + r.steps.find((s) => s.step === step)!.medianMs, 0) /
        timings.rooms.length,
    })),
  };
}
