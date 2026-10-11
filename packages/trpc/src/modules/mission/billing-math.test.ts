import { describe, expect, it } from 'bun:test';
import {
  planInvoice,
  sameLines,
  sameDeposit,
  totalsOf,
  billingState,
  type BillingLine,
} from './billing-math';

const quote: BillingLine[] = [
  { description: 'Maquettes', quantity: 2, unit: 'jour', price: 500 },
  { description: 'Hébergement', quantity: 1, unit: 'mois', price: 80 },
];

const plan = (
  request: 'TOTAL' | 'DEPOSIT',
  depositPercent: number | null,
  deposits: number[] = []
) =>
  planInvoice({
    request,
    quoteLines: quote,
    depositPercent,
    missionName: 'Site vitrine',
    priorDeposits: deposits.map((subtotalCents, i) => ({
      invoiceNumber: `FA-00${i + 1}`,
      subtotalCents,
    })),
  });

describe('totalsOf', () => {
  it('adds the lines and the tax in cents', () => {
    expect(totalsOf(quote, 20)).toEqual({ subtotal: 1080, tva: 216, total: 1296 });
  });

  it('rounds the tax to the cent', () => {
    expect(totalsOf([{ quantity: 1, price: 10.01 }], 20)).toEqual({
      subtotal: 10.01,
      tva: 2,
      total: 12.01,
    });
  });
});

describe('planInvoice', () => {
  it('bills the whole quote when there is no deposit', () => {
    const result = plan('TOTAL', null);

    expect(result.kind).toBe('FULL');
    expect(result.lines).toEqual(quote);
  });

  it('bills a share of the quote excluding tax as the deposit', () => {
    const result = plan('DEPOSIT', 30);

    expect(result.kind).toBe('DEPOSIT');
    expect(result.lines).toEqual([
      { description: 'Acompte 30 % – Site vitrine', quantity: 1, unit: 'forfait', price: 324 },
    ]);
  });

  it('writes a decimal percentage with a comma', () => {
    expect(plan('DEPOSIT', 12.5).lines[0].description).toBe('Acompte 12,5 % – Site vitrine');
  });

  it('refuses a deposit when the mission has none', () => {
    expect(() => plan('DEPOSIT', null)).toThrow('This mission has no deposit');
  });

  it('refuses a second deposit', () => {
    expect(() => plan('DEPOSIT', 30, [32400])).toThrow('A deposit invoice already exists');
  });

  it('deducts the deposit already billed from the balance', () => {
    const result = plan('TOTAL', 30, [32400]);

    expect(result.kind).toBe('BALANCE');
    expect(result.lines.at(-1)).toEqual({
      description: 'Acompte déjà facturé (FA-001)',
      quantity: 1,
      unit: 'forfait',
      price: -324,
    });
    expect(totalsOf(result.lines, 20).total).toBe(907.2);
  });

  it('refuses a balance when the deposits exceed the quote', () => {
    expect(() => plan('TOTAL', 30, [200000])).toThrow('exceed the quote total');
  });

  it('refuses a balance when nothing is left', () => {
    expect(() => plan('TOTAL', 30, [108000])).toThrow('Nothing is left to invoice');
  });
});

describe('sameLines', () => {
  const items = quote.map((line) => ({ ...line }));

  it('matches identical lines', () => {
    expect(sameLines(quote, items)).toBe(true);
  });

  it('spots a changed price, quantity, unit, description or count', () => {
    expect(sameLines([{ ...quote[0], price: 501 }, quote[1]], items)).toBe(false);
    expect(sameLines([{ ...quote[0], quantity: 3 }, quote[1]], items)).toBe(false);
    expect(sameLines([{ ...quote[0], unit: 'heure' }, quote[1]], items)).toBe(false);
    expect(sameLines([{ ...quote[0], description: 'Autre' }, quote[1]], items)).toBe(false);
    expect(sameLines([quote[0]], items)).toBe(false);
  });

  it('does not match a quote with no items', () => {
    expect(sameLines(quote, null)).toBe(false);
  });
});

