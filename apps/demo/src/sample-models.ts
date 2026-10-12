import type { ModelProvider } from '@luxstudio/core';

/**
 * Fixture models for the IES products, served from public/models/ (see
 * public/models/SOURCES.md). The generic products have none and show the
 * placeholder. A backend integration works the same way: map the product to
 * its model's download link and fetch it.
 */
const MODELS: ReadonlySet<string> = new Set([
  'ies-downlight',
  'ies-track-spot',
  'ies-linear-pendant',
  'ies-wall-washer',
  'ies-wall-up-down',
]);

export const sampleModels: ModelProvider = {
  async load(productId) {
    if (!MODELS.has(productId)) return undefined;
    const url = new URL(`models/${productId}.glb`, document.baseURI);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${url.href}`);
    return response.arrayBuffer();
  },
};
