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

export type GeneratePrestationInput = z.infer<typeof GeneratePrestationSchema>;
export type GenerateMaintenanceInput = z.infer<typeof GenerateMaintenanceSchema>;
export type GenerateContratPrestationInput = z.infer<typeof GenerateContratPrestationSchema>;
export type GenerateContratMaintenanceInput = z.infer<typeof GenerateContratMaintenanceSchema>;
export type DocumentItem = z.infer<typeof DocumentItemSchema>;
