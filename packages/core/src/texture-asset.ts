// Surface textures as an asset kind (ADR 0050): checked on arrival, decoded
// by the renderer. Also the brightness matching, kept pure so it's tested in
// Node.

import type { AssetKind } from './asset-cache';
import type { TextureImage } from './types';
import { assertPositive } from './validate';

/** Called when a texture has loaded. */
export type TextureListener = (textureId: string, image: TextureImage) => void;

/** How JPEG and PNG files start. */
const SIGNATURES: readonly (readonly number[])[] = [
  [0xff, 0xd8, 0xff],
  [0x89, 0x50, 0x4e, 0x47],
];
/** Rec. 709 luminance weights of linear red, green and blue. */
const LUMINANCE_WEIGHTS = [0.2126, 0.7152, 0.0722] as const;
/** Bytes per pixel in RGBA data. */
const RGBA = 4;

/** Whether `bytes` start like a JPEG or PNG file. */
export function isImage(bytes: ArrayBuffer): boolean {
  const head = new Uint8Array(bytes, 0, Math.min(4, bytes.byteLength));
  return SIGNATURES.some((signature) => signature.every((byte, i) => head[i] === byte));
}

/** Texture images, by texture id. */
export const TEXTURE_ASSET: AssetKind<TextureImage, TextureImage> = {
  area: '[textures]',
  noun: 'texture',
  fallback: "the surface's colour",
  convert: (image) => {
    if (!isImage(image.data)) throw new Error('not a JPEG or PNG file');
    assertPositive('widthM', image.widthM);
    assertPositive('heightM', image.heightM);
    return image;
  },
  describe: ({ data, widthM, heightM }) => `${widthM} × ${heightM} m, ${data.byteLength} bytes`,
};

/**
 * The average linear luminance (0–1) of sRGB pixels given as RGBA bytes:
 * how much light the photo's surface reflects on average, its albedo.
 */
export function meanLuminance(rgba: ArrayLike<number>): number {
  const pixels = Math.floor(rgba.length / RGBA);
  if (pixels === 0) return 0;
  let sum = 0;
  for (let i = 0; i < pixels * RGBA; i += RGBA) {
    for (let channel = 0; channel < 3; channel++) {
      sum += LUMINANCE_WEIGHTS[channel]! * srgbToLinear(rgba[i + channel]! / 255);
    }
  }
  return sum / pixels;
}

/**
 * What to multiply a texture by so its average equals `reflectance`: the
 * photo's grain and colour stay, its overall brightness follows the physics.
 * A black image can't be brightened, so it's left as it is.
 */
export function brightnessScale(reflectance: number, meanLuminance: number): number {
  return meanLuminance > 0 ? reflectance / meanLuminance : 1;
}

/** The sRGB transfer function, undone (IEC 61966-2-1). */
function srgbToLinear(value: number): number {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}
