import {
  TypstGenerator,
  prestation,
  maintenance,
  contrat_prestation,
  contrat_maintenance,
  back_contractuel,
  appel_de_fonds,
} from '@repo/typst';
import { z } from 'zod';

export const DocTypeSchema = z.enum(['prestation', 'maintenance', 'contrat_prestation', 'contrat_maintenance', 'back_contractuel', 'appel_de_fonds']);
export type DocType = z.infer<typeof DocTypeSchema>;

export const DocumentItemSchema = z.object({
  description: z.string(),
  quantity: z.number().positive(),
  unit: z.string(),
  price: z.number().nonnegative(),
});

export const ProviderSchema = z.object({
  name: z.string(),
  role: z.string(),
  address: z.string(),
  city: z.string(),
  siret: z.string(),
  email: z.string().email(),
  amount: z.number().nonnegative(),
});

export const FeatureSchema = z.object({
  title: z.string(),
  desc: z.string(),
});

export const PaymentProviderSchema = z.object({
  name: z.string(),
  iban: z.string(),
  bic: z.string(),
  amount_to_pay: z.number().nonnegative(),
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

  clientId: z.string(),
  providerId: z.string().optional(),

  // Client data (populated by backend after fetching from DB)
  client_name: z.string().optional(),
  client_address: z.string().optional(),
  client_city: z.string().optional(),
  client_country: z.string().optional(),
  client_siret: z.string().optional(),

  // Provider data (populated by backend after fetching from DB)
  provider_name: z.string().optional(),
  provider_legal: z.string().optional(),
  provider_address: z.string().optional(),
  provider_city: z.string().optional(),
  provider_siret: z.string().optional(),
  provider_email: z.string().optional(),
  provider_phone: z.string().optional(),

  // Bank data (populated by backend after fetching from DB)
  bank_name: z.string().optional(),
  iban: z.string().optional(),
  bic: z.string().optional(),

  items: z.array(DocumentItemSchema).optional(),
  tva_rate: z.number().nonnegative().default(20),
  railway_estimate: z.number().nonnegative().optional().default(0),

  // For back_contractuel
  project_name: z.string().optional(),
  valid_until: z.string().optional(),
  providers: z.array(ProviderSchema).optional(),
  features: z.array(FeatureSchema).optional(),

  // For appel_de_fonds
  global_invoice_ref: z.string().optional(),
  project_step: z.string().optional(),
  payment_providers: z.array(PaymentProviderSchema).optional(),
}).refine((data) => {
  // For prestation and maintenance, require at least one item
  if (data.type === 'prestation' || data.type === 'maintenance') {
    return data.items && data.items.length > 0;
  }
  // For all other types, items are optional (can be undefined or empty array)
  return true;
}, {
  message: "Au moins un article est requis pour ce type de document",
  path: ['items'],
}).transform((data) => {
  // Ensure arrays are never undefined
  return {
    ...data,
    items: data.items || [],
    providers: data.providers || [],
    features: data.features || [],
    payment_providers: data.payment_providers || [],
  };
}).refine((data) => {
  // ProviderId is required for all types except back_contractuel and appel_de_fonds
  if (data.type !== 'back_contractuel' && data.type !== 'appel_de_fonds') {
    return !!data.providerId;
  }
  return true;
}, {
  message: "Le prestataire est requis pour ce type de document",
  path: ['providerId'],
});

export type DocumentData = z.infer<typeof DocumentDataSchema>;

export const ContratPrestationInputSchema = z.object({
  contract_reference: z.string().min(1, "La référence du contrat est requise"),
  contract_date: z.string().min(1, "La date du contrat est requise"),
  quote_number: z.string().optional(),
  clientId: z.string().min(1, "Le client est requis"),
  providerId: z.string().min(1, "Le prestataire est requis"),
  items: z.array(DocumentItemSchema).optional(),
  tva_rate: z.number().nonnegative().default(20),
});

export type ContratPrestationInput = z.infer<typeof ContratPrestationInputSchema>;

export const ContratMaintenanceInputSchema = z.object({
  contract_reference: z.string().min(1, "La référence du contrat est requise"),
  contract_date: z.string().min(1, "La date du contrat est requise"),
  maintenance_period: z.string().min(1, "La période de maintenance est requise"),
  clientId: z.string().min(1, "Le client est requis"),
  providerId: z.string().min(1, "Le prestataire est requis"),
  items: z.array(DocumentItemSchema).optional(),
  tva_rate: z.number().nonnegative().default(20),
});

