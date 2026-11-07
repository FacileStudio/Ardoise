import type { Prisma, PrismaClient } from '@repo/database';

export const DEFAULT_LATE_FEE_RATE = "3 fois le taux d'intérêt légal en vigueur";

export const DEFAULT_VAT_EXEMPTION_MENTION = 'TVA non applicable, art. 293 B du CGI';

export const SPACE_SETTINGS_DEFAULTS = {
  invoiceNumberFormat: 'FAC-{{year}}-{{number}}',
  quoteNumberFormat: 'DEVIS-{{year}}-{{number}}',
  paymentTermsDays: 30,
  lateFeeRate: DEFAULT_LATE_FEE_RATE,
  recoveryFeeAmount: 40,
  vatExempt: false,
  vatExemptionMention: null as string | null,
  legalMentions: null as string | null,
  webhookUrl: null as string | null,
  webhookSecret: null as string | null,
  webhookEvents: [] as string[],
};

export type SpaceSettingsValues = typeof SPACE_SETTINGS_DEFAULTS;

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * The settings of one space, or the French defaults while the space has never
 * saved any. Never reads another space's row: the key is the space id the
 * caller already proved membership of.
 */
export async function getSpaceSettings(db: Db, spaceId: string): Promise<SpaceSettingsValues> {
  const row = await db.spaceSettings.findUnique({ where: { spaceId } });
  if (!row) return { ...SPACE_SETTINGS_DEFAULTS };

  return {
    invoiceNumberFormat: row.invoiceNumberFormat,
    quoteNumberFormat: row.quoteNumberFormat,
    paymentTermsDays: row.paymentTermsDays,
    lateFeeRate: row.lateFeeRate,
    recoveryFeeAmount: Number(row.recoveryFeeAmount),
    vatExempt: row.vatExempt,
    vatExemptionMention: row.vatExemptionMention,
    legalMentions: row.legalMentions,
    webhookUrl: row.webhookUrl,
    webhookSecret: row.webhookSecret,
    webhookEvents: row.webhookEvents,
  };
}

/** The payment and legal defaults a generated document starts from. */
export function documentDefaults(settings: SpaceSettingsValues) {
  return {
    defaultPaymentTermsDays: settings.paymentTermsDays,
    defaultLateFeeRate: settings.lateFeeRate,
    defaultRecoveryFeeAmount: settings.recoveryFeeAmount,
    defaultVatExempt: settings.vatExempt,
    defaultVatExemptionMention: settings.vatExempt
      ? settings.vatExemptionMention || DEFAULT_VAT_EXEMPTION_MENTION
      : settings.vatExemptionMention,
    defaultLegalMentions: settings.legalMentions,
  };
}
