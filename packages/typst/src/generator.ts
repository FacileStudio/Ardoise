import { execSync } from 'child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync, copyFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import { escapeTypstString } from './escape';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const COMPILE_TIMEOUT_MS = 60_000;
const DEFAULT_LOGO_PATH = join(__dirname, 'templates', 'logo.png');

export const ReceiptItemSchema = z.object({
  description: z.string(),
  quantity: z.number().positive(),
  unit: z.string(),
  // a balance invoice deducts the deposit already billed as a negative line
  price: z.number(),
});

export const ReceiptDataSchema = z.object({
  receiptNumber: z.string(),
  receiptDate: z.string(),
  paymentMethod: z.string().default('Carte bancaire'),
  clientName: z.string(),
  clientAddress: z.string(),
  clientCity: z.string(),
  clientCountry: z.string(),
  clientSiret: z.string().optional().default(''),
  providerName: z.string(),
  providerAddress: z.string(),
  providerCity: z.string(),
  providerSiret: z.string(),
  providerEmail: z.string().email(),
  providerPhone: z.string(),
  items: z.array(ReceiptItemSchema).optional().default([]),
  tvaRate: z.number().nonnegative().default(20),
  vatExempt: z.boolean().optional().default(false),
  vatExemptionMention: z.string().optional().default(''),
});

export type ReceiptItem = z.infer<typeof ReceiptItemSchema>;
export type ReceiptData = z.infer<typeof ReceiptDataSchema>;

export class TypstGenerator {
  private templateContent: string;
  private logoPath?: string;

  constructor(template: string, logoPath?: string) {
    this.templateContent = template;
    this.logoPath = logoPath;
    this.checkTypstInstalled();
  }

  private checkTypstInstalled(): void {
    try {
      execSync('typst --version', { stdio: 'ignore' });
    } catch {
      throw new Error(
        'Typst CLI is not installed. Please install it from https://github.com/typst/typst or run: brew install typst'
      );
    }
  }

  private replaceTemplate(template: string, data: Record<string, unknown>): string {
    return template.replace(/\{\{([A-Za-z0-9_]+)\}\}/g, (placeholder, key: string) => {
      if (!(key in data)) return placeholder;
      return key === 'items' ? String(data[key]) : escapeTypstString(data[key]);
    });
  }

  private formatItems(items: ReceiptItem[]): string {
    if (!items || items.length === 0) {
      return '';
    }
    const formattedItems = items.map(
      (item) =>
        `(description: "${escapeTypstString(item.description)}", quantity: ${item.quantity}, unit: "${escapeTypstString(item.unit)}", price: ${item.price})`
    );
    return formattedItems.join(', ') + ',';
  }

  generate(data: ReceiptData): Buffer {
    const validated = ReceiptDataSchema.parse(data);

    const templateData = {
      receipt_number: validated.receiptNumber,
      receipt_date: validated.receiptDate,
      payment_method: validated.paymentMethod,
      client_name: validated.clientName,
      client_address: validated.clientAddress,
      client_city: validated.clientCity,
      client_country: validated.clientCountry,
      client_siret: validated.clientSiret,
      provider_name: validated.providerName,
      provider_address: validated.providerAddress,
      provider_city: validated.providerCity,
      provider_siret: validated.providerSiret,
      provider_email: validated.providerEmail,
      provider_phone: validated.providerPhone,
      items: this.formatItems(validated.items),
      tva_rate: validated.tvaRate,
      vat_exempt: validated.vatExempt ? 'true' : 'false',
      vat_exemption_mention: validated.vatExemptionMention,
    };

    return this.compile(this.replaceTemplate(this.templateContent, templateData));
  }

  compile(typstContent = this.templateContent): Buffer {
    const tempDir = mkdtempSync(join(tmpdir(), 'typst-'));
    const typstPath = join(tempDir, 'document.typ');
    const pdfPath = join(tempDir, 'document.pdf');

    try {
      writeFileSync(typstPath, typstContent, 'utf-8');

      const logoSource = this.logoPath && existsSync(this.logoPath)
        ? this.logoPath
        : DEFAULT_LOGO_PATH;

      if (existsSync(logoSource)) {
        copyFileSync(logoSource, join(tempDir, 'logo.png'));
      } else {
        throw new Error(`Logo file not found at ${logoSource}`);
      }

      const fontsDir = join(__dirname, '..', 'fonts');
      const fontPathArg = existsSync(fontsDir) ? `--font-path "${fontsDir}"` : '';

      execSync(`typst compile ${fontPathArg} "${typstPath}" "${pdfPath}"`, {
        stdio: 'pipe',
        timeout: COMPILE_TIMEOUT_MS,
      });

      if (!existsSync(pdfPath)) {
        throw new Error('PDF generation failed: output file not found');
      }

      const pdfBuffer = readFileSync(pdfPath);
      return pdfBuffer;
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  }

}
