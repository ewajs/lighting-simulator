// Scene files (ADR 0051): a scene as versioned JSON, written with
// `serializeScene` and read back with `parseScene`. A file comes from
// outside, so reading it checks every field and keeps only the known ones.
// Pure functions, tested in Node.

import { assertFurniture } from './furniture';
import { assertLuminaire } from './luminaires';
import { assertRoom } from './room';
import { assertWindow } from './windows';
import type {
  GlazingKind,
  RoomWindow,
  WindowCovering,
  WindowSurface,
  Catalog,
  FinishName,
  FurnitureKind,
  Furniture,
  Luminaire,
  Room,
  Scene,
  Surface,
  Vec3,
} from './types';

/**
 * Turns the scene of a file of one version into the next version's: index i
 * upgrades version i + 1.
 */
export type SceneUpgrade = (scene: unknown) => unknown;
const UPGRADES: readonly SceneUpgrade[] = [
  // 1 → 2: scenes gained windows (ADR 0078); a version 1 scene has none.
  (scene) => (isRecord(scene) ? { ...scene, windows: [] } : scene),
];

/** What every scene file says it is, so other JSON files are told apart. */
export const SCENE_FILE_FORMAT = 'lux-studio-scene';
/** The version this library writes, and the newest it reads: one past the last upgrade. */
export const SCENE_FILE_VERSION = UPGRADES.length + 1;
/** The file name extension for scene files. */
export const SCENE_FILE_EXTENSION = '.luxstudio.json';

/** A scene file's contents. */
export interface SceneFile {
  readonly format: typeof SCENE_FILE_FORMAT;
  readonly version: number;
  readonly scene: Scene;
}

/** Why a file couldn't be read: not a scene file, a newer version's, or damaged. */
export type SceneFileProblem = 'not-a-scene' | 'newer-version' | 'invalid';

/** Thrown by `parseScene`. `problem` says why, e.g. for a translated message; `message` gives the detail. */
export class SceneFileError extends Error {
  readonly problem: SceneFileProblem;

  constructor(problem: SceneFileProblem, message: string) {
    super(message);
    this.name = 'SceneFileError';
    this.problem = problem;
  }
}

/** The scene as the text of a scene file: indented JSON, so files read and diff well. */
export function serializeScene(scene: Scene): string {
  const file: SceneFile = { format: SCENE_FILE_FORMAT, version: SCENE_FILE_VERSION, scene };
  return `${JSON.stringify(file, null, 2)}\n`;
}

/**
 * The scene in a scene file's text. Files from older versions are upgraded
 * step by step (`upgrades` is for tests). Throws a SceneFileError for
 * anything else: not JSON, not a scene file, a newer version, or a field
 * missing or out of range.
 */
export function parseScene(text: string, upgrades: readonly SceneUpgrade[] = UPGRADES): Scene {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new SceneFileError('not-a-scene', 'The file is not JSON');
  }
  const file = isRecord(data) ? data : {};
  if (file.format !== SCENE_FILE_FORMAT) {
    throw new SceneFileError('not-a-scene', `The file's format is not "${SCENE_FILE_FORMAT}"`);
  }
  const newest = upgrades.length + 1;
  const { version } = file;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    throw new SceneFileError(
      'invalid',
      `version must be a whole number from 1, got ${String(version)}`,
    );
  }
  if (version > newest) {
    throw new SceneFileError(
      'newer-version',
      `The file is version ${version}; this version of Lux Studio reads up to ${newest}`,
    );
  }
  let raw = file.scene;
  for (let from = version; from < newest; from++) raw = upgrades[from - 1]!(raw);
  try {
    const scene = readScene(raw);
    assertScene(scene);
    return scene;
  } catch (error) {
    throw new SceneFileError('invalid', error instanceof Error ? error.message : String(error));
  }
}

/** Throws a RangeError naming the field if a scene isn't valid, or two items share an id. */
export function assertScene(scene: Scene): void {
  assertRoom(scene.room);
  scene.luminaires.forEach(assertLuminaire);
  scene.furniture.forEach(assertFurniture);
  scene.windows.forEach(assertWindow);
  const ids = new Set<string>();
  for (const { id } of [...scene.luminaires, ...scene.furniture, ...scene.windows]) {
    if (ids.has(id)) throw new RangeError(`Two items share the id "${id}"`);
    ids.add(id);
  }
}

/** The product ids the scene's luminaires use that `catalog` doesn't have, each once. */
export function unknownProducts(scene: Scene, catalog: Catalog): string[] {
  const ids = new Set(scene.luminaires.map((l) => l.productId));
  return [...ids].filter((id) => !catalog.get(id));
}

