import type {
  DocuSealConfig,
  Submission,
  Template,
  Submitter,
  CreateSubmissionParams,
  CreateSubmissionFromPdfParams,
  ListSubmissionsParams,
  ListTemplatesParams,
} from './types';
import {
  submissionSchema,
  templateSchema,
  submitterSchema,
} from './types';

const REQUEST_TIMEOUT_MS = 30_000;

export class DocuSealClient {
  private config: DocuSealConfig;

  constructor(config: DocuSealConfig) {
    this.config = config;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.config.apiUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        'X-Auth-Token': this.config.apiKey,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`DocuSeal API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async listSubmissions(params?: ListSubmissionsParams): Promise<Submission[]> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.after) searchParams.append('after', params.after.toString());
    if (params?.before) searchParams.append('before', params.before.toString());
    if (params?.template_id) searchParams.append('template_id', params.template_id.toString());
    if (params?.status) searchParams.append('status', params.status);

    const query = searchParams.toString();
    const endpoint = `/submissions${query ? `?${query}` : ''}`;

    const data = await this.request<any>(endpoint);
    return Array.isArray(data) ? data.map(s => submissionSchema.parse(s)) : [];
  }

  async getSubmission(id: number): Promise<Submission> {
    const data = await this.request<any>(`/submissions/${id}`);
    return submissionSchema.parse(data);
  }

  async createSubmission(params: CreateSubmissionParams): Promise<Submission> {
    const data = await this.request<any>('/submissions', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return submissionSchema.parse(data);
  }

  async createSubmissionFromPdf(params: CreateSubmissionFromPdfParams): Promise<Submission> {
    const data = await this.request<any>('/submissions/pdf', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return submissionSchema.parse(data);
  }

  async deleteSubmission(id: number): Promise<void> {
    await this.request(`/submissions/${id}`, {
      method: 'DELETE',
    });
  }

  async listTemplates(params?: ListTemplatesParams): Promise<Template[]> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.after) searchParams.append('after', params.after.toString());
    if (params?.before) searchParams.append('before', params.before.toString());
    if (params?.folder) searchParams.append('folder', params.folder);

    const query = searchParams.toString();
    const endpoint = `/templates${query ? `?${query}` : ''}`;

    const data = await this.request<any>(endpoint);
    return Array.isArray(data) ? data.map(t => templateSchema.parse(t)) : [];
  }

  async getTemplate(id: number): Promise<Template> {
    const data = await this.request<any>(`/templates/${id}`);
    return templateSchema.parse(data);
  }

  async getSubmitter(id: number): Promise<Submitter> {
    const data = await this.request<any>(`/submitters/${id}`);
    return submitterSchema.parse(data);
  }

  async updateSubmitter(id: number, params: {
    email?: string;
    phone?: string;
    values?: Record<string, any>;
    metadata?: Record<string, any>;
  }): Promise<Submitter> {
    const data = await this.request<any>(`/submitters/${id}`, {
      method: 'PUT',
      body: JSON.stringify(params),
    });
    return submitterSchema.parse(data);
  }
}
