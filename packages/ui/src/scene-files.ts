// Saving the scene to a file and opening one (ADR 0051). The file format is
// core's; this is the browser side: downloads, reading the picked file, and
// what to tell the user.

import {
  parseScene,
  SCENE_FILE_EXTENSION,
  SceneFileError,
  serializeScene,
  unknownProducts,
  type Scene,
  type Simulator,
} from '@luxstudio/core';
import { msg, str } from '@lit/localize';
import { datedFileName } from './format';
import type { Notice } from './lxs-notice';

/** What the open-file dialog offers: scene files, which are JSON. */
export const SCENE_FILE_ACCEPT = `${SCENE_FILE_EXTENSION},.json,application/json`;

/** Downloads `blob` as `fileName`. */
export function download(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement('a'), { href: url, download: fileName });
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Downloads the scene as a scene file, named with a neutral, translated base and the time. */
export function saveSceneFile(scene: Scene): void {
  const blob = new Blob([serializeScene(scene)], { type: 'application/json' });
  download(blob, datedFileName(msg('scene'), SCENE_FILE_EXTENSION, new Date()));
}

/**
 * Opens a scene file into the simulator, replacing the scene as one undo
 * step, and says what happened. A file that can't be read leaves the scene
 * as it was.
 */
export async function openSceneFile(file: File, simulator: Simulator): Promise<Notice> {
  const { name } = file;
  let scene: Scene;
  try {
    scene = parseScene(await file.text());
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    simulator.logger.warn(`[ui] Couldn't open "${name}": ${detail}`);
    return { kind: 'error', text: cantOpen(name, error) };
  }
  simulator.setScene(scene);
  simulator.logger.debug(`[ui] Opened "${name}"`);
  const missing = unknownProducts(scene, simulator.catalog);
  if (missing.length === 0) return { kind: 'info', text: msg(str`Opened ${name}.`) };
  // Kept in the scene, so saving again doesn't lose them; the viewport skips them.
  simulator.logger.warn(
    `[ui] "${name}" uses products the catalog doesn't have: ${missing.join(', ')}`,
  );
  const count = scene.luminaires.filter((l) => missing.includes(l.productId)).length;
  return {
    kind: 'info',
    text:
      count === 1
        ? msg(
            str`Opened ${name}. 1 luminaire uses a product this catalog doesn't have: it's kept, but not shown.`,
          )
        : msg(
            str`Opened ${name}. ${count} luminaires use products this catalog doesn't have: they're kept, but not shown.`,
          ),
  };
}

/** Why a file couldn't be opened, for the user. Hosts ship the UI under their own brand, so no product name. */
function cantOpen(name: string, error: unknown): string {
  const problem = error instanceof SceneFileError ? error.problem : 'invalid';
  switch (problem) {
    case 'not-a-scene':
      return msg(str`${name} isn't a scene file.`);
    case 'newer-version':
      return msg(
        str`${name} was saved by a newer version of this app. Update it to open the file.`,
      );
    case 'invalid':
      return msg(str`${name} is damaged and can't be opened.`);
  }
}
