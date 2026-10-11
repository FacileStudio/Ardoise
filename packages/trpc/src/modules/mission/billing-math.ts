import { TRPCError } from '@trpc/server';

export interface BillingLine {
  description: string;
  quantity: number;
  unit: string;
  price: number;
}

export interface PriorDeposit {
  invoiceNumber: string;
  subtotalCents: number;
}

export type InvoiceKind = 'FULL' | 'DEPOSIT' | 'BALANCE';

export const toCents = (amount: number) => Math.round(amount * 100);

// a line total is the quantity times the unit price, rounded to the cent
export const lineCents = (line: Pick<BillingLine, 'quantity' | 'price'>) =>
  Math.round(line.quantity * line.price * 100);

export const sumCents = (lines: Array<Pick<BillingLine, 'quantity' | 'price'>>) =>
  lines.reduce((sum, line) => sum + lineCents(line), 0);

// the VAT of an amount excluding tax, rounded to the cent
export const vatCents = (htCents: number, rate: number) => Math.round((htCents * rate) / 100);

export function totalsOf(lines: Array<Pick<BillingLine, 'quantity' | 'price'>>, tvaRate: number) {
  const ht = sumCents(lines);
  const tva = vatCents(ht, tvaRate);

  return { subtotal: ht / 100, tva: tva / 100, total: (ht + tva) / 100 };
}

const percentLabel = (percent: number) => String(percent).replace('.', ',');

function reject(message: string): never {
  throw new TRPCError({ code: 'BAD_REQUEST', message });
}

export function planInvoice(args: {
  request: 'TOTAL' | 'DEPOSIT';
  quoteLines: BillingLine[];
  depositPercent: number | null;
  missionName: string;
  priorDeposits: PriorDeposit[];
}): { kind: InvoiceKind; lines: BillingLine[] } {
  const { request, quoteLines, depositPercent, missionName, priorDeposits } = args;
  const quoteHt = sumCents(quoteLines);

  if (request === 'DEPOSIT') {
    if (!depositPercent) reject('This mission has no deposit');
    if (priorDeposits.length > 0) reject('A deposit invoice already exists');

    // the deposit is a share of the quote total excluding tax
    const deposit = Math.round((quoteHt * depositPercent) / 100);

    if (deposit <= 0) reject('The deposit amount is zero');

    return {
      kind: 'DEPOSIT',
      lines: [
        {
          description: `Acompte ${percentLabel(depositPercent)} % – ${missionName}`,
          quantity: 1,
          unit: 'forfait',
          price: deposit / 100,
        },
      ],
    };
  }

  if (priorDeposits.length === 0) {
    return { kind: 'FULL', lines: quoteLines };
  }

  const deductions = priorDeposits.map((deposit) => ({
    description: `Acompte déjà facturé (${deposit.invoiceNumber})`,
    quantity: 1,
    unit: 'forfait',
    price: -deposit.subtotalCents / 100,
  }));

  // what remains to invoice is the quote total minus every deposit already billed
  const remaining = quoteHt - priorDeposits.reduce((sum, d) => sum + d.subtotalCents, 0);

  if (remaining < 0) reject('The deposits already billed exceed the quote total');
  if (remaining === 0) reject('Nothing is left to invoice');

  return { kind: 'BALANCE', lines: [...quoteLines, ...deductions] };
}

interface PrestationLike {
  description: string;
  quantity: unknown;
  unit: string;
  unitPrice: unknown;
}

export function toBillingLines(prestations: PrestationLike[]): BillingLine[] {
  return prestations.map((p) => ({
    description: p.description,
    quantity: Number(p.quantity),
    unit: p.unit,
    price: Number(p.unitPrice),
  }));
}

export function sameLines(current: BillingLine[], quoteItems: unknown): boolean {
  if (!Array.isArray(quoteItems) || quoteItems.length !== current.length) return false;

  return current.every((line, index) => {
    const item = quoteItems[index] as Partial<BillingLine>;

    return (
      item.description === line.description &&
      toCents(Number(item.quantity)) === toCents(line.quantity) &&
      item.unit === line.unit &&
      toCents(Number(item.price)) === toCents(line.price)
    );
  });
}

export function sameDeposit(quoteServiceData: unknown, depositPercent: number | null): boolean {
  const recorded = (quoteServiceData as { depositPercent?: number | null } | null)?.depositPercent;

  return (recorded ?? null) === depositPercent;
}

export interface BillingStateInput {
  status: string;
  lines: BillingLine[];
  depositPercent: number | null;
  currentQuote: { acceptedAt: Date | null; items: unknown; serviceData: unknown } | null;
  invoices: Array<{ invoiceKind: InvoiceKind | null }>;
}

export function billingState(input: BillingStateInput) {
  const { status, lines, depositPercent, currentQuote, invoices } = input;

  const open = status !== 'CANCELLED';
  // a deposit invoice leaves the lines editable, any other invoice ends the billing
  const locked = invoices.some((invoice) => invoice.invoiceKind !== 'DEPOSIT');
  const hasDeposit = invoices.some((invoice) => invoice.invoiceKind === 'DEPOSIT');
  const quoteOutdated = currentQuote
    ? !(
        sameLines(lines, currentQuote.items) &&
        sameDeposit(currentQuote.serviceData, depositPercent)
      )
    : false;
  const needsQuote = lines.length > 0 && (!currentQuote || quoteOutdated);
  const accepted = !!currentQuote?.acceptedAt && !quoteOutdated;

  return {
    locked,
    quoteOutdated,
    needsQuote,
    canEditPrestations: open && !locked,
    canGenerateQuote: open && !locked && needsQuote,
    canAcceptQuote: open && !!currentQuote && !currentQuote.acceptedAt && !quoteOutdated,
    canInvoiceDeposit: open && accepted && !locked && depositPercent != null && !hasDeposit,
    canInvoiceTotal: open && accepted && !locked,
  };
}
