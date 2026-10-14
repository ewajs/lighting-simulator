import { describe, expect, it } from 'vitest';
import { brightnessScale, isImage, meanLuminance, TEXTURE_ASSET } from './texture-asset';

const bytes = (...values: number[]) => new Uint8Array(values).buffer;
const jpeg = () => bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0);
const png = () => bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a);

describe('isImage', () => {
  it('recognises JPEG and PNG files', () => {
    expect(isImage(jpeg())).toBe(true);
    expect(isImage(png())).toBe(true);
    expect(isImage(new TextEncoder().encode('GIF89a').buffer)).toBe(false);
    expect(isImage(bytes(0xff))).toBe(false);
  });
});

describe('TEXTURE_ASSET', () => {
  it('accepts an image with its size in metres', () => {
    const image = { data: jpeg(), widthM: 1.8, heightM: 1.8 };
    expect(TEXTURE_ASSET.convert(image)).toBe(image);
  });

  it('rejects other files and sizes that aren’t positive', () => {
    expect(() => TEXTURE_ASSET.convert({ data: bytes(1, 2, 3, 4), widthM: 1, heightM: 1 })).toThrow(
      /JPEG or PNG/,
    );
    expect(() => TEXTURE_ASSET.convert({ data: png(), widthM: 0, heightM: 1 })).toThrow(/widthM/);
  });
});

describe('meanLuminance', () => {
  it('averages the linear luminance of sRGB pixels', () => {
    // White is 1 and black 0; sRGB 188 is about linear 0.5.
    expect(meanLuminance([255, 255, 255, 255, 0, 0, 0, 255])).toBeCloseTo(0.5);
    expect(meanLuminance([188, 188, 188, 255])).toBeCloseTo(0.5, 2);
    // Green counts most: Rec. 709 weights.
    expect(meanLuminance([0, 255, 0, 255])).toBeCloseTo(0.7152);
    expect(meanLuminance([])).toBe(0);
  });
});

describe('brightnessScale', () => {
  it('scales the photo so its average equals the reflectance', () => {
    // A photo averaging 0.22 shown as oak at ρ = 0.3.
    expect(0.22 * brightnessScale(0.3, 0.22)).toBeCloseTo(0.3);
    expect(brightnessScale(0.5, 0)).toBe(1);
  });
});
