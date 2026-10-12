import { configureLocalization } from '@lit/localize';
import { allLocales, sourceLocale, targetLocales } from './generated/locale-codes';

/** Every UI locale: `en`, the source strings, and `es-AR`, the default (ADR 0012). */
export const LOCALES = allLocales;

/** A UI locale, one of {@link LOCALES}. */
export type Locale = (typeof LOCALES)[number];

/** The locale the UI starts in. */
export const DEFAULT_LOCALE: Locale = 'es-AR';

// Static imports per locale so bundlers can split them into their own chunks.
const loaders = {
  'es-AR': () => import('./generated/locales/es-AR'),
} satisfies Record<(typeof targetLocales)[number], unknown>;

const localization = configureLocalization({
  sourceLocale,
  targetLocales,
  loadLocale: (locale) => loaders[locale as keyof typeof loaders](),
});

/** The page-wide UI locale right now. */
export const getLocale: () => string = localization.getLocale;

/**
 * Switches the page-wide UI locale. Resolves when the translations are
 * loaded and every element has re-rendered.
 */
export const setLocale: (locale: string) => Promise<void> = localization.setLocale;
