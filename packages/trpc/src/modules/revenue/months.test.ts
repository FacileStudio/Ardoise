import { describe, expect, it } from 'bun:test';
import { monthRange, parisMonth, shiftMonth } from './months';

describe('months', () => {
  it('reads the month in Paris, not in UTC', () => {
    expect(parisMonth(new Date('2026-10-31T22:59:59Z'))).toBe('2026-10');
    expect(parisMonth(new Date('2026-10-31T23:00:00Z'))).toBe('2026-11');
    expect(parisMonth(new Date('2026-06-30T21:59:59Z'))).toBe('2026-06');
    expect(parisMonth(new Date('2026-06-30T22:00:00Z'))).toBe('2026-07');
  });

  it('shifts across years', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-11', 2)).toBe('2027-01');
    expect(monthRange('2026-11', 3)).toEqual(['2026-11', '2026-12', '2027-01']);
  });
});
