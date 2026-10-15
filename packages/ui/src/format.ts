import { getLocale } from './localization';

/** Formats a number for the active UI locale (e.g. 4.200 in es-AR, 4,200 in en). */
export function formatNumber(value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat(getLocale(), { maximumFractionDigits }).format(value);
}

/** Colour temperature without digit grouping ("3000 K"), as lighting catalogues write it. */
export function formatKelvin(kelvin: number): string {
  return `${Math.round(kelvin)} K`;
}

/** Fixed decimals in the active locale, without grouping, for editable fields ("2,70"). */
export function formatFixed(value: number, decimals: number): string {
  return new Intl.NumberFormat(getLocale(), {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: false,
  }).format(value);
}

/**
 * File name for something saved at `date`, e.g. "escena-2026-10-11-1432.png"
 * for base "escena" and extension ".png".
 */
export function datedFileName(base: string, extension: string, date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `${base}-${day}-${pad(date.getHours())}${pad(date.getMinutes())}${extension}`;
}
