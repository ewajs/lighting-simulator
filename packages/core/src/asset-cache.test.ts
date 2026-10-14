import { describe, expect, it, vi } from 'vitest';
import { AssetCache } from './asset-cache';
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
});
