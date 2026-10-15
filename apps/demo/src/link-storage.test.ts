import { describe, expect, it } from 'vitest';
import { pack, unpack } from './link-storage';

describe('pack and unpack', () => {
  it('round-trip text, written with URL-safe characters only', async () => {
    const text = JSON.stringify({ format: 'lux-studio-scene', note: 'ñandú ✓', list: [1, 2, 3] });
    const packed = await pack(text);
    expect(packed).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(await unpack(packed)).toBe(text);
  });

  it('shrinks repetitive JSON well', async () => {
    const luminaire = { productId: 'ies-downlight', aim: { tiltDeg: 0, panDeg: 0 }, dimming: 1 };
    const text = JSON.stringify(
      Array.from({ length: 50 }, () => luminaire),
      null,
      2,
    );
    expect((await pack(text)).length).toBeLessThan(text.length / 10);
  });

  it('rejects text that isn’t packed', async () => {
    await expect(unpack('not-a-packed-scene')).rejects.toThrow();
  });
});
