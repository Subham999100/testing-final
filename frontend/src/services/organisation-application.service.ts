// ============================================================
// Clyptus Job Portal - Organisation Application Service
// Connects frontend with Public and Platform Verification APIs
// ============================================================

import { apiClient } from './api';

export interface PublicPlan {
  id: string;
  name: string;
  code: string;
  description: string | null;
  tokenAmount: number;
  priceCents: number;
  currency: string;
  billingCycle: 'MONTHLY' | 'ANNUAL' | 'ONE_TIME';
  features: string[];
}

export interface CreateOrganisationApplicationPayload {
  name: string;
  slug: string;
  domain?: string;
  contactEmail: string;
  contactPhone?: string;
  industry?: string;
  companySize?: string;
  website?: string;
  address?: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerEmail: string;
  ownerPhone?: string;
  ownerDesignation?: string;
  selectedPlanId?: string;
  paymentMethod?: string;
  paymentReference?: string;
}

export interface ApplicationSubmissionResult {
  id: string;
  applicationNumber: number;
  status: string;
  continuationToken: string;
  message: string;
}

export interface ApplicationDocumentMetadata {
  id: string;
  type: 'REGISTRATION_CERTIFICATE' | 'TAX_ID' | 'AUTHORIZATION_LETTER' | 'PAYMENT_PROOF' | 'OTHER';
  fileName: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
}

export interface PublicApplicationStatusResult {
  id: string;
  applicationNumber: number;
  name: string;
  status: 'PENDING_REVIEW' | 'MORE_INFO_REQUESTED' | 'APPROVED' | 'REJECTED';
  paymentStatus: 'PENDING' | 'VERIFIED' | 'FAILED';
  rejectionReason: string | null;
  requestedInfoNotes: string | null;
  documentsCount: number;
  submittedAt: string;
  reviewedAt: string | null;
}

export interface PlatformApplicationItem {
  id: string;
  applicationNumber: number;
  name: string;
  slug: string;
  domain: string | null;
  contactEmail: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string | null;
  selectedPlan: {
    id: string;
    name: string;
    code: string;
    description?: string | null;
    tokenAmount: number;
    priceCents: number;
    currency: string;
    billingCycle?: string;
    features?: string[];
  } | null;

  paymentMethod: string | null;
  paymentReference: string | null;
  paymentStatus: 'PENDING' | 'VERIFIED' | 'FAILED';
  status: 'PENDING_REVIEW' | 'MORE_INFO_REQUESTED' | 'APPROVED' | 'REJECTED';
  documentsCount: number;
  submittedAt: string;
  reviewedAt: string | null;
  createdOrganisationId: string | null;
}

