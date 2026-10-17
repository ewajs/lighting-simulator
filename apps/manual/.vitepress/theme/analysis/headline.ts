// The few figures the Analysis pages' prose quotes (ADR 0062), computed from
// the data so the text can't contradict the charts.
import type { AccuracySummary, RoomSummary, SurfaceSummary, Timings } from './types';

const worstAverage = (surfaces: readonly SurfaceSummary[]) =>
  Math.max(...surfaces.map((s) => Math.abs(s.averageError)));
const worstFar = (surfaces: readonly SurfaceSummary[]) =>
  Math.max(...surfaces.map((s) => s.worstFar));
/** A room as Lux Studio models it: without its furniture, if it has any. */
const asModelled = (room: RoomSummary) =>
  room.withoutFurniture.length > 0 ? room.withoutFurniture : room.total;

/** The section's headline figures. */
export interface Headline {
  /** Reference points in all rooms. */
  readonly points: number;
  readonly rooms: number;
  /** The worst surface average and far point, every room without furniture (or with it taken out on both sides). */
  readonly modelledAverage: number;
  readonly modelledFar: number;
  /** The same in the furnished rooms as they are. */
  readonly furnishedAverage: number;
  readonly furnishedFar: number;
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
    modelledAverage: Math.max(...summary.rooms.map((r) => worstAverage(asModelled(r)))),
    modelledFar: Math.max(...summary.rooms.map((r) => worstFar(asModelled(r)))),
    furnishedAverage: Math.max(...furnished.map((r) => worstAverage(r.total))),
    furnishedFar: Math.max(...furnished.map((r) => worstFar(r.total))),
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
    stepMs: steps.map((step) => ({
      step,
      ms:
        timings.rooms.reduce((sum, r) => sum + r.steps.find((s) => s.step === step)!.medianMs, 0) /
        timings.rooms.length,
    })),
  };
}
