// Loads each of a host's assets (an IES file, a model, a texture) once, on
// first request, through its provider. Lookups stay synchronous: callers get
// undefined until the asset arrives and are notified when it does. See ADRs
// 0034, 0043 and 0050.

import type { Logger } from './logger';

/** Called when an asset has loaded. */
export type AssetListener<Value> = (id: string, value: Value) => void;

/** Where a host's assets come from: e.g. a PhotometryProvider. */
export interface AssetProvider<Raw> {
  load(id: string): Promise<Raw | undefined>;
}

/** What an AssetCache holds, and how it checks and reports it. */
export interface AssetKind<Raw, Value> {
  /** The log's area, e.g. `[models]`. */
  readonly area: string;
  /** What one is called in the log, e.g. `model`. */
  readonly noun: string;
  /** What's shown instead when one fails, for the log, e.g. `a placeholder`. */
  readonly fallback: string;
  /** Checks and converts what the provider gave; throws with a reason if it can't be used. */
  convert(raw: Raw): Value;
  /** A short summary for the log. */
  describe(value: Value): string;
}

/** Lazily loaded assets of one kind, by id. Used by Simulator. */
export class AssetCache<Raw, Value> {
  readonly #provider: AssetProvider<Raw> | undefined;
  readonly #kind: AssetKind<Raw, Value>;
  readonly #logger: Logger;
  /** Settled lookups: the asset, or null for none or a failed load. */
  readonly #settled = new Map<string, Value | null>();
  readonly #pending = new Set<string>();
  readonly #listeners = new Set<AssetListener<Value>>();

  constructor(
    provider: AssetProvider<Raw> | undefined,
    kind: AssetKind<Raw, Value>,
    logger: Logger,
  ) {
    this.#provider = provider;
    this.#kind = kind;
    this.#logger = logger;
  }

  /** The asset if loaded. The first call starts loading it. */
  get(id: string): Value | undefined {
    const settled = this.#settled.get(id);
    if (settled !== undefined) return settled ?? undefined;
    if (this.#provider && !this.#pending.has(id)) void this.#load(id);
    return undefined;
  }

  /** Calls `listener` whenever an asset loads. Returns an unsubscribe function. */
  subscribe(listener: AssetListener<Value>): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  async #load(id: string): Promise<void> {
    const kind = this.#kind;
    const { area, noun, fallback } = kind;
    this.#pending.add(id);
    const started = performance.now();
    let value: Value | null = null;
    try {
      const raw = await this.#provider!.load(id);
      if (raw !== undefined) value = kind.convert(raw);
      const ms = Math.round(performance.now() - started);
      this.#logger.debug(
        value === null
          ? `${area} "${id}" has no ${noun}`
          : `${area} "${id}" in ${ms} ms: ${kind.describe(value)}`,
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.#logger.warn(`${area} "${id}" failed to load, using ${fallback}: ${reason}`);
    }
    this.#pending.delete(id);
    this.#settled.set(id, value);
    const loaded = value;
    if (loaded !== null) this.#listeners.forEach((listener) => listener(id, loaded));
  }
}
