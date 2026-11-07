import type { ForecastSource } from '@repo/trpc';

export const FORECAST_ORDER: ForecastSource[] = ['scheduled', 'recurring', 'unbilled', 'invoiced'];

const TIME_ZONE = 'Europe/Paris';

const INTL_LOCALES: Record<string, string> = { fr: 'fr-FR', en: 'en-GB' };

export const intlLocale = (locale: string) => INTL_LOCALES[locale] ?? 'en-GB';

export function euroFormatter(locale: string) {
  const format = new Intl.NumberFormat(intlLocale(locale), { style: 'currency', currency: 'EUR' });
  return (amount: string | number) => format.format(Number(amount));
}

export function monthFormatter(locale: string) {
  const format = new Intl.DateTimeFormat(intlLocale(locale), {
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  });
  return (month: string) => format.format(new Date(`${month}-15T12:00:00Z`));
}

export function dayFormatter(locale: string) {
  const format = new Intl.DateTimeFormat(intlLocale(locale), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: TIME_ZONE,
  });
  return (date: Date | string) => format.format(new Date(date));
}

export const isZero = (amount: string) => Number(amount) === 0;
