import * as THREE from 'three/webgpu';
import type { Logger } from '../logger';
import { meanLuminance } from '../texture-asset';
import type { TextureImage } from '../types';

/** The side of the copy a texture's average brightness is measured on, in px: plenty for an average. */
const SAMPLE_PX = 256;
/** Sharper textures at grazing angles, such as a floor seen across the room. */
const ANISOTROPY = 8;

/** A texture ready to draw: on the GPU, with its size and its average brightness. */
export interface PreparedTexture {
  readonly texture: THREE.Texture;
  /** How much of the surface one copy covers, in m. */
  readonly widthM: number;
  readonly heightM: number;
  /** Its average linear luminance, 0–1, which brightness matching divides by (ADR 0050). */
  readonly meanLuminance: number;
}

/**
 * Decodes each surface texture once and measures its average brightness.
 * Decoding is asynchronous: until a texture is ready its surface shows its
 * colour, and `onReady` asks for a redraw.
 */
export class SurfaceTextures {
  readonly #onReady: () => void;
  readonly #logger: Logger;
  /** Prepared textures by image, or null while decoding or for one that couldn't be used. */
  readonly #prepared = new Map<TextureImage, PreparedTexture | null>();
  #disposed = false;

  constructor(onReady: () => void, logger: Logger) {
    this.#onReady = onReady;
    this.#logger = logger;
  }

  /** The prepared texture for an image, once decoded. The first call starts decoding. */
  get(textureId: string, image: TextureImage | undefined): PreparedTexture | undefined {
    if (!image) return undefined;
    if (!this.#prepared.has(image)) void this.#prepare(textureId, image);
    return this.#prepared.get(image) ?? undefined;
  }

  /** Frees every texture. */
  dispose(): void {
    this.#disposed = true;
    for (const prepared of this.#prepared.values()) prepared?.texture.dispose();
    this.#prepared.clear();
  }

  async #prepare(textureId: string, image: TextureImage): Promise<void> {
    this.#prepared.set(image, null); // Decoding; asked again, it's not ready yet.
    let prepared: PreparedTexture | null = null;
    try {
      const bitmap = await createImageBitmap(new Blob([image.data]));
      const texture = new THREE.Texture(bitmap);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.anisotropy = ANISOTROPY;
      // An ImageBitmap can't be flipped on upload. A tiled surface reads the same either way.
      texture.flipY = false;
      texture.needsUpdate = true;
      const { widthM, heightM } = image;
      prepared = { texture, widthM, heightM, meanLuminance: meanLuminance(sample(bitmap)) };
      this.#logger.debug(
        `[textures] "${textureId}" decoded: ${bitmap.width} × ${bitmap.height} px, average luminance ${prepared.meanLuminance.toFixed(2)}`,
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.#logger.warn(`[textures] "${textureId}" can't be decoded, using the colour: ${reason}`);
    }
    if (this.#disposed) {
      prepared?.texture.dispose();
      return;
    }
    this.#prepared.set(image, prepared);
    if (prepared) this.#onReady();
  }
}

/** The image's pixels, scaled down to SAMPLE_PX square, as RGBA bytes. */
function sample(bitmap: ImageBitmap): Uint8ClampedArray {
  const canvas = new OffscreenCanvas(SAMPLE_PX, SAMPLE_PX);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('no 2D canvas to measure it on');
  context.drawImage(bitmap, 0, 0, SAMPLE_PX, SAMPLE_PX);
  return context.getImageData(0, 0, SAMPLE_PX, SAMPLE_PX).data;
}
