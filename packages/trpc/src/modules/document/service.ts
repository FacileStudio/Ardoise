import {
  TypstGenerator,
  escapeTypstString,
  facture_prestation,
  devis,
  maintenance,
  contrat_prestation,
  contrat_maintenance,
  back_contractuel,
  appel_de_fonds,
  prestation_barman,
  prestation_design,
  prestation_dev,
  prestation_photo,
  prestation_video,
  prestation_formation,
  prestation_btp,
} from '@repo/typst';
import { z } from 'zod';
import { createHash, randomUUID } from 'node:crypto';
import { TRPCError } from '@trpc/server';
import type { PrismaClient } from '@repo/database';
import type { StorageService } from '@repo/storage';
import { documentDefaults, getSpaceSettings } from '../space/settings';
import { providersOfSpace } from '../space/studio';
import spaceService, { scopeSpaceId, scopeWhere, type Scope } from '../space/service';

export const DocTypeSchema = z.enum([
  'facture_prestation',
  'devis',
  'maintenance',
  'contrat_prestation',
  'contrat_maintenance',
  'back_contractuel',
  'appel_de_fonds',
  'prestation_barman',
  'prestation_design',
  'prestation_dev',
  'prestation_photo',
  'prestation_video',
  'prestation_formation',
  'prestation_btp',
]);
export type DocType = z.infer<typeof DocTypeSchema>;

export const DocumentItemSchema = z.object({
  description: z.string(),
  quantity: z.number().positive(),
  unit: z.string(),
  price: z.number().nonnegative(),
});

// a balance invoice carries negative lines for the deposits already billed
const InvoiceLineSchema = DocumentItemSchema.extend({ price: z.number() });

export const ProviderSchema = z.object({
  id: z.string(),
  role: z.string(),
  amount: z.number().nonnegative(),
});

export const ProviderDataSchema = z.object({
  name: z.string(),
  role: z.string(),
  address: z.string(),
  city: z.string(),
  siret: z.string(),
  email: z.string(),
  amount: z.number().nonnegative(),
});

export const FeatureSchema = z.object({
  title: z.string(),
  desc: z.string(),
});

export const PaymentProviderSchema = z.object({
  id: z.string(),
  amount_to_pay: z.number().nonnegative(),
});

export const PaymentProviderDataSchema = z.object({
  name: z.string(),
  iban: z.string(),
  bic: z.string(),
  amount_to_pay: z.number().nonnegative(),
});

// Removed global DocumentDataSchema - each document type now has its own dedicated schema
// This prevents validation conflicts where optional fields were being validated incorrectly
export type DocumentData = {
  type: DocType;
  invoice_number?: string;
  invoice_date?: string;
  due_date?: string;
  delivery_date?: string;
  quote_number?: string;
  quote_date?: string;
  validity_date?: string;
  maintenance_period?: string;
  contract_reference?: string;
  contract_date?: string;
  clientId: string;
  providerId?: string;
  client_name?: string;
  client_address?: string;
  client_city?: string;
  client_postal_code?: string;
  client_country?: string;
  client_siret?: string;
  client_tva_intracom?: string;
  provider_name?: string;
  provider_legal?: string;
  provider_legal_form?: string;
  provider_share_capital?: number | string;
  provider_rcs_city?: string;
  provider_ape_code?: string;
  provider_tva_intracom?: string;
  provider_address?: string;
  provider_city?: string;
  provider_postal_code?: string;
  provider_siret?: string;
  provider_email?: string;
  provider_phone?: string;
  bank_name?: string;
  iban?: string;
  bic?: string;
  items?: Array<{description?: string; quantity?: number; unit?: string; price?: number}>;
  tva_rate: number;
  payment_terms_days?: number;
  late_fee_rate?: string;
  recovery_fee_amount?: number;
  vat_exemption_mention?: string;
  legal_mentions?: string;
  vat_exempt?: boolean;
  railway_estimate?: number;
  project_name?: string;
  deposit_percent?: number | string;
  invoice_title?: string;
  valid_until?: string;
  providers?: Array<{name: string; role: string; address: string; city: string; siret: string; email: string; amount: number}>;
  features?: Array<{title: string; desc: string}>;
  global_invoice_ref?: string;
  project_step?: string;
  payment_providers?: Array<{name: string; iban: string; bic: string; amount_to_pay: number}>;
};

