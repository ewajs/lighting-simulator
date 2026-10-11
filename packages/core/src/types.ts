/**
 * Scene data model. Plain readonly data, SI units (metres, watts, lumens,
 * kelvin) unless a name says otherwise (e.g. `beamDeg`).
 *
 * Coordinates: Y is up and the room is centred on the origin. The floor is
 * y = 0, x spans ±width/2 and z spans ±depth/2. The back wall is z = −depth/2.
 */

/** A point in metres. */
export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** A point on the floor plan, in metres. */
export interface FloorPoint {
  readonly x: number;
  readonly z: number;
}

/** Finish of a room surface. */
export interface Surface {
  /** sRGB hex colour, e.g. `#f2f0ec`. */
  readonly color: string;
  /** Diffuse reflectance ρ, 0–1 (exclusive of 1). */
  readonly reflectance: number;
}

/** The room surfaces that can be finished independently. */
export type SurfaceName = 'floor' | 'walls' | 'ceiling';

/** A rectangular room. */
export interface Room {
  readonly width: number;
  readonly depth: number;
  readonly height: number;
  readonly surfaces: Readonly<Record<SurfaceName, Surface>>;
}

/** How a product is installed. Decides where it can be placed. */
export type MountType = 'recessed' | 'pendant' | 'track' | 'wall' | 'floor' | 'table';

/**
 * What the simulation needs to know about a product. Display data (name,
 * finish, category, images) belongs to the host's catalog, not to core.
 */
export interface Product {
  readonly id: string;
  readonly mount: MountType;
  /** Electrical power in W. */
  readonly power: number;
  /** Luminous flux in lm. */
  readonly flux: number;
  /** Nominal colour temperature in K. */
  readonly cct: number;
  /** Full beam angle in degrees. */
  readonly beamDeg: number;
  /** Pendants only: distance from the ceiling to the fixture, in m. */
  readonly suspension?: number;
}

/** Where a luminaire points. Zero tilt points straight down. */
export interface Aim {
  readonly tiltDeg: number;
  readonly panDeg: number;
}

/** A placed instance of a product. */
export interface Luminaire {
  readonly id: string;
  readonly productId: string;
  readonly position: Vec3;
  readonly aim: Aim;
  /** Output level, 0–1. */
  readonly dimming: number;
  readonly on: boolean;
  /** Colour temperature in K. Starts at the product's nominal CCT. */
  readonly cct: number;
}

/** The editable document: everything that is saved and undoable. */
export interface Scene {
  readonly room: Room;
  readonly luminaires: readonly Luminaire[];
}

/** Synchronous product lookup supplied by the host. */
export interface Catalog {
  get(productId: string): Product | undefined;
}
