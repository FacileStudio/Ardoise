import { z } from 'zod';

export const CreateClientSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  companyName: z.string().min(1),
  billingAddress: z.string().min(1),
  billingCity: z.string().min(1),
  billingCountry: z.string().min(1).default('France'),
  siret: z.string().optional(),
  password: z.string().min(8),
});

export const UpdateClientSchema = z.object({
  id: z.string(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  companyName: z.string().min(1).optional(),
  billingAddress: z.string().min(1).optional(),
  billingCity: z.string().min(1).optional(),
  billingCountry: z.string().min(1).optional(),
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
