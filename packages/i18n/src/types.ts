export type Locale = 'en' | 'fr';

export type TranslationValue = string | { [key: string]: TranslationValue };

export type Translations = Record<string, TranslationValue>;

export interface I18nConfig {
  defaultLocale: Locale;
  supportedLocales: Locale[];
  fallbackLocale?: Locale;
}

export type DeepKeyOf<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? `${K}` | `${K}.${DeepKeyOf<T[K]>}`
          : `${K}`
        : never;
    }[keyof T]
  : never;

export type TranslationKey = DeepKeyOf<Translations>;

export type InterpolationParams = Record<string, string | number>;
