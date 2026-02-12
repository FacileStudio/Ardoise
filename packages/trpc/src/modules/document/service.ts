import {
  TypstGenerator,
  prestation,
  maintenance,
  contrat_prestation,
  contrat_maintenance,
} from '@repo/typst';
import { z } from 'zod';

export const DocTypeSchema = z.enum(['prestation', 'maintenance', 'contrat_prestation', 'contrat_maintenance']);
export type DocType = z.infer<typeof DocTypeSchema>;

export const DocumentItemSchema = z.object({
  description: z.string(),
  quantity: z.number().positive(),
  unit: z.string(),
  price: z.number().nonnegative(),
});

export const DocumentDataSchema = z.object({
  type: DocTypeSchema,
  invoice_number: z.string().optional(),
  invoice_date: z.string().optional(),
  due_date: z.string().optional(),
  quote_number: z.string().optional(),
  quote_date: z.string().optional(),
  validity_date: z.string().optional(),
  maintenance_period: z.string().optional(),
  contract_reference: z.string().optional(),
  contract_date: z.string().optional(),

  client_name: z.string(),
  client_address: z.string(),
  client_city: z.string(),
  client_country: z.string(),
  client_siret: z.string().optional().default(''),

  providerId: z.string().optional(),

  provider_name: z.string(),
  provider_legal: z.string().optional(),
  provider_address: z.string(),
  provider_city: z.string(),
  provider_siret: z.string(),
  provider_email: z.string().email(),
  provider_phone: z.string(),

  bank_name: z.string().optional(),
  iban: z.string().optional(),
  bic: z.string().optional(),

  items: z.array(DocumentItemSchema).optional().default([]),
  tva_rate: z.number().nonnegative().default(20),
  railway_estimate: z.number().nonnegative().optional().default(0),
});

export type DocumentData = z.infer<typeof DocumentDataSchema>;

const TEMPLATES: Record<DocType, string> = {
  prestation,
  maintenance,
  contrat_prestation,
  contrat_maintenance,
};

export function formatItems(items: Array<{ description: string; quantity: number; unit: string; price: number }>): string {
  if (!items || items.length === 0) return '';
  return items.map((item) => {
    const safePrice = parseFloat(String(item.price)) || 0;
    const safeQty = parseFloat(String(item.quantity)) || 1;
    return `(description: "${item.description}", quantity: ${safeQty}, unit: "${item.unit || 'u'}", price: ${safePrice})`;
  }).join(', ') + ',';
}

export function injectVariables(content: string, variables: Record<string, any>): string {
  let result = content;
  const tags = content.match(/\{\{([a-zA-Z0-9_]+)\}\}/g) || [];

  tags.forEach((tag) => {
    const key = tag.slice(2, -2);
    if (variables[key] !== undefined) {
      result = result.replaceAll(tag, String(variables[key]));
    } else {
      const isNumeric = key.match(/rate|price|amount|estimate|qty/);
      result = result.replaceAll(tag, isNumeric ? '0.00' : '');
    }
  });
  return result;
}

export async function generateDocument(
  data: DocumentData,
  logoPath?: string
): Promise<Buffer> {
  const validated = DocumentDataSchema.parse(data);
  const template = TEMPLATES[validated.type];

  if (!template) {
    throw new Error(`Template not found for type: ${validated.type}`);
  }

  const templateData: Record<string, any> = {
    invoice_number: validated.invoice_number || '',
    invoice_date: validated.invoice_date || '',
    due_date: validated.due_date || '',
    quote_number: validated.quote_number || '',
    quote_date: validated.quote_date || '',
    validity_date: validated.validity_date || '',
    maintenance_period: validated.maintenance_period || '',
    contract_reference: validated.contract_reference || '',
    contract_date: validated.contract_date || '',

    client_name: validated.client_name,
    client_address: validated.client_address,
    client_city: validated.client_city,
    client_country: validated.client_country,
    client_siret: validated.client_siret,

    provider_name: validated.provider_name,
    provider_legal: validated.provider_legal || validated.provider_name,
    provider_address: validated.provider_address,
    provider_city: validated.provider_city,
    provider_siret: validated.provider_siret,
    provider_email: validated.provider_email,
    provider_phone: validated.provider_phone,

    bank_name: validated.bank_name || '',
    iban: validated.iban || '',
    bic: validated.bic || '',

    items: formatItems(validated.items),
    tva_rate: validated.tva_rate,
    railway_estimate: validated.railway_estimate,
  };

  const typstContent = injectVariables(template, templateData);
  const generator = new TypstGenerator(typstContent, logoPath);

  return generator.generate({
    receiptNumber: templateData.invoice_number || templateData.quote_number || 'DOC-001',
    receiptDate: templateData.invoice_date || templateData.quote_date || templateData.contract_date || new Date().toISOString().split('T')[0],
    paymentMethod: 'Virement',
    clientName: templateData.client_name,
    clientAddress: templateData.client_address,
    clientCity: templateData.client_city,
    clientCountry: templateData.client_country,
    clientSiret: templateData.client_siret,
    providerName: templateData.provider_name,
    providerAddress: templateData.provider_address,
    providerCity: templateData.provider_city,
    providerSiret: templateData.provider_siret,
    providerEmail: templateData.provider_email,
    providerPhone: templateData.provider_phone,
    items: validated.items,
    tvaRate: templateData.tva_rate,
  });
}

export function generateTypstContent(data: DocumentData): string {
  const validated = DocumentDataSchema.parse(data);
  const template = TEMPLATES[validated.type];

  if (!template) {
    throw new Error(`Template not found for type: ${validated.type}`);
  }

  const templateData: Record<string, any> = {
    invoice_number: validated.invoice_number || '',
    invoice_date: validated.invoice_date || '',
    due_date: validated.due_date || '',
    quote_number: validated.quote_number || '',
    quote_date: validated.quote_date || '',
    validity_date: validated.validity_date || '',
    maintenance_period: validated.maintenance_period || '',
    contract_reference: validated.contract_reference || '',
    contract_date: validated.contract_date || '',

    client_name: validated.client_name,
    client_address: validated.client_address,
    client_city: validated.client_city,
    client_country: validated.client_country,
    client_siret: validated.client_siret,

    provider_name: validated.provider_name,
    provider_legal: validated.provider_legal || validated.provider_name,
    provider_address: validated.provider_address,
    provider_city: validated.provider_city,
    provider_siret: validated.provider_siret,
    provider_email: validated.provider_email,
    provider_phone: validated.provider_phone,

    bank_name: validated.bank_name || '',
    iban: validated.iban || '',
    bic: validated.bic || '',

    items: formatItems(validated.items),
    tva_rate: validated.tva_rate,
    railway_estimate: validated.railway_estimate,
  };

  return injectVariables(template, templateData);
}