export interface ApplicationReviewHistoryItem {
  id: string;
  action: 'SUBMITTED' | 'INFO_REQUESTED' | 'INFO_SUBMITTED' | 'APPROVED' | 'REJECTED';
  actorRole: string;
  notes: string | null;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface PlatformApplicationDetail extends PlatformApplicationItem {
  contactPhone: string | null;
  industry: string | null;
  companySize: string | null;
  website: string | null;
  address: string | null;
  ownerFirstName: string;
  ownerLastName: string;
  ownerDesignation: string | null;
  rejectionReason: string | null;
  requestedInfoNotes: string | null;
  applicantResponseNotes: string | null;
  documents: ApplicationDocumentMetadata[];
  reviewHistory: ApplicationReviewHistoryItem[];
  organisation?: any;
  owner?: any;
  payment?: any;
  application?: any;
}


export const OrganisationApplicationService = {
  // ── Public APIs ─────────────────────────────────────────────
  async getPublicPlans(): Promise<PublicPlan[]> {
    const res: any = await apiClient.get('/public/plans');
    return Array.isArray(res) ? res : (res.data || []);
  },

  async submitApplication(payload: CreateOrganisationApplicationPayload): Promise<ApplicationSubmissionResult> {
    const res: any = await apiClient.post('/public/organisation-applications', payload);
    return res.data || res;
  },

  async uploadDocument(
    applicationId: string,
    continuationToken: string,
    file: File,
    type: string,
  ): Promise<ApplicationDocumentMetadata> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const res: any = await apiClient.post(
      `/public/organisation-applications/${applicationId}/documents`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${continuationToken}`,
          'x-continuation-token': continuationToken,
        },
      },
    );
    return res.data || res;
  },

  async getApplicationStatus(
    applicationId: string,
    continuationToken: string,
  ): Promise<PublicApplicationStatusResult> {
    const res: any = await apiClient.get(
      `/public/organisation-applications/${applicationId}/status`,
      {
        headers: {
          'x-continuation-token': continuationToken,
        },
      },
    );
    return res.data || res;
  },

  // ── Platform Admin Verification APIs ────────────────────────
  async getApplications(params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ data: PlatformApplicationItem[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    const res: any = await apiClient.get('/platform/organisation-applications', { params });
    const rawData = Array.isArray(res) ? res : (res.data || []);
    const mappedData = rawData.map((item: any) => ({
      ...item,
      id: item.id || item.applicationId,
      submittedAt: item.submittedAt || item.createdAt || '',
    }));
    const meta = res.meta || { total: mappedData.length, page: 1, limit: 20, totalPages: 1 };
    return { data: mappedData, meta };
  },

  async getApplicationById(id: string): Promise<PlatformApplicationDetail> {
    const res: any = await apiClient.get(`/platform/organisation-applications/${id}`);
    const data = res.data || res;

    const org = data.organisation || {};
    const owner = data.owner || {};
    const payment = data.payment || {};
    const appInfo = data.application || {};
    const plan = data.plan || data.selectedPlan || null;

    const ownerFirstName = owner.firstName || data.ownerFirstName || '';
    const ownerLastName = owner.lastName || data.ownerLastName || '';

    return {
      id: data.id,
      applicationNumber: data.applicationNumber,
      name: org.name || data.name || '',
      slug: org.slug || data.slug || '',
      domain: org.domain ?? data.domain ?? null,
      contactEmail: org.contactEmail || data.contactEmail || '',
      contactPhone: org.contactPhone ?? data.contactPhone ?? null,
      industry: org.industry ?? data.industry ?? null,
      companySize: org.companySize ?? data.companySize ?? null,
      website: org.website ?? data.website ?? null,
      address: org.address ?? data.address ?? null,
      ownerFirstName,
      ownerLastName,
      ownerName: (ownerFirstName || ownerLastName)
        ? `${ownerFirstName} ${ownerLastName}`.trim()
        : data.ownerName || '',
      ownerEmail: owner.email || data.ownerEmail || '',
      ownerPhone: owner.phone ?? data.ownerPhone ?? null,
      ownerDesignation: owner.designation ?? data.ownerDesignation ?? null,
      selectedPlan: plan ? {
        id: plan.id,
        name: plan.name,
        code: plan.code,
        description: plan.description || null,
        tokenAmount: plan.tokenAmount ?? 0,
        priceCents: plan.priceCents ?? 0,
        currency: plan.currency || 'USD',
        billingCycle: plan.billingCycle || 'MONTHLY',
        features: plan.features || [],
      } : null,
      paymentMethod: payment.method ?? data.paymentMethod ?? null,
      paymentReference: payment.reference ?? data.paymentReference ?? null,
      paymentStatus: payment.status || data.paymentStatus || 'PENDING',
      status: appInfo.status || data.status || 'PENDING_REVIEW',
      rejectionReason: appInfo.rejectionReason ?? data.rejectionReason ?? null,
      requestedInfoNotes: appInfo.requestedInfoNotes ?? data.requestedInfoNotes ?? null,
      applicantResponseNotes: appInfo.applicantResponseNotes ?? data.applicantResponseNotes ?? null,
      documentsCount: (data.documents || []).length,
      submittedAt: appInfo.createdAt || data.submittedAt || data.createdAt,
      reviewedAt: appInfo.reviewedAt ?? data.reviewedAt ?? null,
      createdOrganisationId: appInfo.createdOrganisationId ?? data.createdOrganisationId ?? null,
      documents: data.documents || [],
      reviewHistory: data.reviewHistory || [],
      organisation: data.organisation,
      owner: data.owner,
      payment: data.payment,
      application: data.application,
    };
  },

  async fetchDocumentBlob(
    applicationId: string,
    documentId: string,
  ): Promise<{ blob: Blob; contentType: string; filename: string }> {
    const response = await apiClient.get(
      `/platform/organisation-applications/${applicationId}/documents/${documentId}`,
      { responseType: 'blob' },
    );

    const contentType = (response as any).headers?.['content-type'] || 'application/octet-stream';
    const disposition = (response as any).headers?.['content-disposition'] || '';
    let filename = `document-${documentId}`;
    const filenameMatch = disposition.match(/filename="?([^";]+)"?/);
    if (filenameMatch?.[1]) {
      filename = filenameMatch[1];
    }

    const blob = (response as any).data || response;
    return { blob, contentType, filename };
  },

  async requestInformation(id: string, notes: string): Promise<any> {
    const res: any = await apiClient.post(`/platform/organisation-applications/${id}/request-information`, { notes });
    return res.data || res;
  },

  async rejectApplication(id: string, reason: string): Promise<any> {
    const res: any = await apiClient.post(`/platform/organisation-applications/${id}/reject`, { reason });
    return res.data || res;
  },

  async approveApplication(
    id: string,
    payload?: {
      name?: string;
      slug?: string;
      ownerEmail?: string;
      recruiterLimit?: number;
      initialTokens?: number;
    },
  ): Promise<any> {
    const res: any = await apiClient.post(`/platform/organisation-applications/${id}/approve`, payload || {});
    return res.data || res;
  },
};

