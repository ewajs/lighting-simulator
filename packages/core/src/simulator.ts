import * as history from './history';
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
import type { Catalog, FloorPoint, Product, Scene, Surface, SurfaceName } from './types';

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
}

/** The core entry point: owns the scene, its edits and their undo history. */
export interface Simulator {
  /** Current scene snapshot. Never mutate it; it is replaced on every change. */
  readonly scene: Scene;
  setRoomSize(size: Partial<RoomSize>, options?: EditOptions): void;
  setSurface(name: SurfaceName, patch: Partial<Surface>, options?: EditOptions): void;
  /** Adds a luminaire and returns its id. Throws if the product isn't in the catalog. */
  addLuminaire(productId: string, at?: FloorPoint): string;
  updateLuminaire(id: string, patch: LuminairePatch, options?: EditOptions): void;
  removeLuminaires(ids: readonly string[]): void;
  /** Copies luminaires and returns the new ids, in the same order. */
  duplicateLuminaires(ids: readonly string[]): string[];
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
  /** Returns an unsubscribe function. */
  subscribe(listener: SceneListener): () => void;
}

export function createSimulator({ catalog, scene: initial }: SimulatorOptions): Simulator {
  let scene: Scene = initial ?? { room: DEFAULT_ROOM, luminaires: [] };
  assertRoom(scene.room);
  scene.luminaires.forEach(assertLuminaire);

  let past = history.emptyHistory<Scene>();
  const listeners = new Set<SceneListener>();

  function show(next: Scene) {
    const previous = scene;
    scene = next;
    listeners.forEach((listener) => listener(scene, previous));
  }

  function commit(next: Scene, options?: EditOptions) {
    past = history.record(past, scene, options?.mergeKey);
    show(next);
  }

  function product(id: string): Product {
    const found = catalog.get(id);
    if (!found) throw new Error(`Product "${id}" is not in the catalog`);
    assertProduct(found);
    return found;
  }

  function travel(step: typeof history.undo) {
    const result = step(past, scene);
    if (!result) return;
    past = result.history;
    show(result.state);
  }

  return {
    get scene() {
      return scene;
    },
    setRoomSize: (size, options) => commit(resizeRoom(scene, size, catalog), options),
    setSurface: (name, patch, options) => commit(setSurface(scene, name, patch), options),
    addLuminaire(productId, at) {
      const id = crypto.randomUUID();
      commit(addLuminaire(scene, product(productId), id, at));
      return id;
    },
    updateLuminaire: (id, patch, options) =>
      commit(updateLuminaire(scene, id, patch, catalog), options),
    removeLuminaires: (ids) => commit(removeLuminaires(scene, ids)),
    duplicateLuminaires(ids) {
      const newIds = ids.map(() => crypto.randomUUID());
      commit(duplicateLuminaires(scene, ids, newIds, catalog));
      return newIds;
    },
    undo: () => travel(history.undo),
    redo: () => travel(history.redo),
    canUndo: () => past.past.length > 0,
    canRedo: () => past.future.length > 0,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
