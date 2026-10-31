import { describe, expect, it } from 'bun:test';
import { publicSettings } from './service';

describe('publicSettings', () => {
  it('exposes only what the payment page needs', () => {
    const exposed = publicSettings({
      companyName: 'Facile',
      iban: 'FR76',
      stripePublishableKey: 'pk_test',
      stripeSecretKey: 'enc',
      smtpPass: 'enc',
      webhookUrl: 'https://hook',
      nextInvoiceNumber: 412,
      invoiceNumberFormat: 'FAC-{{number}}',
      defaultRecoveryFeeAmount: 40,
      unknownFutureSecret: 'x',
    });

    expect(exposed).toMatchObject({ companyName: 'Facile', iban: 'FR76', stripePublishableKey: 'pk_test' });
    for (const hidden of [
      'stripeSecretKey',
      'smtpPass',
      'webhookUrl',
      'nextInvoiceNumber',
      'invoiceNumberFormat',
      'defaultRecoveryFeeAmount',
      'unknownFutureSecret',
    ]) {
      expect(exposed).not.toHaveProperty(hidden);
    }
  });
});
