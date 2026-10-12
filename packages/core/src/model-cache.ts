// Loads each product's 3D model once, on first request, through the host's
// provider. Like PhotometryCache: lookups stay synchronous, callers get
// undefined until the file arrives and are notified when it does. Core only
// checks the bytes here; the renderer parses them. See ADR 0043.

import type { ModelProvider } from './types';

/** Called when a product's model has loaded. */
export type ModelListener = (productId: string, model: ArrayBuffer) => void;

/** The first four bytes of every binary glTF file: "glTF" in ASCII. */
const GLB_MAGIC = 0x46546c67;

/** Whether `bytes` start like a binary glTF (.glb) file. */
export function isGlb(bytes: ArrayBuffer): boolean {
  return bytes.byteLength >= 4 && new DataView(bytes).getUint32(0, true) === GLB_MAGIC;
}

/** Lazily loaded model files per product. Used by Simulator. */
export class ModelCache {
  readonly #provider: ModelProvider | undefined;
  readonly #warn: (message: string) => void;
  /** Settled lookups: the file, or null for no model or a failed load. */
  readonly #settled = new Map<string, ArrayBuffer | null>();
  readonly #pending = new Set<string>();
  readonly #listeners = new Set<ModelListener>();

  constructor(provider: ModelProvider | undefined, warn: (message: string) => void) {
    this.#provider = provider;
    this.#warn = warn;
  }

  /** The product's model file if loaded. The first call starts loading it. */
  get(productId: string): ArrayBuffer | undefined {
    const settled = this.#settled.get(productId);
    if (settled !== undefined) return settled ?? undefined;
    if (this.#provider && !this.#pending.has(productId)) void this.#load(productId);
    return undefined;
  }

  /** Calls `listener` whenever a product's model loads. Returns an unsubscribe function. */
  subscribe(listener: ModelListener): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  async #load(productId: string): Promise<void> {
    this.#pending.add(productId);
    let model: ArrayBuffer | null = null;
    try {
      const bytes = await this.#provider!.load(productId);
      if (bytes !== undefined && !isGlb(bytes)) throw new Error('not a binary glTF (.glb) file');
      model = bytes ?? null;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.#warn(`Model for product "${productId}" failed to load, using a placeholder: ${reason}`);
    }
    this.#pending.delete(productId);
    this.#settled.set(productId, model);
    const loaded = model;
    if (loaded) this.#listeners.forEach((listener) => listener(productId, loaded));
  }
}
