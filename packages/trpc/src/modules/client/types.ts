import { z } from 'zod';

export const CreateClientSchema = z.object({
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactFirstName: z.string().min(1),
  contactLastName: z.string().min(1),
  companyName: z.string().min(1),
  billingAddress: z.string().optional(),
  billingCity: z.string().optional(),
  billingCountry: z.string().optional(),
  siret: z.string().optional(),
  createCredentials: z.boolean().default(false),
  credentialEmail: z.string().email().optional().or(z.literal('')),
  credentialPassword: z.string().min(8).optional().or(z.literal('')),
});

export const UpdateClientSchema = z.object({
  id: z.string(),
  contactFirstName: z.string().min(1).optional(),
  contactLastName: z.string().min(1).optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  companyName: z.string().min(1).optional(),
  billingAddress: z.string().optional().nullable(),
  billingCity: z.string().optional().nullable(),
  billingCountry: z.string().optional().nullable(),
  siret: z.string().optional(),
});

export const ListClientsSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
  search: z.string().optional(),
});

export const GetByIdSchema = z.object({
  id: z.string(),
});

export type CreateClientInput = z.infer<typeof CreateClientSchema>;
export type UpdateClientInput = z.infer<typeof UpdateClientSchema>;
export type ListClientsInput = z.infer<typeof ListClientsSchema>;
export type GetByIdInput = z.infer<typeof GetByIdSchema>;