// Type-specific data schemas for validation in generateDocument()
// Using passthrough() to avoid extending the base schema's default behavior
const ContratMaintenanceDataSchema = z.object({
  type: z.literal('contrat_maintenance'),
  contract_reference: z.string(),
  contract_date: z.string(),
  maintenance_period: z.string(),
  clientId: z.string(),
  providerId: z.string(),
  client_name: z.string().optional(),
  client_address: z.string().optional(),
  client_city: z.string().optional(),
  client_country: z.string().optional(),
  client_siret: z.string().optional(),
  provider_name: z.string().optional(),
  provider_legal: z.string().optional(),
  provider_address: z.string().optional(),
  provider_city: z.string().optional(),
  provider_siret: z.string().optional(),
  provider_email: z.string().optional(),
  provider_phone: z.string().optional(),
  bank_name: z.string().optional(),
  iban: z.string().optional(),
  bic: z.string().optional(),
  items: z.array(DocumentItemSchema).optional().default([]),
  tva_rate: z.number().nonnegative().default(20),
  railway_estimate: z.number().optional().default(0),
}).passthrough();

const ContratPrestationDataSchema = z.object({
  type: z.literal('contrat_prestation'),
  contract_reference: z.string(),
  contract_date: z.string(),
  quote_number: z.string().optional(),
  clientId: z.string(),
  providerId: z.string(),
  client_name: z.string().optional(),
  client_address: z.string().optional(),
  client_city: z.string().optional(),
  client_country: z.string().optional(),
  client_siret: z.string().optional(),
  provider_name: z.string().optional(),
  provider_legal: z.string().optional(),
  provider_address: z.string().optional(),
  provider_city: z.string().optional(),
  provider_siret: z.string().optional(),
  provider_email: z.string().optional(),
  provider_phone: z.string().optional(),
  bank_name: z.string().optional(),
  iban: z.string().optional(),
  bic: z.string().optional(),
  items: z.array(DocumentItemSchema).optional().default([]),
  tva_rate: z.number().nonnegative().default(20),
}).passthrough();

const FacturePrestationDataSchema = z.object({
  type: z.literal('facture_prestation'),
  invoice_number: z.string(),
  invoice_date: z.string(),
  due_date: z.string(),
  clientId: z.string(),
  providerId: z.string(),
  client_name: z.string().optional(),
  client_address: z.string().optional(),
  client_city: z.string().optional(),
  client_country: z.string().optional(),
  client_siret: z.string().optional(),
  provider_name: z.string().optional(),
  provider_legal: z.string().optional(),
  provider_address: z.string().optional(),
  provider_city: z.string().optional(),
  provider_siret: z.string().optional(),
  provider_email: z.string().optional(),
  provider_phone: z.string().optional(),
  bank_name: z.string().optional(),
  iban: z.string().optional(),
  bic: z.string().optional(),
  items: z.array(InvoiceLineSchema).min(1, "Au moins un article est requis pour une facture"),
  tva_rate: z.number().nonnegative().default(20),
  railway_estimate: z.number().optional().default(0),
}).passthrough();

const MaintenanceDataSchema = z.object({
  type: z.literal('maintenance'),
  quote_number: z.string(),
  quote_date: z.string(),
  validity_date: z.string(),
  maintenance_period: z.string(),
  clientId: z.string(),
  providerId: z.string(),
  client_name: z.string().optional(),
  client_address: z.string().optional(),
  client_city: z.string().optional(),
  client_country: z.string().optional(),
  client_siret: z.string().optional(),
  provider_name: z.string().optional(),
  provider_legal: z.string().optional(),
  provider_address: z.string().optional(),
  provider_city: z.string().optional(),
  provider_siret: z.string().optional(),
  provider_email: z.string().optional(),
  provider_phone: z.string().optional(),
  bank_name: z.string().optional(),
  iban: z.string().optional(),
  bic: z.string().optional(),
  items: z.array(DocumentItemSchema).min(1, "Au moins un article est requis pour un devis"),
  tva_rate: z.number().nonnegative().default(20),
  railway_estimate: z.number().optional().default(0),
}).passthrough();

