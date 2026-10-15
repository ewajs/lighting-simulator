import { describe, expect, it, vi } from 'vitest';
import { AssetCache, LOAD_TIMEOUT_MS } from './asset-cache';
import { isGlb, MODEL_ASSET } from './model-asset';
import type { ModelProvider } from './types';

/** The smallest bytes that pass as a .glb: the magic, then anything. */
const glb = () => new Uint8Array([0x67, 0x6c, 0x54, 0x46, 2, 0, 0, 0]).buffer;

/** Flushes pending promise callbacks so a load can settle. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

function setup(load: ModelProvider['load']) {
  const provider = { load: vi.fn(load) };
  const warn = vi.fn();
  const logger = { debug: vi.fn(), info: vi.fn(), warn, error: vi.fn() };
  const cache = new AssetCache(provider, MODEL_ASSET, logger);
  const loaded = vi.fn();
  cache.subscribe(loaded);
  return { provider, warn, cache, loaded };
}

describe('isGlb', () => {
  it('recognises the binary glTF magic', () => {
    expect(isGlb(glb())).toBe(true);
    expect(isGlb(new TextEncoder().encode('{"asset":{}}').buffer)).toBe(false);
    expect(isGlb(new ArrayBuffer(2))).toBe(false);
  });
});

// The cache's behaviour, shown with models; photometry and textures use the same class.
describe('AssetCache', () => {
  it('loads on first request, then answers from the cache', async () => {
    const bytes = glb();
    const { provider, cache, loaded } = setup(() => Promise.resolve(bytes));
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('a')).toBeUndefined(); // Still loading: no second request.
    await settle();
    expect(cache.get('a')).toBe(bytes);
    expect(provider.load).toHaveBeenCalledTimes(1);
    expect(loaded).toHaveBeenCalledWith('a', bytes);
  });

  it('remembers products without a model, without warning', async () => {
    const { provider, warn, cache, loaded } = setup(() => Promise.resolve(undefined));
    cache.get('a');
    await settle();
    expect(cache.get('a')).toBeUndefined();
    expect(provider.load).toHaveBeenCalledTimes(1);
    expect(warn).not.toHaveBeenCalled();
    expect(loaded).not.toHaveBeenCalled();
  });

  it('warns and falls back on a failed load or a file that isn’t .glb', async () => {
    const failing = setup(() => Promise.reject(new Error('HTTP 404')));
    failing.cache.get('a');
    await settle();
    expect(failing.warn).toHaveBeenCalledWith(expect.stringMatching(/"a".*HTTP 404/));

    const text = setup(() => Promise.resolve(new TextEncoder().encode('{}').buffer));
    text.cache.get('b');
    await settle();
    expect(text.cache.get('b')).toBeUndefined();
    expect(text.warn).toHaveBeenCalledWith(expect.stringMatching(/not a binary glTF/));
  });

  it('does nothing without a provider', () => {
    expect(
      new AssetCache(undefined, MODEL_ASSET, {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }).get('a'),
    ).toBeUndefined();
  });

  it('says whether a load is in flight, and reports every way it ends', async () => {
    const outcomes = [
      Promise.resolve(glb()),
      Promise.resolve(undefined),
      Promise.reject(new Error('404')),
    ];
    const { cache } = setup(() => outcomes.shift()!);
    const settled: string[] = [];
    cache.onSettled((id) => settled.push(id));
    for (const id of ['found', 'none', 'broken']) {
      cache.get(id);
      expect(cache.isLoading(id)).toBe(true);
    }
    await settle();
    expect(settled).toEqual(['found', 'none', 'broken']);
    expect(['found', 'none', 'broken'].map((id) => cache.isLoading(id))).toEqual([
      false,
      false,
      false,
    ]);
  });

  it('stops waiting after LOAD_TIMEOUT_MS, and still uses a file that arrives later', async () => {
    vi.useFakeTimers();
    try {
      let arrive: (bytes: ArrayBuffer) => void = () => {};
      const { cache, warn, loaded } = setup(() => new Promise((resolve) => (arrive = resolve)));
      const settled = vi.fn();
      cache.onSettled(settled);
      cache.get('slow');
      await vi.advanceTimersByTimeAsync(LOAD_TIMEOUT_MS);
      expect(cache.isLoading('slow')).toBe(false);
      expect(cache.get('slow')).toBeUndefined();
      expect(warn).toHaveBeenCalledWith(expect.stringMatching(/"slow" is taking over 15 s/));
      expect(settled).toHaveBeenCalledTimes(1);

      const bytes = glb();
      arrive(bytes);
      await vi.advanceTimersByTimeAsync(0);
      expect(cache.get('slow')).toBe(bytes);
      expect(loaded).toHaveBeenCalledWith('slow', bytes);
      expect(settled).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
