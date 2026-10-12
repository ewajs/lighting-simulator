// Loads each product's IES file once, on first request, through the host's
// provider. Lookups stay synchronous: callers get undefined until the file
// arrives and are notified when it does. See ADR 0034.

import type { Photometry, PhotometryProvider } from '../types';
import { parseIes } from './ies';

/** Called when a product's photometry has loaded. */
export type PhotometryListener = (productId: string, photometry: Photometry) => void;

/** Lazily loaded, parsed photometry per product. Used by Simulator. */
export class PhotometryCache {
  readonly #provider: PhotometryProvider | undefined;
  readonly #warn: (message: string) => void;
  /** Settled lookups: the photometry, or null for no file or a failed load. */
  readonly #settled = new Map<string, Photometry | null>();
  readonly #pending = new Set<string>();
  readonly #listeners = new Set<PhotometryListener>();

  constructor(provider: PhotometryProvider | undefined, warn: (message: string) => void) {
    this.#provider = provider;
    this.#warn = warn;
  }

  /** The product's photometry if loaded. The first call starts loading it. */
  get(productId: string): Photometry | undefined {
    const settled = this.#settled.get(productId);
    if (settled !== undefined) return settled ?? undefined;
    if (this.#provider && !this.#pending.has(productId)) void this.#load(productId);
    return undefined;
  }

  /** Calls `listener` whenever a product's photometry loads. Returns an unsubscribe function. */
  subscribe(listener: PhotometryListener): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  async #load(productId: string): Promise<void> {
    this.#pending.add(productId);
    let photometry: Photometry | null = null;
    try {
      const text = await this.#provider!.load(productId);
      if (text !== undefined) photometry = parseIes(text);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.#warn(
        `Photometry for product "${productId}" failed to load, using generic light: ${reason}`,
      );
    }
    this.#pending.delete(productId);
    this.#settled.set(productId, photometry);
    const loaded = photometry;
    if (loaded) this.#listeners.forEach((listener) => listener(productId, loaded));
  }
}