const DevisDataSchema = z.object({
  type: z.literal('devis'),
  quote_number: z.string(),
  quote_date: z.string(),
  validity_date: z.string(),
  clientId: z.string(),
  providerId: z.string(),
  client_name: z.string().optional(),
  client_address: z.string().optional(),
  client_city: z.string().optional(),
  client_country: z.string().optional(),
  client_siret: z.string().optional(),
  provider_name: z.string().optional(),
  provider_legal: z.string().optional(),
  provider_address: z.string().optional(),
  provider_city: z.string().optional(),
  provider_siret: z.string().optional(),
  provider_email: z.string().optional(),
  provider_phone: z.string().optional(),
  items: z.array(DocumentItemSchema).min(1, "Au moins un article est requis pour un devis"),
  tva_rate: z.number().nonnegative().default(20),
}).passthrough();

const BackContractuelDataSchema = z.object({
  type: z.literal('back_contractuel'),
  contract_reference: z.string(),
  contract_date: z.string(),
  project_name: z.string(),
  valid_until: z.string(),
  clientId: z.string(),
  providerId: z.string().optional(),
  client_name: z.string().optional(),
  client_address: z.string().optional(),
  client_city: z.string().optional(),
  client_country: z.string().optional(),
  client_siret: z.string().optional(),
  provider_name: z.string().optional(),
  provider_legal: z.string().optional(),
  provider_address: z.string().optional(),
  provider_city: z.string().optional(),
  provider_siret: z.string().optional(),
  provider_email: z.string().optional(),
  provider_phone: z.string().optional(),
  bank_name: z.string().optional(),
  iban: z.string().optional(),
  bic: z.string().optional(),
  providers: z.array(ProviderDataSchema).min(1, "Au moins un sous-traitant est requis"),
  features: z.array(FeatureSchema).optional().default([]),
  items: z.array(DocumentItemSchema).optional().default([]),
  tva_rate: z.number().nonnegative().default(20),
}).passthrough();

const AppelDeFondsDataSchema = z.object({
  type: z.literal('appel_de_fonds'),
  global_invoice_ref: z.string(),
  invoice_date: z.string(),
  due_date: z.string(),
  project_step: z.string(),
  project_name: z.string(),
  clientId: z.string(),
  providerId: z.string().optional(),
  client_name: z.string().optional(),
  client_address: z.string().optional(),
  client_city: z.string().optional(),
  client_country: z.string().optional(),
  client_siret: z.string().optional(),
  provider_name: z.string().optional(),
  provider_legal: z.string().optional(),
  provider_address: z.string().optional(),
  provider_city: z.string().optional(),
  provider_siret: z.string().optional(),
  provider_email: z.string().optional(),
  provider_phone: z.string().optional(),
  bank_name: z.string().optional(),
  iban: z.string().optional(),
  bic: z.string().optional(),
  payment_providers: z.array(PaymentProviderDataSchema).min(1, "Au moins un prestataire de paiement est requis"),
  items: z.array(DocumentItemSchema).optional().default([]),
  tva_rate: z.number().nonnegative().default(20),
}).passthrough();

const SERVICE_DOC_TYPES = [
  'prestation_barman',
  'prestation_design',
  'prestation_dev',
  'prestation_photo',
  'prestation_video',
  'prestation_formation',
  'prestation_btp',
] as const;

const serviceDataSchema = <T extends (typeof SERVICE_DOC_TYPES)[number]>(type: T) =>
  z.object({
    type: z.literal(type),
    invoice_number: z.string(),
    invoice_date: z.string(),
    due_date: z.string(),
    clientId: z.string(),
    providerId: z.string(),
    client_name: z.string().optional(),
    client_address: z.string().optional(),
    client_city: z.string().optional(),
    client_country: z.string().optional(),
    client_siret: z.string().optional(),
    provider_name: z.string().optional(),
    provider_legal: z.string().optional(),
    provider_address: z.string().optional(),
    provider_city: z.string().optional(),
    provider_siret: z.string().optional(),
    provider_email: z.string().optional(),
    provider_phone: z.string().optional(),
    bank_name: z.string().optional(),
    iban: z.string().optional(),
    bic: z.string().optional(),
    items: z.array(DocumentItemSchema).min(1, "Au moins un article est requis pour une facture"),
    tva_rate: z.number().nonnegative().default(20),
    railway_estimate: z.number().optional().default(0),
  }).passthrough();

const SERVICE_DATA_SCHEMAS = Object.fromEntries(
  SERVICE_DOC_TYPES.map((type) => [type, serviceDataSchema(type)])
) as Record<(typeof SERVICE_DOC_TYPES)[number], ReturnType<typeof serviceDataSchema>>;

