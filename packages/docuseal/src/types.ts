import { z } from 'zod';

export const submissionStatusSchema = z.enum([
  'pending',
  'awaiting',
  'completed',
  'expired',
  'declined'
]);

export type SubmissionStatus = z.infer<typeof submissionStatusSchema>;

export const submitterSchema = z.object({
  id: z.number(),
  submission_id: z.number(),
  uuid: z.string(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  name: z.string().optional(),
  role: z.string(),
  status: submissionStatusSchema,
  sent_at: z.string().nullable(),
  opened_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  declined_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  metadata: z.record(z.any()).optional(),
  preferences: z.record(z.any()).optional(),
  values: z.record(z.any()).optional(),
});

export type Submitter = z.infer<typeof submitterSchema>;

export const submissionSchema = z.object({
  id: z.number(),
  template_id: z.number().nullable(),
  created_by_user_id: z.number().nullable(),
  source: z.string(),
  submitters_order: z.enum(['preserved', 'random']),
  slug: z.string(),
  status: submissionStatusSchema,
  archived_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  template: z.object({
    id: z.number(),
    name: z.string(),
    external_id: z.string().nullable(),
    folder_name: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
  }).nullable(),
  submitters: z.array(submitterSchema),
  audit_log_url: z.string().nullable(),
  combined_document_url: z.string().nullable(),
});

export type Submission = z.infer<typeof submissionSchema>;

export const templateSchema = z.object({
  id: z.number(),
  name: z.string(),
  external_id: z.string().nullable(),
  folder_name: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  schema: z.array(z.any()),
  submitters: z.array(z.object({
    name: z.string(),
    uuid: z.string(),
  })),
  documents: z.array(z.object({
    id: z.number(),
    url: z.string(),
    filename: z.string(),
    preview_images: z.array(z.object({
      url: z.string(),
    })),
  })),
});

export type Template = z.infer<typeof templateSchema>;

export interface CreateSubmissionParams {
  template_id: number;
  send_email?: boolean;
  send_sms?: boolean;
  submitters: Array<{
    role: string;
    email?: string;
    phone?: string;
    name?: string;
    values?: Record<string, any>;
    metadata?: Record<string, any>;
  }>;
  reply_to?: string;
  message?: {
    subject?: string;
    body?: string;
  };
  metadata?: Record<string, any>;
}

export interface CreateSubmissionFromPdfParams {
  name: string;
  send_email?: boolean;
  send_sms?: boolean;
  files: Array<{
    name: string;
    url: string;
  }>;
  submitters: Array<{
    role: string;
    email?: string;
    phone?: string;
    name?: string;
  }>;
  metadata?: Record<string, any>;
}

export interface ListSubmissionsParams {
  limit?: number;
  after?: number;
  before?: number;
  template_id?: number;
  status?: SubmissionStatus;
}

export interface ListTemplatesParams {
  limit?: number;
  after?: number;
  before?: number;
  folder?: string;
}

export interface DocuSealConfig {
  apiUrl: string;
  apiKey: string;
}
