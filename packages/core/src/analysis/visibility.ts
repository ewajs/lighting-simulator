// Furniture hiding bounced light (ADR 0063): how much of a patch a point sees
// past the furniture's boxes, for the radiosity's Visibility hook. Each patch
// is seen through its sample points: a ray to each one, blocked or not.
import type { Vec3 } from '../types';
import {
  boundsMeetBlockers,
  prepareBlockers,
  segmentBlockedPrepared,
  type Blocker,
} from './occlusion';
import type { Patch } from './patches';
import { UNBLOCKED, type Visibility } from './radiosity';

/**
 * The share of a patch a point sees past `blockers`, 0–1: the share of the
 * patch's sample points it has a clear line to. Every point sees every patch
 * when there's nothing in the way. (One ray to a far patch's centre was 30 %
 * faster and up to 1.7 points less accurate: ADR 0063.)
 */
export function boxVisibility(blockers: readonly Blocker[]): Visibility {
  if (blockers.length === 0) return UNBLOCKED;
  const boxes = prepareBlockers(blockers);
  return (from: Vec3, to: Patch) => {
    // Most patches are seen past no furniture at all: if no box comes near the
    // space between the point and the patch, there's nothing to test.
    const b = patchBounds(to);
    if (
      !boundsMeetBlockers(
        boxes,
        Math.min(from.x, b[0]!),
        Math.min(from.y, b[1]!),
        Math.min(from.z, b[2]!),
        Math.max(from.x, b[3]!),
        Math.max(from.y, b[4]!),
        Math.max(from.z, b[5]!),
      )
    ) {
      return 1;
    }
    let seen = 0;
    for (const s of to.samples) {
      if (!segmentBlockedPrepared(boxes, from.x, from.y, from.z, s.x, s.y, s.z)) seen++;
    }
    return seen / to.samples.length;
  };
}

const bounds = new WeakMap<Patch, Float64Array>();

/** A patch's bounds, min x, y, z then max x, y, z, worked out once per patch. */
function patchBounds(patch: Patch): Float64Array {
  let b = bounds.get(patch);
  if (!b) {
    const xs = patch.vertices.map((v) => v.x);
    const ys = patch.vertices.map((v) => v.y);
    const zs = patch.vertices.map((v) => v.z);
    b = Float64Array.of(
      Math.min(...xs),
      Math.min(...ys),
      Math.min(...zs),
      Math.max(...xs),
      Math.max(...ys),
      Math.max(...zs),
    );
    bounds.set(patch, b);
  }
  return b;
}
