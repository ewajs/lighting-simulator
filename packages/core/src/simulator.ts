import * as history from './history';
import { ModelCache, type ModelListener } from './model-cache';
import { PhotometryCache, type PhotometryListener } from './photometry/cache';
import {
  addLuminaire,
  assertLuminaire,
  assertProduct,
  duplicateLuminaires,
  removeLuminaires,
  updateLuminaire,
  type LuminairePatch,
} from './luminaires';
import { assertRoom, DEFAULT_ROOM, resizeRoom, setSurface, type RoomSize } from './room';
import type {
  Catalog,
  FloorPoint,
  ModelProvider,
  Photometry,
  PhotometryProvider,
  Product,
  Scene,
  Surface,
  SurfaceName,
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
}

/**
 * The core entry point: owns the scene, its edits and their undo history.
 *
 * ```ts
 * const sim = new Simulator({ catalog });
 * const id = sim.addLuminaire('spot-7w', { x: 1, z: -1 });
 * sim.undo();
 * ```
 */
export class Simulator {
  readonly #catalog: Catalog;
  readonly #photometry: PhotometryCache;
  readonly #models: ModelCache;
  readonly #listeners = new Set<SceneListener>();
  #scene: Scene;
  #history = history.emptyHistory<Scene>();

  constructor({ catalog, scene, photometry, models }: SimulatorOptions) {
    const initial = scene ?? { room: DEFAULT_ROOM, luminaires: [] };
    assertRoom(initial.room);
    initial.luminaires.forEach(assertLuminaire);
    this.#catalog = catalog;
    this.#photometry = new PhotometryCache(photometry, (message) => console.warn(message));
    this.#models = new ModelCache(models, (message) => console.warn(message));
    this.#scene = initial;
  }

  /** The product lookup this simulator was created with. */
  get catalog(): Catalog {
    return this.#catalog;
  }

  /**
   * The product's parsed IES photometry, or undefined while it loads or if it
   * has none. The first call for a product starts loading it from the provider;
   * `onPhotometry` reports when it arrives. A file that fails to load or parse
   * is reported with `console.warn` and treated as missing.
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
   * arrives. A file that fails to load or isn't a .glb is reported with
   * `console.warn` and treated as missing.
   */
  model(productId: string): ArrayBuffer | undefined {
    return this.#models.get(productId);
  }

  /** Calls `listener` when a product's model loads. Returns an unsubscribe function. */
  onModel(listener: ModelListener): () => void {
    return this.#models.subscribe(listener);
  }

  /** Current scene snapshot. Never mutate it; it is replaced on every change. */
  get scene(): Scene {
    return this.#scene;
  }

  setRoomSize(size: Partial<RoomSize>, options?: EditOptions): void {
    this.#commit(resizeRoom(this.#scene, size, this.#catalog), options);
  }

  setSurface(name: SurfaceName, patch: Partial<Surface>, options?: EditOptions): void {
    this.#commit(setSurface(this.#scene, name, patch), options);
  }

  /** Adds a luminaire and returns its id. Throws if the product isn't in the catalog. */
  addLuminaire(productId: string, at?: FloorPoint): string {
    const id = crypto.randomUUID();
    this.#commit(addLuminaire(this.#scene, this.#product(productId), id, at));
    return id;
  }

  updateLuminaire(id: string, patch: LuminairePatch, options?: EditOptions): void {
    this.#commit(updateLuminaire(this.#scene, id, patch, this.#catalog), options);
  }

  removeLuminaires(ids: readonly string[]): void {
    this.#commit(removeLuminaires(this.#scene, ids));
  }

  /** Copies luminaires and returns the new ids, in the same order. */
  duplicateLuminaires(ids: readonly string[]): string[] {
    const newIds = ids.map(() => crypto.randomUUID());
    this.#commit(duplicateLuminaires(this.#scene, ids, newIds, this.#catalog));
    return newIds;
  }

  undo(): void {
    this.#travel(history.undo);
  }

  redo(): void {
    this.#travel(history.redo);
  }

  canUndo(): boolean {
    return this.#history.past.length > 0;
  }

  canRedo(): boolean {
    return this.#history.future.length > 0;
  }

  /** Calls `listener` after every change. Returns an unsubscribe function. */
  subscribe(listener: SceneListener): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  #commit(next: Scene, options?: EditOptions): void {
    this.#history = history.record(this.#history, this.#scene, options?.mergeKey);
    this.#show(next);
  }

  #travel(step: typeof history.undo): void {
    const result = step(this.#history, this.#scene);
    if (!result) return;
    this.#history = result.history;
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
