// Every point of every reference room, Radiance's light and Lux Studio's, for
// the manual's Analysis pages (ADR 0062): accuracy/comparison.json, written by
// `npm run accuracy:report` and kept current by report.test.ts.
import type { Vec3 } from '@luxstudio/core';
import { compareReference, type PointComparison, type Reference } from './compare';
import { FEATURE_STEPS } from './features';

/** One surface's points, in the reference's order, with each side's light in lx. */
export interface SurfaceComparison {
  readonly surface: string;
  readonly normal: Vec3;
  /** Each point's position, [x, y, z] in m. */
  readonly points: readonly (readonly [number, number, number])[];
  readonly radiance: { readonly direct: readonly number[]; readonly total: readonly number[] };
  readonly ours: { readonly direct: readonly number[]; readonly total: readonly number[] };
  /** Lux Studio's total at each feature step, by step id (ADR 0061). */
  readonly steps: Readonly<Record<string, readonly number[]>>;
  /** For a furnished room: both sides' total with the furniture taken out. */
  readonly withoutFurniture?: {
    readonly radiance: readonly number[];
    readonly ours: readonly number[];
  };
}

/** A reference room, as built, and every point of its comparison. */
export interface RoomComparison {
  readonly name: string;
  readonly room: Reference['room'];
  readonly surfaces: readonly SurfaceComparison[];
}

const lx = (value: number) => Number(value.toFixed(2));
const m = (value: number) => Number(value.toFixed(3));

/**
 * One reference room's comparison, surface by surface.
 *
 * @param iesFiles The IES files' text by file name.
 */
export function roomComparison(
  name: string,
  reference: Reference,
  iesFiles: Readonly<Record<string, string>>,
): RoomComparison {
  const full = compareReference(reference, iesFiles);
  const steps = FEATURE_STEPS.map(({ id, options }) => ({
    id,
    points: compareReference(reference, iesFiles, options),
  }));
  const empty = reference.withoutFurniture
    ? compareReference(reference, iesFiles, undefined, false)
    : undefined;
  const surfaces = [...new Set(reference.points.map((point) => point.surface))];
  return {
    name,
    room: reference.room,
    surfaces: surfaces.map((surface) => {
      const indices = reference.points.flatMap((point, k) =>
        point.surface === surface ? [k] : [],
      );
      const pick = (points: readonly PointComparison[], value: (p: PointComparison) => number) =>
        indices.map((k) => lx(value(points[k]!)));
      return {
        surface,
        normal: reference.points[indices[0]!]!.normal,
        points: indices.map((k) => {
          const { x, y, z } = reference.points[k]!.position;
          return [m(x), m(y), m(z)] as const;
        }),
        radiance: {
          direct: pick(full, (p) => p.radianceDirectLx),
          total: pick(full, (p) => p.radianceTotalLx),
        },
        ours: {
          direct: pick(full, (p) => p.oursDirectLx),
          total: pick(full, (p) => p.oursTotalLx),
        },
        steps: Object.fromEntries(
          steps.map(({ id, points }) => [id, pick(points, (p) => p.oursTotalLx)]),
        ),
        ...(empty && {
          withoutFurniture: {
            radiance: pick(empty, (p) => p.radianceTotalLx),
            ours: pick(empty, (p) => p.oursTotalLx),
          },
        }),
      };
    }),
  };
}

/** Every room's comparison as accuracy/comparison.json: compact, as it's data for a build. */
export function comparisonJson(rooms: readonly RoomComparison[]): string {
  return `${JSON.stringify({ rooms })}\n`;
}