export const ContratPrestationInputSchema = z.object({
  contract_reference: z.string().optional(),
  contract_date: z.string().min(1, "La date du contrat est requise"),
  quote_number: z.string().optional(),
  clientId: z.string().min(1, "Le client est requis"),
  providerId: z.string().min(1, "Le prestataire est requis"),
});

export type ContratPrestationInput = z.infer<typeof ContratPrestationInputSchema>;

export const ContratMaintenanceInputSchema = z.object({
  contract_reference: z.string().optional(),
  contract_date: z.string().min(1, "La date du contrat est requise"),
  maintenance_period: z.string().min(1, "La période de maintenance est requise"),
  clientId: z.string().min(1, "Le client est requis"),
  providerId: z.string().min(1, "Le prestataire est requis"),
});

export type ContratMaintenanceInput = z.infer<typeof ContratMaintenanceInputSchema>;

export const BackContractuelInputSchema = z.object({
  contract_reference: z.string().optional(),
  contract_date: z.string().min(1, "La date du contrat est requise"),
  project_name: z.string().min(1, "Le nom du projet est requis"),
  valid_until: z.string().min(1, "La date de validité est requise"),
  clientId: z.string().min(1, "Le client est requis"),
  providerId: z.string().min(1, "Le prestataire est requis"),
  providers: z.array(ProviderSchema).min(1, "Au moins un sous-traitant est requis"),
  features: z.array(FeatureSchema).optional(),
  items: z.array(DocumentItemSchema).optional(),
});

export type BackContractuelInput = z.infer<typeof BackContractuelInputSchema>;

export const AppelDeFondsInputSchema = z.object({
  global_invoice_ref: z.string().optional(),
  invoice_date: z.string().min(1, "La date de facture est requise"),
  due_date: z.string().min(1, "La date d'échéance est requise"),
  project_step: z.string().min(1, "L'étape du projet est requise"),
  project_name: z.string().min(1, "Le nom du projet est requis"),
  clientId: z.string().min(1, "Le client est requis"),
  providerId: z.string().min(1, "Le prestataire est requis"),
  payment_providers: z.array(PaymentProviderSchema).min(1, "Au moins un prestataire de paiement est requis"),
  items: z.array(DocumentItemSchema).optional().default([]),
});

export type AppelDeFondsInput = z.infer<typeof AppelDeFondsInputSchema>;

export const PrestationPhotoInputSchema = z.object({
  invoice_date: z.string().min(1, "La date de facture est requise"),
  due_date: z.string().min(1, "La date d'échéance est requise"),
  clientId: z.string().min(1, "Le client est requis"),
  providerId: z.string().min(1, "Le prestataire est requis"),
  items: z.array(DocumentItemSchema).min(1, "Au moins un article est requis"),
  railway_estimate: z.number().nonnegative().optional().default(0),
  shoot_date: z.string().min(1, "La date du shooting est requise"),
  shoot_time: z.string().min(1, "L'heure du shooting est requise"),
  shoot_location: z.string().min(1, "Le lieu du shooting est requis"),
  shoot_duration: z.string().min(1, "La durée du shooting est requise"),
  shoot_type: z.string().min(1, "Le type de shooting est requis"),
});

export type PrestationPhotoInput = z.infer<typeof PrestationPhotoInputSchema>;

export const PrestationVideoInputSchema = z.object({
  invoice_date: z.string().min(1, "La date de facture est requise"),
  due_date: z.string().min(1, "La date d'échéance est requise"),
  clientId: z.string().min(1, "Le client est requis"),
  providerId: z.string().min(1, "Le prestataire est requis"),
  items: z.array(DocumentItemSchema).min(1, "Au moins un article est requis"),
  railway_estimate: z.number().nonnegative().optional().default(0),
  shoot_date: z.string().min(1, "La date du tournage est requise"),
  shoot_time: z.string().min(1, "L'heure du tournage est requise"),
  shoot_location: z.string().min(1, "Le lieu du tournage est requis"),
  shoot_duration: z.string().min(1, "La durée du tournage est requise"),
  video_type: z.string().min(1, "Le type de vidéo est requis"),
});

export type PrestationVideoInput = z.infer<typeof PrestationVideoInputSchema>;

const TEMPLATES: Record<DocType, string> = {
  facture_prestation,
  devis,
  maintenance,
  contrat_prestation,
  contrat_maintenance,
  back_contractuel,
  appel_de_fonds,
  prestation_barman,
  prestation_design,
  prestation_dev,
  prestation_photo,
  prestation_video,
  prestation_formation,
  prestation_btp,
};

