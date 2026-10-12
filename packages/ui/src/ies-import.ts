// Defaults for the IES import form, read from the file. Pure functions so
// they can be tested without a browser. See ADR 0037.

import type { MountType, Photometry } from '@luxstudio/core';

/** Colour temperature used when the file doesn't state one, in K. */
export const DEFAULT_IMPORT_CCT = 3000;
/** Plausible range for a colour temperature written in a file, in K. */
const MIN_CCT = 1500;
const MAX_CCT = 10000;
/** Keyword some manufacturers use for the colour temperature, e.g. `[_SEARCH_COLORTEMP] 3000`. */
const COLORTEMP_KEYWORD = /COLORTEMP|COLOURTEMP|CCT/;
/** A temperature written in free text, e.g. "3000K" or "2700 K". */
const KELVIN_IN_TEXT = /\b(\d{4,5})\s?K\b/i;
const FILE_EXTENSION = /\.[^.]+$/;

/** A name for the product: `[LUMINAIRE]`, else `[LUMCAT]`, else the file name without its extension. */
export function importedName(keywords: Readonly<Record<string, string>>, fileName: string): string {
  return keywords['LUMINAIRE'] || keywords['LUMCAT'] || fileName.replace(FILE_EXTENSION, '');
}

/**
 * The colour temperature the file mentions, in K, or undefined. LM-63 has no
 * field for it, so this looks for a colour-temperature keyword, then for a
 * value like "3000K" in any keyword's text.
 */
export function importedCct(keywords: Readonly<Record<string, string>>): number | undefined {
  const plausible = (value: number) => value >= MIN_CCT && value <= MAX_CCT;
  for (const [key, value] of Object.entries(keywords)) {
    const number = Number.parseFloat(value);
    if (COLORTEMP_KEYWORD.test(key) && plausible(number)) return number;
  }
  for (const value of Object.values(keywords)) {
    const match = KELVIN_IN_TEXT.exec(value);
    if (match && plausible(Number(match[1]))) return Number(match[1]);
  }
  return undefined;
}

/** A first guess at the mount type: pendant if any light goes up, recessed otherwise. */
export function suggestedMount(photometry: Photometry): MountType {
  const { verticalDeg, candela } = photometry;
  const emitsUpward = candela.some((row) => row.some((cd, i) => cd > 0 && verticalDeg[i]! > 90));
  return emitsUpward ? 'pendant' : 'recessed';
}
