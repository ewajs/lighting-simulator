// A scene's light, direct and bounced, ready to be read at any point: the
// lux probe's question, and each grid point's (ADR 0060).

import type { Room, Scene, Vec3 } from '../types';
import { directIlluminance } from './direct';
import { directLight, type DirectLight } from './direct-light';
import { DEFAULT_CALCULATION_OPTIONS, type CalculationOptions } from './options';
import { AnalysisCache, bounceGeometryKey } from './cache';
import { boxPatches, roomPatches } from './patches';
import {
  daylightIlluminance,
  daylightSources,
  NO_DAYLIGHT,
  withoutOpenings,
  type DaylightSources,
} from './window-light';
import { skyFor } from './sky';
import { boxVisibility } from './visibility';
import {
  formFactors,
  indirectIlluminanceAt,
  solveIndirectLight,
  type IndirectLight,
} from './radiosity';
import { DEFAULT_ANALYSIS_SETTINGS, type AnalysisInputs, type AnalysisSettings } from './settings';

/** A scene's light: straight from the luminaires, through the windows, and reflected by the room. */
export interface SceneLight {
  readonly direct: DirectLight;
  /** The daylight through the windows (ADR 0080), and the windows the room's light leaves through. */
  readonly daylight: DaylightSources;
  readonly indirect: IndirectLight;
}

/** The light at one point, in maintained lux. */
export interface PointIlluminance {
  /** Straight from the luminaires. */
  readonly directLx: number;
  /** Through the windows, from the sky, the ground and the sun: before any bounce. */
  readonly daylightLx: number;
  /** Reflected by the room's surfaces, after every bounce. */
  readonly indirectLx: number;
  readonly totalLx: number;
}

/**
 * Prepares a scene's light: its luminaires and shadows, the daylight through
 * its windows, then the light its floor, ceiling and walls reflect, solved over patches of at most the
 * options' `patchSizeM`. Values are maintained: multiplied by the settings'
 * maintenance factor.
 *
 * @throws RangeError if the settings don't fit the room.
 */
export function sceneLight(
  scene: Scene,
  inputs: AnalysisInputs,
  settings: AnalysisSettings = DEFAULT_ANALYSIS_SETTINGS,
  options: CalculationOptions = DEFAULT_CALCULATION_OPTIONS,
  cache?: AnalysisCache,
): SceneLight {
  const direct = directLight(scene, inputs, settings, options);
  const cellM = options.splitOpenings ? options.sourceCellM : Number.POSITIVE_INFINITY;
  const sky = options.daylight ? skyFor(scene.daylight) : undefined;
  const daylight = daylightSources(scene, cellM, sky);
  return {
    direct,
    daylight,
    indirect: indirectLight(scene.room, direct, options, cache, daylight),
  };
}

/**
 * The light a room's floor, ceiling and walls reflect, after every bounce,
 * given its direct light and daylight: solved over patches of at most the
 * options' `patchSizeM`. Light reaching a window leaves the room. With
 * furniture in bounced light, its boxes hide patches from each other and
 * their faces reflect too. None, over no patches, when the options leave
 * bounced light out. With a `cache`, the form factors of a room calculated
 * before are reused (ADR 0065), and so is its daylight while the sky and
 * windows stay (ADR 0080).
 */
export function indirectLight(
  room: Room,
  direct: DirectLight,
  options: CalculationOptions = DEFAULT_CALCULATION_OPTIONS,
  cache?: AnalysisCache,
  daylight: DaylightSources = NO_DAYLIGHT,
): IndirectLight {
  if (!options.bouncedLight) {
    return { patches: [], exitance: new Float64Array(0), iterations: 0, blockers: [] };
  }
  // Furniture hides and reflects bounced light when it counts (ADR 0063);
  // luminaires' bodies hide it, and reflect none (ADR 0075).
  const furniture = options.furnitureInBouncedLight ? direct.blockers : [];
  const blockers = [...furniture, ...(options.luminaireBodies ? direct.bodies : [])];
  const patches = [
    ...roomPatches(room, options.patchSizeM).map((patch) =>
      withoutOpenings(patch, daylight.windows),
    ),
    ...furniture.flatMap((blocker) => boxPatches(blocker, options.patchSizeM)),
  ];
  // Each patch's direct light, averaged over its sample points: a spot's
  // sharp-edged pool lands partly on a patch.
  const average = (light: (sample: Vec3, normal: Vec3) => number) =>
    Float64Array.from(patches, (patch) => {
      let sum = 0;
      for (const sample of patch.samples) sum += light(sample, patch.normal);
      return sum / patch.samples.length;
    });
  const fromLuminaires = average((sample, normal) =>
    directIlluminance(sample, normal, direct.sources, direct.blockers),
  );
  // The daylight doesn't change with the luminaires: kept while the room, its windows and the sky are.
  const geometry = bounceGeometryKey(room, blockers, options.patchSizeM);
  const computeDaylight = () =>
    average((sample, normal) => daylightIlluminance(sample, normal, daylight, direct.blockers));
  const fromDaylight = !daylight.sky
    ? new Float64Array(patches.length)
    : cache
      ? cache.patchDaylight(
          JSON.stringify([geometry, daylight.key, direct.blockers]),
          computeDaylight,
        )
      : computeDaylight();
  const directOnPatches = fromLuminaires.map((lux, i) => lux + fromDaylight[i]!);
  const compute = () => formFactors(patches, boxVisibility(blockers));
  const factors = cache ? cache.formFactors(geometry, compute) : compute();
  return solveIndirectLight(patches, factors, directOnPatches, options.tolerance, blockers);
}

/** The light at a point facing `normal` (a unit vector), direct, through the windows, and bounced. */
export function illuminanceAt(light: SceneLight, point: Vec3, normal: Vec3): PointIlluminance {
  const directLx = directIlluminance(point, normal, light.direct.sources, light.direct.blockers);
  const daylightLx = daylightIlluminance(point, normal, light.daylight, light.direct.blockers);
  const indirectLx = indirectIlluminanceAt(
    point,
    normal,
    light.indirect,
    boxVisibility(light.indirect.blockers),
  );
  return { directLx, daylightLx, indirectLx, totalLx: directLx + daylightLx + indirectLx };
}
