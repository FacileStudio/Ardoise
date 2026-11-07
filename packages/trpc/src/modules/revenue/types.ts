import { z } from 'zod';

export const RevenueOverviewSchema = z
  .object({
    spaceId: z.string().optional(),
  })
  .optional();

export const FORECAST_SOURCES = ['scheduled', 'recurring', 'unbilled', 'invoiced'] as const;

export type ForecastSource = (typeof FORECAST_SOURCES)[number];

export interface MonthAmount {
  month: string;
  amount: string;
}

export interface OpenPaymentItem {
  id: string;
  amount: string;
  dueDate: string;
  status: string;
  frequency: string;
  overdue: boolean;
  clientName: string;
  missionId: string | null;
  missionName: string | null;
}

export interface ForecastSourceTotals {
  months: MonthAmount[];
  undated: string;
  later: string;
  total: string;
}

export interface RevenueOverview {
  currency: 'EUR';
  timeZone: string;
  collected: {
    thisMonth: string;
    thisYear: string;
    months: MonthAmount[];
  };
  toCollect: {
    overdue: { amount: string; count: number };
    upcoming: { amount: string; count: number };
    total: string;
    items: OpenPaymentItem[];
    truncated: boolean;
  };
  forecast: {
    months: string[];
    sources: Record<ForecastSource, ForecastSourceTotals>;
    total: string;
  };
}
