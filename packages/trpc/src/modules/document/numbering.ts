import { Prisma, type PrismaClient } from '@repo/database';

type DocumentType = 'invoice' | 'quote' | 'contract';

interface NumberingConfig {
  counterField: 'nextInvoiceNumber' | 'nextQuoteNumber' | 'nextContractNumber';
  formatField: 'invoiceNumberFormat' | 'quoteNumberFormat' | 'contractNumberFormat';
}

const typeConfig: Record<DocumentType, NumberingConfig> = {
  invoice: {
    counterField: 'nextInvoiceNumber',
    formatField: 'invoiceNumberFormat',
  },
  quote: {
    counterField: 'nextQuoteNumber',
    formatField: 'quoteNumberFormat',
  },
  contract: {
    counterField: 'nextContractNumber',
    formatField: 'contractNumberFormat',
  },
};

function formatNumber(template: string | null | undefined, number: number): string {
  const safeTemplate = template || 'DOC-{{year}}-{{number}}';

  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const paddedNumber = String(number).padStart(3, '0');

  return safeTemplate
    .replace('{{year}}', String(year))
    .replace('{{month}}', month)
    .replace('{{number}}', paddedNumber);
}

export async function generateNextDocumentNumber(
  db: PrismaClient,
  type: DocumentType
): Promise<string> {
  const config = typeConfig[type];

  try {
    const settings = await db.settings.update({
      where: { id: 'global' },
      data: { [config.counterField]: { increment: 1 } },
    });

    return formatNumber(settings[config.formatField], settings[config.counterField] - 1);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new Error('Settings not found. Please initialize settings first.');
    }
    throw error;
  }
}

export async function previewDocumentNumber(
  db: PrismaClient,
  type: DocumentType
): Promise<string> {
  const config = typeConfig[type];

  const settings = await db.settings.findUnique({
    where: { id: 'global' },
  });

  if (!settings) {
    throw new Error('Settings not found. Please initialize settings first.');
  }

  const currentNumber = settings[config.counterField];
  const format = settings[config.formatField];

  return formatNumber(format, currentNumber);
}
