import { en } from './locales/en';
import { fr } from './locales/fr';
import { es } from './locales/es';
import { de } from './locales/de';

export { en, fr, es, de };

export type { EnTranslations } from './locales/en';

export type {
  Locale,
  Translations,
  TranslationValue,
  I18nConfig,
  TranslationKey,
  InterpolationParams,
} from './types';

export {
  createTranslator,
  getNestedValue,
  interpolate,
  detectBrowserLocale,
} from './utils/translator';

export const locales = {
  en: () => Promise.resolve(en),
  fr: () => Promise.resolve(fr),
  es: () => Promise.resolve(es),
  de: () => Promise.resolve(de),
};

export const defaultLocale = 'en' as const;
export const supportedLocales = ['en', 'fr', 'es', 'de'] as const;
