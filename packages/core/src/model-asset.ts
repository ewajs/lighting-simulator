// Products' 3D models as an asset kind: core only checks the bytes; the
// renderer parses them. See ADR 0043.

import type { AssetKind } from './asset-cache';

/** Called when a product's model has loaded. */
export type ModelListener = (productId: string, model: ArrayBuffer) => void;

/** The first four bytes of every binary glTF file: "glTF" in ASCII. */
const GLB_MAGIC = 0x46546c67;

/** Whether `bytes` start like a binary glTF (.glb) file. */
export function isGlb(bytes: ArrayBuffer): boolean {
  return bytes.byteLength >= 4 && new DataView(bytes).getUint32(0, true) === GLB_MAGIC;
}

/** Model files, by product id. */
export const MODEL_ASSET: AssetKind<ArrayBuffer, ArrayBuffer> = {
  area: '[models]',
  noun: 'model',
  fallback: 'a placeholder',
  convert: (bytes) => {
    if (!isGlb(bytes)) throw new Error('not a binary glTF (.glb) file');
    return bytes;
  },
  describe: (bytes) => `${bytes.byteLength} bytes`,
};
