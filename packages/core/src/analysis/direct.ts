// Direct illuminance at a point: the light that reaches it straight from the
// luminaires, before any bounces (ADR 0057). For each point source,
//
//   E = I(θ, φ) · cos α / d²
//
// where I is the source's intensity in cd towards the point (θ, φ its Type C
// angles), d the distance in m and α the angle between the surface's normal
// and the direction to the source. This is the inverse-square law with
// Lambert's cosine law (e.g. IES Lighting Handbook, 10th ed., ch. 9). The
// result is in lux (lm/m²). A source behind the surface, or hidden by
// furniture, adds nothing.

import { frameAngles } from '../luminaire-frame';
import { dot, length, scale, subtract } from '../math';
import type { Vec3 } from '../types';
import { segmentBlocked, type Blocker } from './occlusion';
import { intensityAt, type PointSource } from './sources';

/** Direct illuminance in lx on a surface at `point` facing `normal` (a unit vector). */
export function directIlluminance(
  point: Vec3,
  normal: Vec3,
  sources: readonly PointSource[],
  blockers: readonly Blocker[],
): number {
  let lux = 0;
  for (const source of sources) {
    const toSource = subtract(source.position, point);
    const distance = length(toSource);
    if (distance === 0) continue;
    const cosIncidence = dot(normal, toSource) / distance;
    if (cosIncidence <= 0) continue; // The source is behind the surface.
    const fromSource = scale(toSource, -1 / distance);
    const { verticalDeg, horizontalDeg } = frameAngles(source.frame, fromSource);
    const candela = intensityAt(source.distribution, verticalDeg, horizontalDeg) * source.scale;
    if (candela === 0) continue;
    if (segmentBlocked(point, source.position, blockers)) continue;
    lux += (candela * cosIncidence) / distance ** 2;
  }
  return lux;
}