// Readers for untrusted data: each checks the type of every field it takes and
// builds a fresh object, so unknown fields are dropped. Ranges are checked
// afterwards by the scene's own assertions.

function readScene(value: unknown): Scene {
  const scene = record(value, 'scene');
  return {
    room: readRoom(scene.room),
    luminaires: list(scene.luminaires, 'luminaires').map(readLuminaire),
    furniture: list(scene.furniture, 'furniture').map(readFurniture),
    windows: list(scene.windows, 'windows').map(readWindow),
  };
}

function readWindow(value: unknown, index: number): RoomWindow {
  const window = record(value, `windows[${index}]`);
  const name = `windows[${index}]`;
  return {
    id: string(window.id, `${name}.id`),
    surface: string(window.surface, `${name}.surface`) as WindowSurface,
    position: vec3(window.position, `${name}.position`),
    width: number(window.width, `${name}.width`),
    height: number(window.height, `${name}.height`),
    glazing: string(window.glazing, `${name}.glazing`) as GlazingKind,
    covering: string(window.covering, `${name}.covering`) as WindowCovering,
  };
}

function readRoom(value: unknown): Room {
  const room = record(value, 'room');
  const surfaces = record(room.surfaces, 'room.surfaces');
  return {
    width: number(room.width, 'room.width'),
    depth: number(room.depth, 'room.depth'),
    height: number(room.height, 'room.height'),
    surfaces: {
      floor: readSurface(surfaces.floor, 'floor'),
      walls: readSurface(surfaces.walls, 'walls'),
      ceiling: readSurface(surfaces.ceiling, 'ceiling'),
    },
  };
}

function readSurface(value: unknown, name: string): Surface {
  const surface = record(value, name);
  const read = {
    color: string(surface.color, `${name}.color`),
    reflectance: number(surface.reflectance, `${name}.reflectance`),
  };
  return surface.texture === undefined
    ? read
    : { ...read, texture: string(surface.texture, `${name}.texture`) };
}

function readLuminaire(value: unknown, index: number): Luminaire {
  const path = `luminaires[${index}]`;
  const luminaire = record(value, path);
  const aim = record(luminaire.aim, `${path}.aim`);
  return {
    id: string(luminaire.id, `${path}.id`),
    productId: string(luminaire.productId, `${path}.productId`),
    position: vec3(luminaire.position, `${path}.position`),
    aim: {
      tiltDeg: number(aim.tiltDeg, `${path}.aim.tiltDeg`),
      panDeg: number(aim.panDeg, `${path}.aim.panDeg`),
    },
    dimming: number(luminaire.dimming, `${path}.dimming`),
    on: boolean(luminaire.on, `${path}.on`),
    cct: number(luminaire.cct, `${path}.cct`),
  };
}

function readFurniture(value: unknown, index: number): Furniture {
  const path = `furniture[${index}]`;
  const piece = record(value, path);
  const size = record(piece.size, `${path}.size`);
  const finish = record(piece.finish, `${path}.finish`);
  return {
    id: string(piece.id, `${path}.id`),
    // Checked against the known kinds and finishes by assertFurniture.
    kind: string(piece.kind, `${path}.kind`) as FurnitureKind,
    position: vec3(piece.position, `${path}.position`),
    rotationDeg: number(piece.rotationDeg, `${path}.rotationDeg`),
    size: {
      width: number(size.width, `${path}.size.width`),
      depth: number(size.depth, `${path}.size.depth`),
      height: number(size.height, `${path}.size.height`),
    },
    finish: {
      main: string(finish.main, `${path}.finish.main`) as FinishName,
      accent: string(finish.accent, `${path}.finish.accent`) as FinishName,
    },
  };
}

function vec3(value: unknown, path: string): Vec3 {
  const point = record(value, path);
  return {
    x: number(point.x, `${path}.x`),
    y: number(point.y, `${path}.y`),
    z: number(point.z, `${path}.z`),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) throw new RangeError(`${path} must be an object`);
  return value;
}

function list(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) throw new RangeError(`${path} must be a list`);
  return value;
}

function number(value: unknown, path: string): number {
  if (typeof value !== 'number') throw new RangeError(`${path} must be a number`);
  return value;
}

function string(value: unknown, path: string): string {
  if (typeof value !== 'string') throw new RangeError(`${path} must be text`);
  return value;
}

function boolean(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') throw new RangeError(`${path} must be true or false`);
  return value;
}
