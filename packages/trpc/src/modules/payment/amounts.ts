export const toCents = (value: unknown): number => Math.round(Number(value) * 100);

export const PAYABLE_STATUSES = ['PENDING', 'PAST_DUE', 'FAILED', 'EXPIRED'] as const;

export const CLAIMABLE_STATUSES = [
  ...PAYABLE_STATUSES,
  'PROCESSING',
  'AWAITING_CONFIRMATION',
] as const;

export const isPayableStatus = (status: string): boolean =>
  (PAYABLE_STATUSES as readonly string[]).includes(status);

export interface AmountSource {
  amount: unknown;
  totalWithFees: unknown;
}

export function expectedCents(payment: AmountSource): number {
  return toCents(payment.amount);
}

export function legacyCents(payment: AmountSource): number[] {
  return [toCents(payment.amount), toCents(payment.totalWithFees)];
}

export function paymentReference(payment: {
  id: string;
  reference?: string | null;
  document?: { invoiceNumber: string | null } | null;
}): string {
  return (
    payment.reference?.trim() ||
    payment.document?.invoiceNumber ||
    `PAY-${payment.id.slice(-8).toUpperCase()}`
  );
}
