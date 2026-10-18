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
  /**
   * A texture the host's TextureProvider supplies, by id. Its image replaces
   * `color`, scaled so its average brightness equals `reflectance` (ADR 0050).
   */
  readonly texture?: string;
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

/** The built-in furniture pieces (ADR 0047). */
export type FurnitureKind =
  | 'sofa'
  | 'armchair'
  | 'coffee-table'
  | 'tv-unit'
  | 'plant'
  | 'dining-table'
  | 'chair'
  | 'desk'
  | 'office-chair'
  | 'bookcase'
  | 'bed'
  | 'kitchen-island'
  | 'display-plinth'
  | 'artwork';

/** The furniture palette's finishes; `FINISHES` has their colours and reflectances. */
export type FinishName =
  | 'oak'
  | 'walnut'
  | 'white'
  | 'charcoal'
  | 'metal'
  | 'linen'
  | 'slate'
  | 'concrete'
  | 'terracotta'
  | 'leaf'
  | 'leafLight'
  | 'soil';

/** A piece's outer size: width along its x, depth along its z (front to back), height up. */
export interface FurnitureSize {
  readonly width: number;
  readonly depth: number;
  readonly height: number;
}

/** A piece's two finishes. What each covers depends on the piece, e.g. a sofa's upholstery and legs. */
export interface FurnitureFinish {
  readonly main: FinishName;
  readonly accent: FinishName;
}

/** A placed piece of furniture. It shapes the room and catches light, but gives none. */
export interface Furniture {
  readonly id: string;
  readonly kind: FurnitureKind;
  /**
   * On the floor: the centre of the piece's footprint, so y = 0. On a wall
   * (artwork): the centre of its back, on the wall.
   */
  readonly position: Vec3;
  /**
   * Turn around the vertical in degrees, in [−180, 180). At 0 the piece's
   * front faces +z; 90 turns it to face +x. Wall pieces face away from their wall.
   */
  readonly rotationDeg: number;
  readonly size: FurnitureSize;
  readonly finish: FurnitureFinish;
}

/** The surfaces a window can be in: a wall, or the ceiling (a skylight). */
export type WindowSurface = 'wall-x-' | 'wall-x+' | 'wall-z-' | 'wall-z+' | 'ceiling';

/** The glass in a window: clear, tinted (darker), or frosted (it scatters what it lets through). */
export type GlazingKind = 'clear' | 'tinted' | 'frosted';

/** What covers a window: nothing, a sheer curtain (it scatters light), or a closed blind. */
export type WindowCovering = 'none' | 'sheer' | 'blind';

/**
 * An opening in a wall or the ceiling, glazed (ADR 0078). On a wall, `width`
 * runs along it and `height` up it; in the ceiling, `width` runs along x and
 * `height` along z. Named RoomWindow so it doesn't hide the DOM's Window.
 */
export interface RoomWindow {
  readonly id: string;
  readonly surface: WindowSurface;
  /** The opening's centre, on its surface (a wall's plane, or the ceiling's). */
  readonly position: Vec3;
  readonly width: number;
  readonly height: number;
  readonly glazing: GlazingKind;
  readonly covering: WindowCovering;
}

/** The three kinds of things placed in a room. */
export type ItemKind = 'luminaire' | 'furniture' | 'window';

/** A luminaire, a piece of furniture or a window, with its kind, e.g. as found by `findItem`. */
export type SceneItem =
  | { readonly kind: 'luminaire'; readonly item: Luminaire }
  | { readonly kind: 'furniture'; readonly item: Furniture }
  | { readonly kind: 'window'; readonly item: RoomWindow };

/** A luminaire, a piece of furniture or a window by id, e.g. as picked in the viewport. */
export type PickTarget =
  | { readonly kind: 'luminaire'; readonly id: string }
  | { readonly kind: 'furniture'; readonly id: string }
  | { readonly kind: 'window'; readonly id: string };

/**
 * The sky outside: overcast, or clear with the sun. Night is a time, not a
 * sky: once the sun is below the horizon there's no daylight.
 */
export type SkyKind = 'overcast' | 'clear';

/**
 * The daylight outside the room's windows (ADR 0079): the sky, when, and
 * where on Earth the room is and which way it faces.
 */
export interface Daylight {
  readonly sky: SkyKind;
  /** Local solar time in hours, 0–24: 12 is solar noon, when the sun is highest. */
  readonly solarHour: number;
  /** The date: month 1–12 and day of the month (years taken as 365 days). */
  readonly month: number;
  readonly day: number;
  /** The site's latitude, in degrees: north positive, south negative. */
  readonly latitudeDeg: number;
  /**
   * Which way north is, in degrees clockwise seen from above from the room's
   * −z (behind the back wall): 0 puts north behind the back wall, 90 behind
   * the right wall (+x).
   */
  readonly northDeg: number;
}

/** The editable document: everything that is saved and undoable. */
export interface Scene {
  readonly room: Room;
  readonly luminaires: readonly Luminaire[];
  readonly furniture: readonly Furniture[];
  readonly windows: readonly RoomWindow[];
  readonly daylight: Daylight;
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
  /** The size of the opening the light leaves from, for calculations close to the luminaire. */
  readonly luminousOpening: LuminousOpening;
  /** Header keywords without brackets, e.g. `LUMINAIRE` or `LUMCAT`. */
  readonly keywords: Readonly<Record<string, string>>;
}

/**
 * The size of a luminaire's light-emitting opening, in m, from its IES file.
 * In the luminaire's own frame: width runs along horizontal 90°–270° (x),
 * length along 0°–180° (z) and height up (y). All zero for a point source,
 * which is what most files state.
 */
export interface LuminousOpening {
  readonly widthM: number;
  readonly lengthM: number;
  readonly heightM: number;
  /** A circle or ellipse seen from below, rather than a rectangle. */
  readonly round: boolean;
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

/** A surface texture's image, as a TextureProvider supplies it. */
export interface TextureImage {
  /** A JPEG or PNG file. Only its colours are used: no normal or roughness maps. */
  readonly data: ArrayBuffer;
  /** How much of the surface one copy of the image covers, in m, along its width and height. */
  readonly widthM: number;
  readonly heightM: number;
}

/**
 * Supplies surface textures, e.g. a flooring catalogue's photos. Injected by
 * the host; core never fetches anything itself (ADR 0050).
 */
export interface TextureProvider {
  /** The texture's image, or undefined if there's none with this id. */
  load(textureId: string): Promise<TextureImage | undefined>;
}

/** A scene a link pointed to, as `SceneStorage.open` returns it. */
export interface SharedScene {
  /** The scene file (`serializeScene`), to read with `parseScene`. */
  readonly file: string;
  /**
   * The link without the shared scene. The app puts it in the address bar once
   * the scene is open, so a reload keeps the user's edits instead of opening
   * the link again.
   */
  readonly pageLink: string;
}

/**
 * Keeps scenes and hands out links to them, e.g. the integrator's backend
 * (ADR 0053). It stores scene files, so a scene's version travels with it.
 */
export interface SceneStorage {
  /** Keeps a scene file and returns a link that opens a copy of it. */
  share(file: string): Promise<string>;
  /**
   * The scene `link` points to, or undefined if it points to none. The app
   * calls it once, with the page's own address, when it starts.
   */
  open(link: string): Promise<SharedScene | undefined>;
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
