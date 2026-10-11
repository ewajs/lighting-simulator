import { configureLocalization } from '@lit/localize';
import { sourceLocale, targetLocales } from './generated/locale-codes';

/** A UI locale. Source strings are English; es-AR is the default (ADR 0012). */
export type Locale = typeof sourceLocale | (typeof targetLocales)[number];

export const DEFAULT_LOCALE: Locale = 'es-AR';

// Static imports per locale so bundlers can split them into their own chunks.
const loaders = {
  'es-AR': () => import('./generated/locales/es-AR'),
} satisfies Record<(typeof targetLocales)[number], unknown>;

/**
 * The page-wide UI locale. `setLocale` resolves when the translations are
 * loaded and every element has re-rendered.
 */
export const { getLocale, setLocale } = configureLocalization({
  sourceLocale,
  targetLocales,
  loadLocale: (locale) => loaders[locale as keyof typeof loaders](),
});
