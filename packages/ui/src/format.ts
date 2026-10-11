import { getLocale } from './localization';

/** Formats a number for the active UI locale (e.g. 4.200 in es-AR, 4,200 in en). */
export function formatNumber(value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat(getLocale(), { maximumFractionDigits }).format(value);
}

/** Colour temperature without digit grouping ("3000 K"), as lighting catalogues write it. */
export function formatKelvin(kelvin: number): string {
  return `${Math.round(kelvin)} K`;
}
