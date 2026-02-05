import { en } from './locales/en';
import { fr } from './locales/fr';

export { en, fr };

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
};

export const defaultLocale = 'en' as const;
export const supportedLocales = ['en', 'fr'] as const;
