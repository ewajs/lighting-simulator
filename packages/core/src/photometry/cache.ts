// Loads each product's IES file once, on first request, through the host's
// provider. Lookups stay synchronous: callers get undefined until the file
// arrives and are notified when it does. See ADR 0034.

import type { Logger } from '../logger';
import type { Photometry, PhotometryProvider } from '../types';
import { beamAngleDeg, totalFlux } from './distribution';
import { parseIes } from './ies';

/** Called when a product's photometry has loaded. */
export type PhotometryListener = (productId: string, photometry: Photometry) => void;

/** Lazily loaded, parsed photometry per product. Used by Simulator. */
export class PhotometryCache {
  readonly #provider: PhotometryProvider | undefined;
  readonly #logger: Logger;
  /** Settled lookups: the photometry, or null for no file or a failed load. */
  readonly #settled = new Map<string, Photometry | null>();
  readonly #pending = new Set<string>();
  readonly #listeners = new Set<PhotometryListener>();

  constructor(provider: PhotometryProvider | undefined, logger: Logger) {
    this.#provider = provider;
    this.#logger = logger;
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
    const started = performance.now();
    let photometry: Photometry | null = null;
    try {
      const text = await this.#provider!.load(productId);
      if (text !== undefined) photometry = parseIes(text);
      const ms = Math.round(performance.now() - started);
      if (photometry)
        this.#logger.debug(`[photometry] "${productId}" in ${ms} ms: ${describe(photometry)}`);
      else this.#logger.debug(`[photometry] "${productId}" has no IES file`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.#logger.warn(
        `[photometry] "${productId}" failed to load, using generic light: ${reason}`,
      );
    }
    this.#pending.delete(productId);
    this.#settled.set(productId, photometry);
    const loaded = photometry;
    if (loaded) this.#listeners.forEach((listener) => listener(productId, loaded));
  }
}

/** A one-line summary of a distribution, e.g. for the log. */
function describe(photometry: Photometry): string {
  const { verticalDeg, horizontalDeg, candela, keywords } = photometry;
  const name = keywords['LUMINAIRE'] ?? keywords['LUMCAT'] ?? 'unnamed';
  const peak = Math.max(...candela.flat());
  const planes =
    horizontalDeg.length === 1
      ? 'symmetric about the vertical'
      : `${horizontalDeg.length} C-planes`;
  return [
    name,
    `${verticalDeg.length} angles × ${planes}`,
    `peak ${Math.round(peak)} cd`,
    `${Math.round(totalFlux(photometry))} lm`,
    `beam ${Math.round(beamAngleDeg(photometry))}°`,
  ].join(', ');
}