export { escapeTypstString };

export function formatItems(items: Array<{ description?: string; quantity?: number; unit?: string; price?: number }>): string {
  if (!items || items.length === 0) return '';
  return items.map((item) => {
    const safePrice = parseFloat(String(item.price)) || 0;
    const safeQty = parseFloat(String(item.quantity)) || 1;
    return `(description: "${escapeTypstString(item.description)}", quantity: ${safeQty}, unit: "${escapeTypstString(item.unit || 'u')}", price: ${safePrice})`;
  }).join(', ') + ',';
}

export function formatProviders(providers: Array<{ name: string; role: string; address: string; city: string; siret: string; email: string; amount: number }>): string {
  if (!providers || providers.length === 0) return '';
  return providers.map((p) => {
    const safeAmount = parseFloat(String(p.amount)) || 0;
    return `(name: "${escapeTypstString(p.name)}", role: "${escapeTypstString(p.role)}", address: "${escapeTypstString(p.address)}", city: "${escapeTypstString(p.city)}", siret: "${escapeTypstString(p.siret)}", email: "${escapeTypstString(p.email)}", amount: ${safeAmount})`;
  }).join(', ') + ',';
}

export function formatFeatures(features: Array<{ title: string; desc: string }>): string {
  if (!features || features.length === 0) return '';
  return features.map((f) => {
    return `(title: "${escapeTypstString(f.title)}", desc: "${escapeTypstString(f.desc)}")`;
  }).join(', ') + ',';
}

export function formatPaymentProviders(providers: Array<{ name: string; iban: string; bic: string; amount_to_pay: number }>): string {
  if (!providers || providers.length === 0) return '';
  return providers.map((p) => {
    const safeAmount = parseFloat(String(p.amount_to_pay)) || 0;
    return `(name: "${escapeTypstString(p.name)}", iban: "${escapeTypstString(p.iban)}", bic: "${escapeTypstString(p.bic)}", amount_to_pay: ${safeAmount})`;
  }).join(', ') + ',';
}

// these variables already hold Typst code that the format* helpers escaped
const TYPST_CODE_VARIABLES = new Set(['items', 'providers', 'features', 'payment_providers']);

export function injectVariables(content: string, variables: Record<string, any>): string {
  return content.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_tag, key: string) => {
    if (variables[key] === undefined) {
      return /rate|price|amount|estimate|qty/.test(key) ? '0.00' : '';
    }
    return TYPST_CODE_VARIABLES.has(key) ? String(variables[key]) : escapeTypstString(variables[key]);
  });
}

function isBlank(value: string | null | undefined): boolean {
  return !value || value.trim() === '';
}

function isValidEmail(value: string | null | undefined): boolean {
  if (isBlank(value)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value!.trim());
}

function getMissingProviderFields(data: DocumentData): string[] {
  if (!data.providerId) return [];

  const missingFields: string[] = [];
  const requiresBanking = data.type === 'maintenance' || data.type === 'facture_prestation' || data.type.startsWith('prestation_');

  if (isBlank(data.provider_address)) missingFields.push('adresse');
  if (isBlank(data.provider_city)) missingFields.push('ville');
  if (isBlank(data.provider_siret)) missingFields.push('SIRET');
  if (!isValidEmail(data.provider_email)) missingFields.push('email');
  if (isBlank(data.provider_phone)) missingFields.push('téléphone');

  if (requiresBanking) {
    if (isBlank(data.bank_name)) missingFields.push('nom de la banque');
    if (isBlank(data.iban)) missingFields.push('IBAN');
    if (isBlank(data.bic)) missingFields.push('BIC');
  }

  return missingFields;
}

