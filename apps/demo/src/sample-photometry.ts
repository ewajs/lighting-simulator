import type { PhotometryProvider } from '@luxstudio/core';

/**
 * Real manufacturer IES files, served from public/ies/ (sources and dates in
 * public/ies/SOURCES.md). A backend integration works the same way: map the
 * product to its file's download link and fetch it.
 */
const FILES: Readonly<Record<string, string>> = {
  'ies-downlight': 'LX6C15D010-EX6C159030-6LBMH.ies',
  'ies-track-spot': 'qg63_b35q.ies',
  'ies-linear-pendant': 'HP-2-ID-4ft-H-B-835-ITL85132.008.ies',
  'ies-wall-washer': 'C3L10935NZ10U-C3RLWCC.ies',
  'ies-wall-up-down': 'CB3326-L35K-H.ies',
};

/** IES files are ASCII or Latin-1, never reliably UTF-8. */
const IES_ENCODING = 'latin1';

export const samplePhotometry: PhotometryProvider = {
  async load(productId) {
    const file = FILES[productId];
    if (!file) return undefined;
    const url = new URL(`ies/${file}`, document.baseURI);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${url.href}`);
    return new TextDecoder(IES_ENCODING).decode(await response.arrayBuffer());
  },
};
