import { describe, expect, it, vi } from 'vitest';
import type { PhotometryProvider } from '../types';
import { PhotometryCache } from './cache';

const DOWNLIGHT_IES = `IESNA:LM-63-2002
TILT=NONE
1 -1 1 2 1 1 2 0 0 0
1 1 10
0 90
0
100 0
`;

/** Flushes pending promise callbacks so a load can settle. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

function setup(load: PhotometryProvider['load']) {
  const provider = { load: vi.fn(load) };
  const warn = vi.fn();
  const logger = { debug: vi.fn(), info: vi.fn(), warn, error: vi.fn() };
  const cache = new PhotometryCache(provider, logger);
  const loaded = vi.fn();
  cache.subscribe(loaded);
  return { provider, warn, cache, loaded };
}

describe('PhotometryCache', () => {
  it('loads on first request, then answers from the cache', async () => {
    const { provider, cache, loaded } = setup(() => Promise.resolve(DOWNLIGHT_IES));
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('a')).toBeUndefined(); // still loading: no second request
    await settle();
    const photometry = cache.get('a');
    expect(photometry?.candela).toEqual([[100, 0]]);
    expect(loaded).toHaveBeenCalledExactlyOnceWith('a', photometry);
    expect(provider.load).toHaveBeenCalledOnce();
  });

  it('remembers products without a file and doesn’t notify', async () => {
    const { provider, cache, loaded } = setup(() => Promise.resolve(undefined));
    cache.get('a');
    await settle();
    expect(cache.get('a')).toBeUndefined();
    expect(provider.load).toHaveBeenCalledOnce();
    expect(loaded).not.toHaveBeenCalled();
  });

  it('warns and falls back when loading fails', async () => {
    const { cache, warn, loaded } = setup(() => Promise.reject(new Error('HTTP 404')));
    cache.get('a');
    await settle();
    expect(cache.get('a')).toBeUndefined();
    expect(warn).toHaveBeenCalledExactlyOnceWith(expect.stringMatching(/"a".*HTTP 404/));
    expect(loaded).not.toHaveBeenCalled();
  });

  it('warns and falls back when the file is invalid', async () => {
    const { cache, warn } = setup(() => Promise.resolve('not an IES file'));
    cache.get('a');
    await settle();
    expect(cache.get('a')).toBeUndefined();
    expect(warn).toHaveBeenCalledExactlyOnceWith(expect.stringMatching(/"a".*no TILT= line/));
  });

  it('does nothing without a provider', () => {
    const cache = new PhotometryCache(undefined, {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    });
    expect(cache.get('a')).toBeUndefined();
  });

  it('stops notifying after unsubscribe', async () => {
    const { cache } = setup(() => Promise.resolve(DOWNLIGHT_IES));
    const listener = vi.fn();
    const unsubscribe = cache.subscribe(listener);
    unsubscribe();
    cache.get('a');
    await settle();
    expect(listener).not.toHaveBeenCalled();
  });
});