export async function generateDocument(
  data: DocumentData,
  logoPath?: string
): Promise<Buffer> {
  let validated: DocumentData;
  switch (data.type) {
    case 'contrat_maintenance':
      validated = ContratMaintenanceDataSchema.parse(data);
      break;
    case 'contrat_prestation':
      validated = ContratPrestationDataSchema.parse(data);
      break;
    case 'facture_prestation':
      validated = FacturePrestationDataSchema.parse(data);
      break;
    case 'maintenance':
      validated = MaintenanceDataSchema.parse(data);
      break;
    case 'devis':
      validated = DevisDataSchema.parse(data) as DocumentData;
      break;
    case 'back_contractuel':
      validated = BackContractuelDataSchema.parse(data);
      break;
    case 'appel_de_fonds':
      validated = AppelDeFondsDataSchema.parse(data);
      break;
    default: {
      const schema = SERVICE_DATA_SCHEMAS[data.type as keyof typeof SERVICE_DATA_SCHEMAS];
      if (!schema) throw new Error(`Unknown document type: ${data.type}`);
      validated = schema.parse(data) as DocumentData;
    }
  }

  const template = TEMPLATES[validated.type];

  if (!template) {
    throw new Error(`Template not found for type: ${validated.type}`);
  }

  const missingProviderFields = getMissingProviderFields(validated);
  if (missingProviderFields.length > 0) {
    throw new Error(
      `Prestataire incomplet: renseignez ${missingProviderFields.join(', ')} dans la fiche prestataire avant de générer ce document`
    );
  }

  const v = validated as DocumentData;
  const templateData: Record<string, any> = {
    ...(validated as Record<string, any>),
    invoice_number: validated.invoice_number || '',
    invoice_date: validated.invoice_date || '',
    due_date: validated.due_date || '',
    delivery_date: v.delivery_date || '',
    quote_number: validated.quote_number || '',
    quote_date: validated.quote_date || '',
    validity_date: validated.validity_date || '',
    maintenance_period: validated.maintenance_period || '',
    contract_reference: validated.contract_reference || '',
    contract_date: validated.contract_date || '',

    // Generic number and date fields used by templates
    number: validated.contract_reference || validated.invoice_number || validated.quote_number || '',
    date: validated.contract_date || validated.invoice_date || validated.quote_date || '',

    client_name: validated.client_name,
    client_address: validated.client_address,
    client_city: validated.client_city,
    client_postal_code: v.client_postal_code || '',
    client_country: validated.client_country,
    client_siret: validated.client_siret,
    client_tva_intracom: v.client_tva_intracom || '',

    provider_name: validated.provider_name,
    provider_legal: validated.provider_legal || validated.provider_name,
    provider_legal_form: v.provider_legal_form || '',
    provider_share_capital: v.provider_share_capital ?? '',
    provider_rcs_city: v.provider_rcs_city || '',
    provider_ape_code: v.provider_ape_code || '',
    provider_tva_intracom: v.provider_tva_intracom || '',
    provider_address: validated.provider_address,
    provider_city: validated.provider_city,
    provider_postal_code: v.provider_postal_code || '',
    provider_siret: validated.provider_siret,
    provider_email: validated.provider_email,
    provider_phone: validated.provider_phone,

    bank_name: validated.bank_name || '',
    iban: validated.iban || '',
    bic: validated.bic || '',

    items: formatItems(validated.items || []),
    tva_rate: validated.tva_rate,
    payment_terms_days: v.payment_terms_days ?? 30,
    late_fee_rate: v.late_fee_rate || "3 fois le taux d'intérêt légal en vigueur",
    recovery_fee_amount: v.recovery_fee_amount ?? 40,
    vat_exemption_mention: v.vat_exemption_mention || '',
    legal_mentions: v.legal_mentions || '',
    vat_exempt: v.vat_exempt ? 'true' : 'false',
    railway_estimate: validated.railway_estimate,

    invoice_title: v.invoice_title || 'FACTURE',
    deposit_percent: v.deposit_percent ?? '',

    // For back_contractuel and devis
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

  return generator.compile();
}

export async function loadDocumentContext(
  db: PrismaClient,
  userId: string,
  clientId: string,
  providerId: string,
  spaceId?: string,
  missionId?: string
) {
  const reachable = await spaceService.resolveScope(db, userId, spaceId);

  const client = await db.client.findFirst({
    where: { id: clientId, ...scopeWhere(reachable) },
  });

  if (!client) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Client not found' });
  }

  const scope = await spaceService.resolveScope(db, userId, client.spaceId);

  const provider = await db.provider.findFirst({
    where: { AND: [{ id: providerId }, await providersOfSpace(db, client.spaceId)] },
  });

  if (!provider) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Provider not found' });
  }

  if (missionId) {
    const mission = await db.mission.findFirst({
      where: { id: missionId, clientId: client.id, ...scopeWhere(scope) },
      select: { id: true, status: true },
    });

    if (!mission) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Mission not found' });
    }

    if (mission.status === 'CANCELLED') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Mission is cancelled' });
    }
  }

  const settings = documentDefaults(await getSpaceSettings(db, client.spaceId));
  const tvaRate = settings.defaultVatExempt ? 0 : provider.tvaRate == null ? 20 : Number(provider.tvaRate);

  return { client, provider, settings, tvaRate, scope, missionId: missionId ?? null };
}

