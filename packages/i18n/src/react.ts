import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Locale, Translations, InterpolationParams } from './types';
import { createTranslator } from './utils/translator';
import { en } from './locales/en';
import { fr } from './locales/fr';
import { defaultLocale, supportedLocales } from './index';

const translationsMap: Record<Locale, Translations> = {
  en,
  fr,
};

let currentLocale: Locale = defaultLocale;
let listeners: Set<(locale: Locale) => void> = new Set();

function getStoredLocale(): Locale | null {
  try {
    if (typeof localStorage !== 'undefined') {
      return (localStorage.getItem('locale') as Locale) || null;
    }
  } catch {}
  return null;
}

function setStoredLocale(locale: Locale) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('locale', locale);
    }
  } catch {}
}

function notifyListeners() {
  listeners.forEach((listener) => listener(currentLocale));
}

export function setLocale(locale: Locale) {
  if (supportedLocales.includes(locale)) {
    currentLocale = locale;
    setStoredLocale(locale);
    notifyListeners();
  }
}

export function getLocale(): Locale {
  return currentLocale;
}

export function useI18n() {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const stored = getStoredLocale();
    if (stored && supportedLocales.includes(stored)) {
      currentLocale = stored;
      return stored;
    }
    return currentLocale;
  });

  useEffect(() => {
    const listener = (newLocale: Locale) => {
      setLocaleState(newLocale);
    };

    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  }, []);

  const translations = useMemo(() => translationsMap[locale], [locale]);

  const t = useMemo(
    () => createTranslator(translations),
    [translations]
  );

  const changeLocale = useCallback((newLocale: Locale) => {
    setLocale(newLocale);
  }, []);

  return {
    locale,
    t,
    setLocale: changeLocale,
    supportedLocales: supportedLocales as readonly Locale[],
  };
}

export function useTranslation() {
  const { t, locale } = useI18n();
  return { t, locale };
}

export function Trans({
  k,
  params,
}: {
  k: string;
  params?: InterpolationParams;
}) {
  const { t } = useTranslation();
  return t(k, params);
}
