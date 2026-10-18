// What a room's bounced light keeps between calculations (ADR 0065). Most of
// its work depends only on the room's shape and its furniture: the form
// factors between patches, and how much each grid point sees of each patch.
// A change to the light alone (moving, dimming or adding a luminaire) or to a
// surface's reflectance doesn't touch them, so a live calculation reuses them.

import type { Room } from '../types';
import type { CalcGrid } from './calc-grid';
import type { Blocker } from './occlusion';
import type { FormFactors } from './radiosity';

/**
 * What the shared parts depend on: the room's size, the furniture's boxes
 * (when they take part in bounced light) and the patch size. Not the
 * reflectances, which only the solve uses, nor the luminaires.
 */
export function bounceGeometryKey(
  room: Pick<Room, 'width' | 'depth' | 'height'>,
  blockers: readonly Blocker[],
  patchSizeM: number,
): string {
  return JSON.stringify([
    room.width,
    room.depth,
    room.height,
    patchSizeM,
    blockers.map(({ centre, half, yawRad }) => [centre, half, yawRad]),
  ]);
}

/**
 * Keeps one room's form factors and grid views between calculations: the
 * latest geometry only, so a room that changes shape starts again. Hold one
 * for as long as calculations follow each other, e.g. in a Web Worker.
 */
export class AnalysisCache {
  #key: string | undefined;
  #factors: FormFactors | undefined;
  readonly #views = new Map<string, Float64Array>();
  #daylightKey: string | undefined;
  #daylight: Float64Array | undefined;
  #hits = 0;
  #misses = 0;

  /** The form factors for the geometry `key` describes, computed by `compute` the first time. */
  formFactors(key: string, compute: () => FormFactors): FormFactors {
    if (key !== this.#key || !this.#factors) {
      this.#key = key;
      this.#views.clear();
      this.#misses++;
      this.#factors = compute();
    } else {
      this.#hits++;
    }
    return this.#factors;
  }

  /**
   * How much each point of `grid` sees of each patch, for the geometry `key`
   * describes (call `formFactors` with it first): computed by `compute` the
   * first time for this grid.
   */
  gridViews(key: string, grid: CalcGrid, compute: () => Float64Array): Float64Array {
    if (key !== this.#key) return compute();
    const gridKey = `${grid.surface}|${JSON.stringify(grid.points)}`;
    let views = this.#views.get(gridKey);
    if (!views) {
      views = compute();
      this.#views.set(gridKey, views);
    }
    return views;
  }

  /**
   * The daylight on each patch (ADR 0080), for the patches and daylight `key`
   * describes, computed by `compute` the first time: a change to the
   * luminaires alone doesn't change it. The latest one only.
   */
  patchDaylight(key: string, compute: () => Float64Array): Float64Array {
    if (key !== this.#daylightKey || !this.#daylight) {
      this.#daylightKey = key;
      this.#daylight = compute();
    }
    return this.#daylight;
  }

  /** How many calculations reused the form factors, and how many computed them. */
  get stats(): { readonly hits: number; readonly misses: number } {
    return { hits: this.#hits, misses: this.#misses };
  }
}
