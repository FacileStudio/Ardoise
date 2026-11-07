import { TIME_ZONE } from './sql';

const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
});

export function parisMonth(date: Date): string {
  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === 'year')!.value;
  const month = parts.find((part) => part.type === 'month')!.value;

  return `${year}-${month}`;
}

export function shiftMonth(month: string, by: number): string {
  const [year, number] = month.split('-').map(Number) as [number, number];
  const index = year * 12 + (number - 1) + by;

  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
}

export function monthRange(from: string, count: number): string[] {
  return Array.from({ length: count }, (_, step) => shiftMonth(from, step));
}