export function computeInvoiceTotals(
  items: Array<{ quantity?: number; price?: number }>,
  tvaRate: number,
  railwayEstimate: number = 0
) {
  const subtotal = items.reduce(
    (sum, item) => sum + (Number(item.quantity ?? 0) * Number(item.price ?? 0)),
    0
  );
  const totalWithRailway = subtotal + (railwayEstimate || 0);
  const tva = totalWithRailway * (tvaRate / 100);
  const total = totalWithRailway + tva;
  return { subtotal, totalWithRailway, tva, total };
}

export interface StoredPdf {
  id: string;
  pdfUrl: string;
  pdfHash: string;
}

export async function storeDocumentPdf(storage: StorageService, pdf: Buffer): Promise<StoredPdf> {
  const id = randomUUID();
  const key = `documents/${id}.pdf`;

  await storage.upload(key, pdf, 'application/pdf');

  return {
    id,
    pdfUrl: storage.getFileUrl(key),
    pdfHash: createHash('sha256').update(pdf).digest('hex'),
  };
}

export function buildDocumentPersistenceBase(
  documentData: DocumentData,
  providerId: string,
  fileSize: number,
  createdBy: string,
  legalPersistence: ReturnType<typeof buildDocumentLegalPersistence>,
  scope: Scope,
  missionId: string | null = null,
  stored?: StoredPdf
) {
  return {
    spaceId: scopeSpaceId(scope),
    missionId,
    ...stored,
    clientName: documentData.client_name ?? '',
    clientSiret: documentData.client_siret,
    clientAddress: documentData.client_address,
    clientCity: documentData.client_city,
    clientCountry: documentData.client_country,
    providerId,
    providerName: documentData.provider_name ?? '',
    providerLegal: documentData.provider_legal,
    providerSiret: documentData.provider_siret,
    providerAddress: documentData.provider_address,
    providerCity: documentData.provider_city,
    providerEmail: documentData.provider_email,
    providerPhone: documentData.provider_phone,
    ...legalPersistence,
    fileSize,
    createdBy,
  };
}

type ClientLike = {
  companyName: string;
  siret?: string | null;
  tvaIntracom?: string | null;
  billingAddress?: string | null;
  billingCity?: string | null;
  billingPostalCode?: string | null;
  billingCountry?: string | null;
};

type ProviderLike = {
  name: string;
  legalName?: string | null;
  legalForm?: string | null;
  shareCapital?: unknown;
  rcsCity?: string | null;
  apeCode?: string | null;
  tvaIntracom?: string | null;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  siret?: string | null;
  email?: string | null;
  phone?: string | null;
  bankName?: string | null;
  iban?: string | null;
  bic?: string | null;
};

type SettingsLike = {
  defaultPaymentTermsDays?: number | null;
  defaultLateFeeRate?: string | null;
  defaultRecoveryFeeAmount?: unknown;
  defaultVatExempt?: boolean;
  defaultVatExemptionMention?: string | null;
  defaultLegalMentions?: string | null;
};

export function buildPartyAndLegalData(
  client: ClientLike,
  provider: ProviderLike,
  settings: SettingsLike | null | undefined
) {
  return {
    client_name: client.companyName,
    client_address: client.billingAddress || '',
    client_city: client.billingCity || '',
    client_postal_code: client.billingPostalCode || '',
    client_country: client.billingCountry || '',
    client_siret: client.siret || '',
    client_tva_intracom: client.tvaIntracom || '',
    provider_name: provider.name,
    provider_legal: provider.legalName || provider.name,
    provider_legal_form: provider.legalForm || '',
    provider_share_capital: provider.shareCapital != null ? Number(provider.shareCapital) : '',
    provider_rcs_city: provider.rcsCity || '',
    provider_ape_code: provider.apeCode || '',
    provider_tva_intracom: provider.tvaIntracom || '',
    provider_address: provider.address || '',
    provider_city: provider.city || '',
    provider_postal_code: provider.postalCode || '',
    provider_siret: provider.siret || '',
    provider_email: provider.email || '',
    provider_phone: provider.phone || '',
    bank_name: provider.bankName || '',
    iban: provider.iban || '',
    bic: provider.bic || '',
    payment_terms_days: settings?.defaultPaymentTermsDays ?? 30,
    late_fee_rate: settings?.defaultLateFeeRate || "3 fois le taux d'intérêt légal en vigueur",
    recovery_fee_amount: settings?.defaultRecoveryFeeAmount != null ? Number(settings.defaultRecoveryFeeAmount) : 40,
    vat_exemption_mention: settings?.defaultVatExemptionMention || '',
    legal_mentions: settings?.defaultLegalMentions || '',
    vat_exempt: settings?.defaultVatExempt === true,
  };
}

