import { DocuSealClient } from '@repo/docuseal';
import type {
  CreateSubmissionParams,
  CreateSubmissionFromPdfParams,
  ListSubmissionsParams,
  ListTemplatesParams,
} from '@repo/docuseal';

export class DocuSealService {
  private client: DocuSealClient | null = null;

  constructor(apiUrl?: string, apiKey?: string) {
    if (apiUrl && apiKey) {
      this.client = new DocuSealClient({ apiUrl, apiKey });
    }
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  private ensureConfigured(): DocuSealClient {
    if (!this.client) {
      throw new Error('DocuSeal is not configured. Please configure DocuSeal in the backoffice settings.');
    }
    return this.client;
  }

  async listSubmissions(params?: ListSubmissionsParams) {
    return this.ensureConfigured().listSubmissions(params);
  }

  async getSubmission(id: number) {
    return this.ensureConfigured().getSubmission(id);
  }

  async createSubmission(params: CreateSubmissionParams) {
    return this.ensureConfigured().createSubmission(params);
  }

  async createSubmissionFromPdf(params: CreateSubmissionFromPdfParams) {
    return this.ensureConfigured().createSubmissionFromPdf(params);
  }

  async deleteSubmission(id: number) {
    return this.ensureConfigured().deleteSubmission(id);
  }

  async listTemplates(params?: ListTemplatesParams) {
    return this.ensureConfigured().listTemplates(params);
  }

  async getTemplate(id: number) {
    return this.ensureConfigured().getTemplate(id);
  }

  async getSubmitter(id: number) {
    return this.ensureConfigured().getSubmitter(id);
  }

  async updateSubmitter(id: number, params: {
    email?: string;
    phone?: string;
    values?: Record<string, any>;
    metadata?: Record<string, any>;
  }) {
    return this.ensureConfigured().updateSubmitter(id, params);
  }
}
