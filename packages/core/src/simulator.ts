import {
  addFurniture,
  assertFurniture,
  updateFurniture,
  type AddFurnitureOptions,
  type FurniturePatch,
} from './furniture';
import * as history from './history';
import { consoleLogger, type Logger } from './logger';
import { AssetCache } from './asset-cache';
import { MODEL_ASSET, type ModelListener } from './model-asset';
import { PHOTOMETRY_ASSET, type PhotometryListener } from './photometry/asset';
import { TEXTURE_ASSET, type TextureListener } from './texture-asset';
import {
  addLuminaire,
  assertLuminaire,
  assertProduct,
  updateLuminaire,
  type AddLuminaireOptions,
  type LuminairePatch,
} from './luminaires';
import { assertRoom, DEFAULT_ROOM, resizeRoom, setSurface, type RoomSize } from './room';
import { duplicateItems, removeItems } from './scene-items';
import type {
  Catalog,
  FurnitureKind,
  ModelProvider,
  Photometry,
  PhotometryProvider,
  Product,
  Scene,
  Surface,
  SurfaceName,
  TextureImage,
  TextureProvider,
} from './types';

/** Options for edits that can be merged into one undo step. */
export interface EditOptions {
  /**
   * Consecutive edits with the same key become a single undo step, e.g. one
   * key per slider drag.
   */
  readonly mergeKey?: string;
}

/** Called after every scene change, including undo and redo. */
export type SceneListener = (scene: Scene, previous: Scene) => void;

/** What a Simulator is created with: the host's data and, optionally, a starting scene. */
export interface SimulatorOptions {
  /** Product lookup. Every luminaire's productId should resolve here. */
  readonly catalog: Catalog;
  /** Starting scene. Defaults to an empty DEFAULT_ROOM. */
  readonly scene?: Scene;
  /**
   * IES files for products that have them. Without it, or for products it has
   * no file for, light is estimated from the product's flux and beam angle.
   */
  readonly photometry?: PhotometryProvider;
  /**
   * 3D models (binary glTF) for products that have them. Without it, or for
   * products it has no model for, luminaires are drawn as simple placeholders.
   */
  readonly models?: ModelProvider;
  /**
   * Images for surfaces that name a texture (ADR 0050). Without it, or for
   * ids it has no image for, those surfaces show their colour.
   */
  readonly textures?: TextureProvider;
  /**
   * Where the library reports what it does (ADR 0044). Defaults to the
   * console, warnings and errors only; `consoleLogger('debug')` shows every
   * step. The viewport logs through the same one.
   */
  readonly logger?: Logger;
}

/**
 * The core entry point: owns the scene, its edits and their undo history.
 *
 * ```ts
 * const sim = new Simulator({ catalog });
 * const id = sim.addLuminaire('spot-7w', { at: { x: 1, z: -1 } });
 * sim.undo();
 * ```
 */
export class Simulator {
  readonly #catalog: Catalog;
  readonly #photometry: AssetCache<string, Photometry>;
  readonly #models: AssetCache<ArrayBuffer, ArrayBuffer>;
  readonly #textures: AssetCache<TextureImage, TextureImage>;
  readonly #logger: Logger;
  readonly #listeners = new Set<SceneListener>();
  #scene: Scene;
  #history = history.emptyHistory<Scene>();