export type ContratMaintenanceInput = z.infer<typeof ContratMaintenanceInputSchema>;

export const BackContractuelInputSchema = z.object({
  contract_reference: z.string().min(1, "La référence du contrat est requise"),
  contract_date: z.string().min(1, "La date du contrat est requise"),
  project_name: z.string().min(1, "Le nom du projet est requis"),
  valid_until: z.string().min(1, "La date de validité est requise"),
  clientId: z.string().min(1, "Le client est requis"),
  providerId: z.string().optional(),
  providers: z.array(ProviderSchema).min(1, "Au moins un sous-traitant est requis"),
  features: z.array(FeatureSchema).optional(),
  items: z.array(DocumentItemSchema).optional(),
  tva_rate: z.number().nonnegative().default(20),
});

export type BackContractuelInput = z.infer<typeof BackContractuelInputSchema>;

export const AppelDeFondsInputSchema = z.object({
  global_invoice_ref: z.string().min(1, "La référence de la facture globale est requise"),
  invoice_date: z.string().min(1, "La date de facture est requise"),
  due_date: z.string().min(1, "La date d'échéance est requise"),
  project_step: z.string().min(1, "L'étape du projet est requise"),
  project_name: z.string().min(1, "Le nom du projet est requis"),
  clientId: z.string().min(1, "Le client est requis"),
  providerId: z.string().optional(),
  payment_providers: z.array(PaymentProviderSchema).min(1, "Au moins un prestataire de paiement est requis"),
  tva_rate: z.number().nonnegative().default(20),
});

export type AppelDeFondsInput = z.infer<typeof AppelDeFondsInputSchema>;

const TEMPLATES: Record<DocType, string> = {
  prestation,
  maintenance,
  contrat_prestation,
  contrat_maintenance,
  back_contractuel,
  appel_de_fonds,
};

export function formatItems(items: Array<{ description: string; quantity: number; unit: string; price: number }>): string {
  if (!items || items.length === 0) return '';
  return items.map((item) => {
    const safePrice = parseFloat(String(item.price)) || 0;
    const safeQty = parseFloat(String(item.quantity)) || 1;
    return `(description: "${item.description}", quantity: ${safeQty}, unit: "${item.unit || 'u'}", price: ${safePrice})`;
  }).join(', ') + ',';
}

export function formatProviders(providers: Array<{ name: string; role: string; address: string; city: string; siret: string; email: string; amount: number }>): string {
  if (!providers || providers.length === 0) return '';
  return providers.map((p) => {
    const safeAmount = parseFloat(String(p.amount)) || 0;
    return `(name: "${p.name}", role: "${p.role}", address: "${p.address}", city: "${p.city}", siret: "${p.siret}", email: "${p.email}", amount: ${safeAmount})`;
  }).join(', ');
}

export function formatFeatures(features: Array<{ title: string; desc: string }>): string {
  if (!features || features.length === 0) return '';
  return features.map((f) => {
    return `(title: "${f.title}", desc: "${f.desc}")`;
  }).join(', ');
}

export function formatPaymentProviders(providers: Array<{ name: string; iban: string; bic: string; amount_to_pay: number }>): string {
  if (!providers || providers.length === 0) return '';
  return providers.map((p) => {
    const safeAmount = parseFloat(String(p.amount_to_pay)) || 0;
    return `(name: "${p.name}", iban: "${p.iban}", bic: "${p.bic}", amount_to_pay: ${safeAmount})`;
  }).join(', ');
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

    // For back_contractuel
    project_name: validated.project_name || '',
    valid_until: validated.valid_until || '',
    providers: formatProviders(validated.providers || []),
    features: formatFeatures(validated.features || []),

    // For appel_de_fonds
    global_invoice_ref: validated.global_invoice_ref || '',
    project_step: validated.project_step || '',
    payment_providers: formatPaymentProviders(validated.payment_providers || []),
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

    // For back_contractuel
    project_name: validated.project_name || '',
    valid_until: validated.valid_until || '',
    providers: formatProviders(validated.providers || []),
    features: formatFeatures(validated.features || []),

    // For appel_de_fonds
    global_invoice_ref: validated.global_invoice_ref || '',
    project_step: validated.project_step || '',
    payment_providers: formatPaymentProviders(validated.payment_providers || []),
  };

  return injectVariables(template, templateData);
}
