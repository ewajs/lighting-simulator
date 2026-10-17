// A calculation's inputs as plain data (ADR 0064). The host's providers are
// functions, which can't cross into a Web Worker; what a scene's products
// need from them can, copied as data.
import type { Photometry, Product, Scene } from '../types';
import type { AnalysisInputs } from './settings';

/** What a scene's calculation needs from the host, for every product it uses, as plain data. */
export interface AnalysisSnapshot {
  readonly products: readonly Product[];
  /** By product id: the products whose IES photometry has loaded. */
  readonly photometry: Readonly<Record<string, Photometry>>;
  /** By product id: the products whose model file has loaded. */
  readonly modelFiles: Readonly<Record<string, ArrayBuffer>>;
}

/**
 * The scene's products and what has loaded for them, as plain data to send
 * to a Web Worker. Products the catalog doesn't know are left out, as the
 * calculation leaves them out.
 */
export function analysisSnapshot(scene: Scene, inputs: AnalysisInputs): AnalysisSnapshot {
  const products: Product[] = [];
  const photometry: Record<string, Photometry> = {};
  const modelFiles: Record<string, ArrayBuffer> = {};
  for (const id of new Set(scene.luminaires.map((luminaire) => luminaire.productId))) {
    const product = inputs.catalog.get(id);
    if (!product) continue;
    products.push(product);
    const file = inputs.photometry(id);
    if (file) photometry[id] = file;
    const model = inputs.modelFile(id);
    if (model) modelFiles[id] = model;
  }
  return { products, photometry, modelFiles };
}

/** A snapshot back as the inputs `analyseIlluminance` takes. */
export function snapshotInputs(snapshot: AnalysisSnapshot): AnalysisInputs {
  const products = new Map(snapshot.products.map((product) => [product.id, product]));
  return {
    catalog: { get: (id) => products.get(id) },
    photometry: (id) => snapshot.photometry[id],
    modelFile: (id) => snapshot.modelFiles[id],
  };
}