  constructor({ catalog, scene, photometry, models, textures, logger }: SimulatorOptions) {
    const initial = scene ?? { room: DEFAULT_ROOM, luminaires: [], furniture: [] };
    assertRoom(initial.room);
    initial.luminaires.forEach(assertLuminaire);
    initial.furniture.forEach(assertFurniture);
    this.#catalog = catalog;
    this.#logger = logger ?? consoleLogger();
    this.#photometry = new AssetCache(photometry, PHOTOMETRY_ASSET, this.#logger);
    this.#models = new AssetCache(models, MODEL_ASSET, this.#logger);
    this.#textures = new AssetCache(textures, TEXTURE_ASSET, this.#logger);
    this.#scene = initial;
    const { width, depth, height } = initial.room;
    this.#logger.debug(
      `[scene] Started: ${width} × ${depth} × ${height} m room, ${initial.luminaires.length} luminaires, ${initial.furniture.length} pieces of furniture`,
    );
  }

  /** Where the library reports what it does; see `SimulatorOptions.logger`. */
  get logger(): Logger {
    return this.#logger;
  }

  /** The product lookup this simulator was created with. */
  get catalog(): Catalog {
    return this.#catalog;
  }

  /**
   * The product's parsed IES photometry, or undefined while it loads or if it
   * has none. The first call for a product starts loading it from the provider;
   * `onPhotometry` reports when it arrives. A file that fails to load or parse
   * is reported as a warning to the logger and treated as missing.
   */
  photometry(productId: string): Photometry | undefined {
    return this.#photometry.get(productId);
  }

  /** Calls `listener` when a product's photometry loads. Returns an unsubscribe function. */
  onPhotometry(listener: PhotometryListener): () => void {
    return this.#photometry.subscribe(listener);
  }

  /**
   * The product's 3D model file (binary glTF), or undefined while it loads or
   * if it has none. The first call starts loading it; `onModel` reports when it
   * arrives. A file that fails to load or isn't a .glb is reported as a
   * warning to the logger and treated as missing.
   */
  model(productId: string): ArrayBuffer | undefined {
    return this.#models.get(productId);
  }

  /** Calls `listener` when a product's model loads. Returns an unsubscribe function. */
  onModel(listener: ModelListener): () => void {
    return this.#models.subscribe(listener);
  }

  /**
   * A surface texture's image, or undefined while it loads or if there's
   * none. The first call starts loading it; `onTexture` reports when it
   * arrives. An image that fails to load or isn't a JPEG or PNG is reported
   * as a warning to the logger and treated as missing.
   */
  texture(textureId: string): TextureImage | undefined {
    return this.#textures.get(textureId);
  }

  /** Calls `listener` when a texture loads. Returns an unsubscribe function. */
  onTexture(listener: TextureListener): () => void {
    return this.#textures.subscribe(listener);
  }

  /** Current scene snapshot. Never mutate it; it is replaced on every change. */
  get scene(): Scene {
    return this.#scene;
  }

  /**
   * Resizes the room. Luminaires outside the new walls are moved back inside,
   * mount by mount, and so is furniture.
   */
  setRoomSize(size: Partial<RoomSize>, options?: EditOptions): void {
    this.#commit(resizeRoom(this.#scene, size, this.#catalog), options, 'Resize room', size);
  }

  /**
   * Changes a room surface's colour, reflectance or texture. `texture:
   * undefined` takes the texture off.
   */
  setSurface(name: SurfaceName, patch: Partial<Surface>, options?: EditOptions): void {
    this.#commit(setSurface(this.#scene, name, patch), options, `Finish ${name}`, patch);
  }

  /**
   * Adds a luminaire and returns its id. It starts at the product's defaults,
   * standing over `at`, with any other fields given set as by
   * `updateLuminaire`, all in one undo step. Throws if the product isn't in the
   * catalog or a field is invalid.
   */
  addLuminaire(productId: string, { at, ...fields }: AddLuminaireOptions = {}): string {
    const id = crypto.randomUUID();
    const added = addLuminaire(this.#scene, this.#product(productId), id, at);
    this.#commit(updateLuminaire(added, id, fields, this.#catalog), undefined, 'Add', {
      productId,
      id,
      at,
      ...fields,
    });
    return id;
  }

  /**
   * Changes a luminaire's position, aim, dimming, on/off or colour
   * temperature. A new position is moved to where its mount type allows.
   * Throws for an unknown id or an invalid value.
   */
  updateLuminaire(id: string, patch: LuminairePatch, options?: EditOptions): void {
    this.#commit(updateLuminaire(this.#scene, id, patch, this.#catalog), options, 'Update', {
      id,
      ...patch,
    });
  }

  /**
   * Adds a piece of furniture and returns its id. It starts at its usual size
   * and finishes, standing at `at` or, without it, at the free spot nearest
   * the room centre (ADR 0049). Any other fields given are set as by
   * `updateFurniture`, all in one undo step. Throws for an unknown kind or an
   * invalid field.
   */
  addFurniture(kind: FurnitureKind, { at, ...fields }: AddFurnitureOptions = {}): string {
    const id = crypto.randomUUID();
    const added = addFurniture(this.#scene, kind, id, at);
    this.#commit(updateFurniture(added, id, fields), undefined, 'Add furniture', {
      kind,
      id,
      at,
      ...fields,
    });
    return id;
  }

  /**
   * Changes a piece's position, rotation, size or finishes. The result is kept
   * inside the room and within the piece's size range (ADR 0047). Throws for
   * an unknown id or an invalid value.
   */
  updateFurniture(id: string, patch: FurniturePatch, options?: EditOptions): void {
    this.#commit(updateFurniture(this.#scene, id, patch), options, 'Update furniture', {
      id,
      ...patch,
    });
  }

  /**
   * Removes these luminaires and pieces of furniture, as one undo step. An
   * empty list changes nothing. Throws for an unknown id.
   */
  remove(ids: readonly string[]): void {
    if (ids.length === 0) return;
    this.#commit(removeItems(this.#scene, ids), undefined, 'Remove', ids);
  }

  /**
   * Copies these luminaires and pieces of furniture, each beside its source,
   * as one undo step, and returns the new ids in the same order. An empty list
   * changes nothing. Throws for an unknown id.
   */
  duplicate(ids: readonly string[]): string[] {
    if (ids.length === 0) return [];
    const newIds = ids.map(() => crypto.randomUUID());
    this.#commit(duplicateItems(this.#scene, ids, newIds, this.#catalog), undefined, 'Duplicate', {
      ids,
      newIds,
    });
    return newIds;
  }

  /** Goes back one undo step. Does nothing when there is none. */
  undo(): void {
    this.#travel(history.undo, 'Undo');
  }

  /** Goes forward again after an undo. Does nothing when there is nothing to redo. */
  redo(): void {
    this.#travel(history.redo, 'Redo');
  }

  /** Whether there is an edit to undo. */
  canUndo(): boolean {
    return this.#history.past.length > 0;
  }

  /** Whether there is an undone edit to redo. */
  canRedo(): boolean {
    return this.#history.future.length > 0;
  }

  /** Calls `listener` after every change. Returns an unsubscribe function. */
  subscribe(listener: SceneListener): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  /**
   * Applies an edit and records the previous scene for undo. `what` and
   * `details` describe it for the log, once per undo step: edits merged into
   * the step before (one slider or pointer drag) aren't logged again.
   */
  #commit(next: Scene, options: EditOptions | undefined, what: string, details: unknown): void {
    const mergeKey = options?.mergeKey;
    if (mergeKey === undefined || mergeKey !== this.#history.lastMergeKey) {
      this.#logger.debug(`[scene] ${what}`, details);
    }
    this.#history = history.record(this.#history, this.#scene, mergeKey);
    this.#show(next);
  }

  #travel(step: typeof history.undo, what: string): void {
    const result = step(this.#history, this.#scene);
    if (!result) return;
    this.#history = result.history;
    const { past, future } = result.history;
    this.#logger.debug(`[scene] ${what}: ${past.length} steps back, ${future.length} forward`);
    this.#show(result.state);
  }

  #show(next: Scene): void {
    const previous = this.#scene;
    this.#scene = next;
    this.#listeners.forEach((listener) => listener(next, previous));
  }

  #product(id: string): Product {
    const found = this.#catalog.get(id);
    if (!found) throw new Error(`Product "${id}" is not in the catalog`);
    assertProduct(found);
    return found;
  }
}
