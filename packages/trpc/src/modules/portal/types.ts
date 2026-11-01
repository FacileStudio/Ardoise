import { z } from 'zod';

export const PortalDocumentsInputSchema = z
  .object({ missionId: z.string().optional(), type: z.string().optional() })
  .optional();

export const PortalDocumentIdSchema = z.object({ id: z.string().min(1) });

export type PortalDocumentsInput = z.infer<typeof PortalDocumentsInputSchema>;

export type SignatureStatus = 'none' | 'sent' | 'signed' | 'declined';

export type ActionRequired =
  | {
      kind: 'pay';
      paymentId: string;
      description: string;
      amount: number;
      dueDate: string;
      overdue: boolean;
    }
  | { kind: 'sign'; documentId: string; name: string; missionName: string | null };

export interface PortalMission {
  id: string;
  name: string;
  status: string;
  description: string | null;
  price: number;
  paid: number;
  due: number;
  nextDueDate: string | null;
  documentCount: number;
  pendingSignatureCount: number;
}

export interface PortalOverview {
  client: {
    id: string;
    companyName: string;
    contactFirstName: string;
    contactLastName: string;
  };
  totals: { billed: number; paid: number; due: number; overdue: number; currency: 'EUR' };
  missions: PortalMission[];
  actionRequired: ActionRequired[];
}

export interface PortalDocument {
  id: string;
  name: string;
  type: string;
  typeLabelKey: string;
  missionId: string | null;
  missionName: string | null;
  number: string | null;
  issuedAt: string;
  total: number | null;
  signatureStatus: SignatureStatus;
  signedAt: string | null;
  canDownload: boolean;
  source: 'generated' | 'imported';
}
