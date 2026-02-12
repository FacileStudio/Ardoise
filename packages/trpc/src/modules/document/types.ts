import { z } from 'zod';

export const DocumentItemSchema = z.object({
  description: z.string(),
  quantity: z.number().positive(),
  unit: z.string(),
  price: z.number().nonnegative(),
});

export const GeneratePrestationSchema = z.object({
  number: z.string(),
  date: z.string(),
  dueDate: z.string(),
  clientId: z.string(),
  items: z.array(DocumentItemSchema).min(1),
});

export const GenerateMaintenanceSchema = z.object({
  number: z.string(),
  date: z.string(),
  validityDate: z.string(),
  maintenancePeriod: z.string(),
  railwayEstimate: z.number().default(0),
  clientId: z.string(),
  items: z.array(DocumentItemSchema).min(1),
});

export const GenerateContratPrestationSchema = z.object({
  number: z.string(),
  date: z.string(),
  quoteNumber: z.string(),
  clientId: z.string(),
});

export const GenerateContratMaintenanceSchema = z.object({
  number: z.string(),
  date: z.string(),
  clientId: z.string(),
});

export const PrestationInputSchema = z.object({
  invoice_number: z.string().min(1, 'Invoice number is required'),
  invoice_date: z.string().min(1, 'Invoice date is required'),
  due_date: z.string().min(1, 'Due date is required'),
  clientId: z.string().min(1, 'Client is required'),
  providerId: z.string().min(1, 'Provider is required'),
  items: z.array(DocumentItemSchema).min(1, 'At least one item is required'),
  tva_rate: z.number().nonnegative().default(20),
  railway_estimate: z.number().nonnegative().optional().default(0),
});

export const MaintenanceInputSchema = z.object({
  quote_number: z.string().min(1, 'Quote number is required'),
  quote_date: z.string().min(1, 'Quote date is required'),
  validity_date: z.string().min(1, 'Validity date is required'),
  maintenance_period: z.string().min(1, 'Maintenance period is required'),
  clientId: z.string().min(1, 'Client is required'),
  providerId: z.string().min(1, 'Provider is required'),
  items: z.array(DocumentItemSchema).min(1, 'At least one item is required'),
  tva_rate: z.number().nonnegative().default(20),
  railway_estimate: z.number().nonnegative().optional().default(0),
});

export type GeneratePrestationInput = z.infer<typeof GeneratePrestationSchema>;
export type GenerateMaintenanceInput = z.infer<typeof GenerateMaintenanceSchema>;
export type GenerateContratPrestationInput = z.infer<typeof GenerateContratPrestationSchema>;
export type GenerateContratMaintenanceInput = z.infer<typeof GenerateContratMaintenanceSchema>;
export type PrestationInput = z.infer<typeof PrestationInputSchema>;
export type MaintenanceInput = z.infer<typeof MaintenanceInputSchema>;
export type DocumentItem = z.infer<typeof DocumentItemSchema>;
