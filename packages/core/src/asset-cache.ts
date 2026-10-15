// Loads each of a host's assets (an IES file, a model, a texture) once, on
// first request, through its provider. Lookups stay synchronous: callers get
// undefined until the asset arrives and are notified when it does. See ADRs
// 0034, 0043 and 0050.

import type { Logger } from './logger';

/**
 * After this long a load counts as failed, so nothing waits on it forever,
 * in ms. A file that still arrives later is used then.
 */
export const LOAD_TIMEOUT_MS = 15_000;
/** What the timeout race resolves to when time runs out. */
const TIMED_OUT = Symbol('timed out');

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
  readonly #settleListeners = new Set<(id: string) => void>();

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

  /** Whether the asset is still on its way: requested, and neither arrived, failed nor timed out. */
  isLoading(id: string): boolean {
    return this.#pending.has(id);
  }

  /** Calls `listener` whenever an asset loads. Returns an unsubscribe function. */
  subscribe(listener: AssetListener<Value>): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  /**
   * Calls `listener` whenever a load ends: the asset arrived, there was none,
   * it failed or timed out, or it arrived after timing out. Returns an
   * unsubscribe function.
   */
  onSettled(listener: (id: string) => void): () => void {
    this.#settleListeners.add(listener);
    return () => this.#settleListeners.delete(listener);
  }

  async #load(id: string): Promise<void> {
    const { area, fallback } = this.#kind;
    this.#pending.add(id);
    const fetched = this.#fetch(id);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timedOut = new Promise<typeof TIMED_OUT>((resolve) => {
      timer = setTimeout(() => resolve(TIMED_OUT), LOAD_TIMEOUT_MS);
    });
    const first = await Promise.race([fetched, timedOut]);
    clearTimeout(timer);
    if (first !== TIMED_OUT) return this.#settle(id, first);
    // Shown without it for now, so nothing waits on it forever; used if it does arrive.
    this.#logger.warn(
      `${area} "${id}" is taking over ${LOAD_TIMEOUT_MS / 1000} s, using ${fallback} meanwhile`,
    );
    this.#settle(id, null);
    const late = await fetched;
    if (late !== null) this.#settle(id, late);
  }

  /** Loads and checks one asset: null for none or a failure, which is logged. Never throws. */
  async #fetch(id: string): Promise<Value | null> {
    const kind = this.#kind;
    const { area, noun, fallback } = kind;
    const started = performance.now();
    try {
      const raw = await this.#provider!.load(id);
      const value = raw === undefined ? null : kind.convert(raw);
      const ms = Math.round(performance.now() - started);
      this.#logger.debug(
        value === null
          ? `${area} "${id}" has no ${noun}`
          : `${area} "${id}" in ${ms} ms: ${kind.describe(value)}`,
      );
      return value;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.#logger.warn(`${area} "${id}" failed to load, using ${fallback}: ${reason}`);
      return null;
    }
  }

  #settle(id: string, value: Value | null): void {
    this.#pending.delete(id);
    this.#settled.set(id, value);
    if (value !== null) this.#listeners.forEach((listener) => listener(id, value));
    this.#settleListeners.forEach((listener) => listener(id));
  }
}
