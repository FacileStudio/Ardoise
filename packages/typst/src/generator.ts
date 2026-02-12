import { execSync } from 'child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync, copyFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DEFAULT_LOGO_PATH = join(__dirname, 'templates', 'logo.png');

export const ReceiptItemSchema = z.object({
  description: z.string(),
  quantity: z.number().positive(),
  unit: z.string(),
  price: z.number().nonnegative(),
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
  items: z.array(ReceiptItemSchema).min(1),
  tvaRate: z.number().nonnegative().default(20),
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
    } catch (error) {
      throw new Error(
        'Typst CLI is not installed. Please install it from https://github.com/typst/typst or run: brew install typst'
      );
    }
  }

  private replaceTemplate(template: string, data: Record<string, any>): string {
    let result = template;

    for (const [key, value] of Object.entries(data)) {
      const placeholder = `{{${key}}}`;
      result = result.replaceAll(placeholder, String(value));
    }

    return result;
  }

  private formatItems(items: ReceiptItem[]): string {
    const formattedItems = items.map(
      (item) =>
        `(description: "${item.description}", quantity: ${item.quantity}, unit: "${item.unit}", price: ${item.price})`
    );
    return formattedItems.join(', ');
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
    };

    const typstContent = this.replaceTemplate(this.templateContent, templateData);

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

      execSync(`typst compile "${typstPath}" "${pdfPath}"`, {
        stdio: 'inherit',
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