describe('sameDeposit', () => {
  it('compares the recorded percentage with the mission', () => {
    expect(sameDeposit({ depositPercent: 30 }, 30)).toBe(true);
    expect(sameDeposit({ depositPercent: 30 }, 20)).toBe(false);
    expect(sameDeposit(null, null)).toBe(true);
    expect(sameDeposit({ depositPercent: null }, 30)).toBe(false);
  });
});

describe('billingState', () => {
  const lines = quote;
  const items = quote.map((line) => ({ ...line }));
  const accepted = { acceptedAt: new Date(), items, serviceData: { depositPercent: 30 } };
  const state = (overrides: Partial<Parameters<typeof billingState>[0]> = {}) =>
    billingState({
      status: 'ACCEPTED',
      lines,
      depositPercent: 30,
      currentQuote: accepted,
      invoices: [],
      ...overrides,
    });

  it('asks for a first quote once there are lines', () => {
    const result = state({ status: 'DRAFT', currentQuote: null });

    expect(result.needsQuote).toBe(true);
    expect(result.canGenerateQuote).toBe(true);
    expect(result.canAcceptQuote).toBe(false);
    expect(result.canInvoiceTotal).toBe(false);
  });

  it('has nothing to quote without lines', () => {
    expect(state({ lines: [], currentQuote: null }).canGenerateQuote).toBe(false);
  });

  it('lets the accepted quote be invoiced in full or as a deposit', () => {
    const result = state();

    expect(result.canInvoiceTotal).toBe(true);
    expect(result.canInvoiceDeposit).toBe(true);
    expect(result.canGenerateQuote).toBe(false);
  });

  it('offers no deposit when the mission has none', () => {
    const result = state({
      depositPercent: null,
      currentQuote: { ...accepted, serviceData: { depositPercent: null } },
    });

    expect(result.canInvoiceDeposit).toBe(false);
    expect(result.canInvoiceTotal).toBe(true);
  });

  it('wants a new quote as soon as a line changes, and blocks invoicing', () => {
    const result = state({ lines: [{ ...quote[0], price: 600 }, quote[1]] });

    expect(result.quoteOutdated).toBe(true);
    expect(result.canGenerateQuote).toBe(true);
    expect(result.canAcceptQuote).toBe(false);
    expect(result.canInvoiceTotal).toBe(false);
  });

  it('treats a changed deposit percentage as a change too', () => {
    expect(state({ depositPercent: 40 }).quoteOutdated).toBe(true);
  });

  it('lets a quote be accepted while it is current and not yet accepted', () => {
    const result = state({ status: 'QUOTED', currentQuote: { ...accepted, acceptedAt: null } });

    expect(result.canAcceptQuote).toBe(true);
    expect(result.canInvoiceTotal).toBe(false);
  });

  it('keeps the lines editable after a deposit but allows only one deposit', () => {
    const result = state({ status: 'INVOICED', invoices: [{ invoiceKind: 'DEPOSIT' }] });

    expect(result.canEditPrestations).toBe(true);
    expect(result.canInvoiceDeposit).toBe(false);
    expect(result.canInvoiceTotal).toBe(true);
  });

  it('locks everything once a full or balance invoice exists', () => {
    for (const kind of ['FULL', 'BALANCE', null] as const) {
      const result = state({ status: 'INVOICED', invoices: [{ invoiceKind: kind }] });

      expect(result.locked).toBe(true);
      expect(result.canEditPrestations).toBe(false);
      expect(result.canGenerateQuote).toBe(false);
      expect(result.canInvoiceTotal).toBe(false);
    }
  });

  it('does nothing on a cancelled mission', () => {
    const result = state({ status: 'CANCELLED' });

    expect(result.canEditPrestations).toBe(false);
    expect(result.canInvoiceTotal).toBe(false);
  });
});
