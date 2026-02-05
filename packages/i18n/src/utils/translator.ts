import type { Translations, InterpolationParams } from '../types';
import { logger } from '@repo/logger';

export function getNestedValue(
  obj: Translations,
  path: string
): string | undefined {
  const keys = path.split('.');
  let current: any = obj;

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return undefined;
    }
  }

  return typeof current === 'string' ? current : undefined;
}

export function interpolate(
  template: string,
  params: InterpolationParams = {}
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return key in params ? String(params[key]) : match;
  });
}

export function createTranslator(translations: Translations) {
  return function t(key: string, params?: InterpolationParams): string {
    const value = getNestedValue(translations, key);

    if (!value) {
      logger.warn(`[i18n] Missing translation for key: "${key}"`);
      return key;
    }

    return params ? interpolate(value, params) : value;
  };
}

export function detectBrowserLocale(
  supportedLocales: string[],
  fallback: string
): string {
  if (typeof navigator === 'undefined') {
    return fallback;
  }

  const browserLang =
    navigator.language || (navigator as any).userLanguage || fallback;

  const lang = browserLang.split('-')[0].toLowerCase();

  return supportedLocales.includes(lang) ? lang : fallback;
}
