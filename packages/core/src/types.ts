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

/**
 * A luminaire's measured light distribution, from an IES LM-63 file
 * (Type C photometry). Angles follow LM-63: vertical 0° points straight down
 * (nadir) and 180° straight up; horizontal 0° runs along the luminaire's
 * length and increases anticlockwise seen from above. The range of the
 * horizontal angles says which symmetry the file assumes.
 */
export interface Photometry {
  /** Vertical angles in degrees, strictly ascending, within 0–180. */
  readonly verticalDeg: readonly number[];
  /** Horizontal angles in degrees, strictly ascending, as measured. */
  readonly horizontalDeg: readonly number[];
  /**
   * Luminous intensity in cd: one row per horizontal angle, one value per
   * vertical angle. Already scaled by the file's multiplier and ballast factors.
   */
  readonly candela: readonly (readonly number[])[];
  /** Input power in W, as stated in the file. */
  readonly power: number;
  /** Header keywords without brackets, e.g. `LUMINAIRE` or `LUMCAT`. */
  readonly keywords: Readonly<Record<string, string>>;
}

/** Synchronous product lookup supplied by the host. */
export interface Catalog {
  /** The product with this id, or undefined if the catalog doesn't have it. */
  get(productId: string): Product | undefined;
}

/**
 * Supplies products' IES files, e.g. from a backend's download links.
 * Injected by the host; core never fetches anything itself.
 */
export interface PhotometryProvider {
  /**
   * The text of the product's IES LM-63 file, or undefined if it has none.
   * Decoding the bytes is up to the host (IES files are usually ASCII or Latin-1).
   */
  load(productId: string): Promise<string | undefined>;
}

/**
 * Supplies products' 3D models, e.g. from a backend's download links.
 * Injected by the host; core never fetches anything itself. Models follow the
 * conventions in ADR 0043: binary glTF, metres, Y up, origin at the mounting
 * point, front towards +Z.
 */
export interface ModelProvider {
  /** The product's model as a binary glTF (.glb) file, or undefined if it has none. */
  load(productId: string): Promise<ArrayBuffer | undefined>;
}
