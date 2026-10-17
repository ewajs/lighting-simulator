// The accuracy comparison's results, for the "How Lux Studio calculates"
// page (ADR 0059): accuracy/summary.json, which a test keeps current.
import { defineLoader } from 'vitepress';
import { accuracySummaryText } from './files';

/** One surface of a reference room, compared. */
export interface SurfaceResult {
  readonly surface: string;
  readonly points: number;
  readonly radianceAverageLx: number;
  readonly oursAverageLx: number;
  readonly averageError: number;
  readonly worstFar: number;
  readonly worstNear: number;
}

/** accuracy/summary.json. */
export interface AccuracyData {
  readonly brightShare: number;
  readonly nearM: number;
  readonly rooms: readonly {
    readonly name: string;
    readonly radianceRelease: string;
    readonly points: number;
    /** Straight from the luminaires. */
    readonly direct: readonly SurfaceResult[];
    /** Direct plus every bounce. */
    readonly total: readonly SurfaceResult[];
  }[];
}

declare const data: AccuracyData;
export { data };

export default defineLoader({
  load(): AccuracyData {
    return JSON.parse(accuracySummaryText()) as AccuracyData;
  },
});
