// Autosave (ADR 0052): `<lxs-app autosave>` keeps the scene in the
// browser's localStorage as it changes, and the host starts its Simulator
// from it on the next visit with `loadAutosave()`. A scene is a few KB:
// products, IES files and textures are stored by id.

import { parseScene, serializeScene, type Scene } from '@luxstudio/core';

/** Where the scene is kept in localStorage. */
export const AUTOSAVE_KEY = 'lxs-autosave';

/**
 * The scene saved by `<lxs-app autosave>` in this browser, or undefined if
 * there's none, storage is unavailable (e.g. blocked by privacy settings) or
 * it can't be read. Pass it as the Simulator's starting scene.
 *
 * ```ts
 * const simulator = new Simulator({ catalog, scene: loadAutosave() ?? myStarterScene });
 * ```
 */
export function loadAutosave(): Scene | undefined {
  try {
    const text = localStorage.getItem(AUTOSAVE_KEY);
    return text === null ? undefined : parseScene(text);
  } catch {
    return undefined;
  }
}

/** Keeps `scene` for `loadAutosave`. Throws if storage is unavailable or full. */
export function writeAutosave(scene: Scene): void {
  localStorage.setItem(AUTOSAVE_KEY, serializeScene(scene));
}
