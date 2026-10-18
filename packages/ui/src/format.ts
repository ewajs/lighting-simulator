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

/** A time of day in hours as a clock reads it, e.g. 9.5 → "9:30". */
export function formatHour(hours: number): string {
  const minutes = Math.round(hours * 60);
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
}

/** A month's name (1–12) in the active locale, capitalised: "Marzo", "March". */
export function monthName(month: number): string {
  const name = new Intl.DateTimeFormat(getLocale(), { month: 'long', timeZone: 'UTC' }).format(
    new Date(Date.UTC(2001, month - 1, 1)),
  );
  return name.charAt(0).toLocaleUpperCase(getLocale()) + name.slice(1);
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