export function buildDocumentLegalPersistence(
  client: ClientLike,
  provider: ProviderLike,
  settings: SettingsLike | null | undefined
) {
  return {
    clientPostalCode: client.billingPostalCode || null,
    clientTvaIntracom: client.tvaIntracom || null,
    providerPostalCode: provider.postalCode || null,
    providerTvaIntracom: provider.tvaIntracom || null,
    providerLegalForm: provider.legalForm || null,
    providerShareCapital: provider.shareCapital != null ? provider.shareCapital as never : null,
    providerRcsCity: provider.rcsCity || null,
    providerApeCode: provider.apeCode || null,
    paymentTermsDays: settings?.defaultPaymentTermsDays ?? 30,
    lateFeeRate: settings?.defaultLateFeeRate || "3 fois le taux d'intérêt légal en vigueur",
    recoveryFeeAmount: settings?.defaultRecoveryFeeAmount != null ? settings.defaultRecoveryFeeAmount as never : 40 as never,
    vatExemptionMention: settings?.defaultVatExemptionMention || null,
  };
}

export function generateTypstContent(data: DocumentData): string {
  // No validation needed here - just format the data that's already been validated
  const template = TEMPLATES[data.type];

  if (!template) {
    throw new Error(`Template not found for type: ${data.type}`);
  }

  const templateData: Record<string, any> = {
    ...(data as Record<string, any>),
    invoice_number: data.invoice_number || '',
    invoice_date: data.invoice_date || '',
    due_date: data.due_date || '',
    delivery_date: data.delivery_date || '',
    quote_number: data.quote_number || '',
    quote_date: data.quote_date || '',
    validity_date: data.validity_date || '',
    maintenance_period: data.maintenance_period || '',
    contract_reference: data.contract_reference || '',
    contract_date: data.contract_date || '',

    // Generic number and date fields used by templates
    number: data.contract_reference || data.invoice_number || data.quote_number || '',
    date: data.contract_date || data.invoice_date || data.quote_date || '',

    client_name: data.client_name,
    client_address: data.client_address,
    client_city: data.client_city,
    client_postal_code: data.client_postal_code || '',
    client_country: data.client_country,
    client_siret: data.client_siret,
    client_tva_intracom: data.client_tva_intracom || '',

    provider_name: data.provider_name,
    provider_legal: data.provider_legal || data.provider_name,
    provider_legal_form: data.provider_legal_form || '',
    provider_share_capital: data.provider_share_capital ?? '',
    provider_rcs_city: data.provider_rcs_city || '',
    provider_ape_code: data.provider_ape_code || '',
    provider_tva_intracom: data.provider_tva_intracom || '',
    provider_address: data.provider_address,
    provider_city: data.provider_city,
    provider_postal_code: data.provider_postal_code || '',
    provider_siret: data.provider_siret,
    provider_email: data.provider_email,
    provider_phone: data.provider_phone,

    bank_name: data.bank_name || '',
    iban: data.iban || '',
    bic: data.bic || '',

    items: formatItems(data.items || []),
    tva_rate: data.tva_rate,
    payment_terms_days: data.payment_terms_days ?? 30,
    late_fee_rate: data.late_fee_rate || "3 fois le taux d'intérêt légal en vigueur",
    recovery_fee_amount: data.recovery_fee_amount ?? 40,
    vat_exemption_mention: data.vat_exemption_mention || '',
    legal_mentions: data.legal_mentions || '',
    vat_exempt: data.vat_exempt ? 'true' : 'false',
    railway_estimate: data.railway_estimate,

    // For back_contractuel
    project_name: data.project_name || '',
    valid_until: data.valid_until || '',
    providers: formatProviders(data.providers || []),
    features: formatFeatures(data.features || []),

    // For appel_de_fonds
    global_invoice_ref: data.global_invoice_ref || '',
    project_step: data.project_step || '',
    payment_providers: formatPaymentProviders(data.payment_providers || []),
  };

  return injectVariables(template, templateData);
}
