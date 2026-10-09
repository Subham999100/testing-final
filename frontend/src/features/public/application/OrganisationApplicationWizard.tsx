// ============================================================
// Clyptus Job Portal - Organisation Application Wizard
// Clean, professional, enterprise-grade multi-step application
// ============================================================

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  User,
  CreditCard,
  FileUp,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Check,
  AlertCircle,
  Upload,
  Trash2,
  FileText,
  Shield,
  HelpCircle,
} from 'lucide-react';
import {
  OrganisationApplicationService,
  PublicPlan,
  CreateOrganisationApplicationPayload,
  ApplicationSubmissionResult,
} from '../../../services/organisation-application.service';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG_REGEX = /^[a-z0-9-]+$/;

interface DocumentUploadItem {
  id: string;
  type: 'REGISTRATION_CERTIFICATE' | 'TAX_ID' | 'AUTHORIZATION_LETTER' | 'PAYMENT_PROOF' | 'OTHER';
  file: File;
  name: string;
  size: number;
  uploaded: boolean;
  uploading: boolean;
  error?: string;
}

const DOCUMENT_TYPES = [
  { value: 'REGISTRATION_CERTIFICATE', label: 'Certificate of Incorporation / Registration', required: true },
  { value: 'TAX_ID', label: 'Tax Identification Document (PAN / EIN / VAT)', required: true },
  { value: 'AUTHORIZATION_LETTER', label: 'Authorisation Letter / Power of Attorney', required: false },
  { value: 'PAYMENT_PROOF', label: 'Payment Proof (Wire receipt / Transfer screenshot)', required: false },
  { value: 'OTHER', label: 'Other Supporting Document', required: false },
] as const;

export const OrganisationApplicationWizard: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<ApplicationSubmissionResult | null>(null);

  // Form State
  const [formData, setFormData] = useState<CreateOrganisationApplicationPayload>({
    name: '',
    slug: '',
    domain: '',
    contactEmail: '',
    contactPhone: '',
    industry: 'Technology',
    companySize: '11-50',
    website: '',
    address: '',
    ownerFirstName: '',
    ownerLastName: '',
    ownerEmail: '',
    ownerPhone: '',
    ownerDesignation: 'Founder / Executive',
    selectedPlanId: '',
    paymentMethod: 'BANK_TRANSFER',
    paymentReference: '',
  });

  // Staged files for Step 4
  const [stagedFiles, setStagedFiles] = useState<DocumentUploadItem[]>([]);

  // Fetch Public Plans
  const {
    data: plans = [],
    isLoading: plansLoading,
    isError: plansError,
  } = useQuery<PublicPlan[]>({
    queryKey: ['public-plans'],
    queryFn: () => OrganisationApplicationService.getPublicPlans(),
  });

  // Auto-select first plan if available
  useEffect(() => {
    if (plans.length > 0 && !formData.selectedPlanId) {
      setFormData((prev) => ({ ...prev, selectedPlanId: plans[0].id }));
    }
  }, [plans, formData.selectedPlanId]);

  // Slug auto-generation helper
  const handleNameChange = (name: string) => {
    const autoSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    setFormData((prev) => ({
      ...prev,
      name,
      slug: prev.slug === '' || prev.slug === autoSlug.slice(0, -1) ? autoSlug : prev.slug,
    }));
  };

  // Step 1 Validation
  const validateStep1 = (): boolean => {
    if (!formData.name.trim()) {
      setError('Organisation name is required');
      return false;
    }
    if (!formData.slug.trim()) {
      setError('Organisation slug is required');
      return false;
    }
    if (!SLUG_REGEX.test(formData.slug.trim())) {
      setError('Slug must consist only of lowercase letters, numbers, and hyphens');
      return false;
    }
    if (!formData.contactEmail.trim() || !EMAIL_REGEX.test(formData.contactEmail.trim())) {
      setError('A valid corporate contact email is required');
      return false;
    }
    setError(null);
    return true;
  };

  // Step 2 Validation
  const validateStep2 = (): boolean => {
    if (!formData.ownerFirstName.trim()) {
      setError('Representative first name is required');
      return false;
    }
    if (!formData.ownerLastName.trim()) {
      setError('Representative last name is required');
      return false;
    }
    if (!formData.ownerEmail.trim() || !EMAIL_REGEX.test(formData.ownerEmail.trim())) {
      setError('A valid email address is required for the authorised representative');
      return false;
    }
    setError(null);
    return true;
  };

  // Step 3 Validation
  const validateStep3 = (): boolean => {
    if (!formData.selectedPlanId) {
      setError('Please select a token plan');
      return false;
    }
    setError(null);
    return true;
  };

  // Step 4 Validation (Documents can be uploaded now or later if requested)
  const validateStep4 = (): boolean => {
    setError(null);
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
    if (currentStep === 3 && !validateStep3()) return;
    if (currentStep === 4 && !validateStep4()) return;
    setError(null);
    setCurrentStep((prev) => Math.min(5, prev + 1) as any);
  };

  const handleBack = () => {
    setError(null);
    setCurrentStep((prev) => Math.max(1, prev - 1) as any);
  };

  // Handle Document Selection
  const handleAddFile = (type: DocumentUploadItem['type'], file: File) => {
    const validMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/webp',
    ];
    if (!validMimes.includes(file.type)) {
      setError('Unsupported file type. Please upload a PDF, DOC, DOCX, PNG, or JPG file.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError('File exceeds maximum allowed size of 15 MB.');
      return;
    }
    setError(null);

    const newItem: DocumentUploadItem = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type,
      file,
      name: file.name,
      size: file.size,
      uploaded: false,
      uploading: false,
    };
    setStagedFiles((prev) => [...prev, newItem]);
  };

  const handleRemoveFile = (id: string) => {
    setStagedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // Submit Application
  const handleSubmitApplication = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Submit Application record to receive applicationId and continuationToken
      const submission = await OrganisationApplicationService.submitApplication({
        ...formData,
        domain: formData.domain ? formData.domain.trim() : undefined,
        contactPhone: formData.contactPhone ? formData.contactPhone.trim() : undefined,
        website: formData.website ? formData.website.trim() : undefined,
        address: formData.address ? formData.address.trim() : undefined,
        ownerPhone: formData.ownerPhone ? formData.ownerPhone.trim() : undefined,
        ownerDesignation: formData.ownerDesignation ? formData.ownerDesignation.trim() : undefined,
        paymentReference: formData.paymentReference ? formData.paymentReference.trim() : undefined,
      });

      // 2. Upload Staged Documents sequentially using continuationToken
      for (const item of stagedFiles) {
        try {
          await OrganisationApplicationService.uploadDocument(
            submission.id,
            submission.continuationToken,
            item.file,
            item.type,
          );
        } catch (uploadErr: any) {
          console.error(`Failed to upload ${item.name}:`, uploadErr);
        }
      }

      setSubmissionResult(submission);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit organisation application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If already successfully submitted, show confirmation state
  if (submissionResult) {
    return (
      <div className="bg-surface border border-line rounded-xl p-8 max-w-2xl mx-auto shadow-sm text-center">
        <div className="w-12 h-12 rounded-full bg-success-soft text-success flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-ink mb-1">Application Submitted Successfully</h2>
        <p className="text-sm text-muted mb-6">
          Your organisation registration has been received and queued for Platform Administrator review.
        </p>

        <div className="bg-canvas border border-line rounded-lg p-5 text-left mb-6 space-y-3 text-sm">
          <div className="flex justify-between items-center pb-2 border-b border-line">
            <span className="text-muted">Application Number</span>
            <span className="font-mono font-semibold text-ink text-base">#{submissionResult.applicationNumber}</span>
          </div>
          <div className="flex justify-between items-center pb-2 border-b border-line">
            <span className="text-muted">Organisation</span>
            <span className="font-medium text-ink">{formData.name}</span>
          </div>
          <div className="flex justify-between items-center pb-2 border-b border-line">
            <span className="text-muted">Authorised Representative</span>
            <span className="font-medium text-ink">
              {formData.ownerFirstName} {formData.ownerLastName} ({formData.ownerEmail})
            </span>
          </div>
          <div className="flex justify-between items-center pb-2 border-b border-line">
            <span className="text-muted">Verification Status</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-warning-soft text-warning">
              PENDING REVIEW
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted">Continuation Access</span>
            <span className="text-xs text-muted font-mono truncate max-w-xs">Secure session stored</span>
          </div>
        </div>

        <div className="bg-soft border border-line rounded-lg p-4 text-xs text-muted text-left mb-6 space-y-1">
          <div className="font-semibold text-ink flex items-center gap-1.5 mb-1">
            <Shield className="w-4 h-4 text-brand" /> What happens next?
          </div>
          <p>
            1. Platform Administrators verify submitted legal and registration documentation.
          </p>
          <p>
            2. Payment proof is reviewed against bank settlement records.
          </p>
          <p>
            3. Upon approval, your organisation is atomically provisioned and initial login credentials are sent to{' '}
            <strong className="text-ink">{formData.ownerEmail}</strong>.
          </p>
        </div>

        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="button button-secondary button-small"
          >
            Submit Another Application
          </button>
          <a href="/platform/login" className="button button-primary button-small">
            Go to Platform Portal
          </a>
        </div>
      </div>
    );
  }

  const selectedPlan = plans.find((p) => p.id === formData.selectedPlanId);

  return (
    <div className="bg-surface border border-line rounded-xl shadow-sm max-w-3xl mx-auto overflow-hidden">
      {/* Wizard Header & Progress */}
      <div className="border-b border-line p-5 bg-canvas/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-ink">Register Your Organisation</h1>
            <p className="text-xs text-muted">Complete the multi-step verification process to join Clyptus.</p>
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-soft text-muted border border-line">
            Step {currentStep} of 5
          </span>
        </div>

        {/* Step Indicator Tabs */}
        <div className="grid grid-cols-5 gap-1 text-xs">
          {[
            { step: 1, label: 'Organisation' },
            { step: 2, label: 'Representative' },
            { step: 3, label: 'Plan & Payment' },
            { step: 4, label: 'Documents' },
            { step: 5, label: 'Review & Submit' },
          ].map((item) => (
            <div
              key={item.step}
              className={`flex items-center gap-1.5 py-1.5 px-2 rounded font-medium transition-colors ${
                currentStep === item.step
                  ? 'bg-ink text-surface'
                  : currentStep > item.step
                    ? 'text-ink bg-soft'
                    : 'text-muted'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  currentStep > item.step
                    ? 'bg-success text-surface'
                    : currentStep === item.step
                      ? 'bg-brand text-surface'
                      : 'bg-line text-muted'
                }`}
              >
                {currentStep > item.step ? '✓' : item.step}
              </span>
              <span className="truncate hidden sm:inline">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Inline Error Banner */}
      {error && (
        <div role="alert" className="mx-6 mt-4 p-3 rounded-lg bg-danger-soft border border-danger text-danger text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step Content */}
      <div className="p-6">
        {/* STEP 1: ORGANISATION DETAILS */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-ink uppercase tracking-wide flex items-center gap-2">
              <Building2 className="w-4 h-4 text-brand" /> Organisation Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  Legal Entity Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Acme Corporation Ltd."
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="field-input w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  URL Slug <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  placeholder="acme-corp"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().trim() })}
                  className="field-input w-full font-mono text-xs"
                />
                <p className="text-[11px] text-muted mt-0.5">Used for workspace URL: clyptus.io/org/{formData.slug || '...'}</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  Corporate Contact Email <span className="text-danger">*</span>
                </label>
                <input
                  type="email"
                  placeholder="admin@acme.com"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  className="field-input w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">Primary Domain (Optional)</label>
                <input
                  type="text"
                  placeholder="acme.com"
                  value={formData.domain}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                  className="field-input w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">Contact Phone</label>
                <input
                  type="tel"
                  placeholder="+1 (555) 012-3456"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  className="field-input w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">Industry</label>
                <select
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  className="field-input w-full"
                >
                  <option value="Technology">Technology & Software</option>
                  <option value="Healthcare">Healthcare & Life Sciences</option>
                  <option value="Finance">Financial Services & Fintech</option>
                  <option value="Manufacturing">Manufacturing & Engineering</option>
                  <option value="Retail">Retail & E-Commerce</option>
                  <option value="Education">Education & EdTech</option>
                  <option value="Consulting">Consulting & Professional Services</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">Company Size</label>
                <select
                  value={formData.companySize}
                  onChange={(e) => setFormData({ ...formData, companySize: e.target.value })}
                  className="field-input w-full"
                >
                  <option value="1-10">1-10 employees</option>
                  <option value="11-50">11-50 employees</option>
                  <option value="51-200">51-200 employees</option>
                  <option value="201-500">201-500 employees</option>
                  <option value="500+">500+ employees</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">Official Website</label>
                <input
                  type="url"
                  placeholder="https://www.acme.com"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="field-input w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink mb-1">Registered Business Address</label>
              <textarea
                rows={2}
                placeholder="Suite 500, 100 Enterprise Way, San Francisco, CA 94107"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="field-input w-full"
              />
            </div>
          </div>
        )}

        {/* STEP 2: AUTHORISED REPRESENTATIVE */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-ink uppercase tracking-wide flex items-center gap-2">
              <User className="w-4 h-4 text-brand" /> Authorised Representative
            </h2>
            <p className="text-xs text-muted">
              This representative will become the primary Organisation Super Admin upon approval and will hold root administrative control.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  First Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Jane"
                  value={formData.ownerFirstName}
                  onChange={(e) => setFormData({ ...formData, ownerFirstName: e.target.value })}
                  className="field-input w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  Last Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Doe"
                  value={formData.ownerLastName}
                  onChange={(e) => setFormData({ ...formData, ownerLastName: e.target.value })}
                  className="field-input w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">
                  Official Email Address <span className="text-danger">*</span>
                </label>
                <input
                  type="email"
                  placeholder="jane.doe@acme.com"
                  value={formData.ownerEmail}
                  onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                  className="field-input w-full"
                />
                <p className="text-[11px] text-muted mt-0.5">Credentials and onboarding links will be delivered here.</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink mb-1">Direct Phone Number</label>
                <input
                  type="tel"
                  placeholder="+1 (555) 987-6543"
                  value={formData.ownerPhone}
                  onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                  className="field-input w-full"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-ink mb-1">Job Title / Designation</label>
                <input
                  type="text"
                  placeholder="Head of Talent Acquisition / Chief People Officer"
                  value={formData.ownerDesignation}
                  onChange={(e) => setFormData({ ...formData, ownerDesignation: e.target.value })}
                  className="field-input w-full"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: PLAN SELECTION & PAYMENT */}
        {currentStep === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-sm font-semibold text-ink uppercase tracking-wide flex items-center gap-2 mb-1">
                <CreditCard className="w-4 h-4 text-brand" /> Plan Selection & Payment
              </h2>
              <p className="text-xs text-muted">
                Select an initial token capacity. Active token plans are fetched authoritatively from the platform ledger.
              </p>
            </div>

            {plansLoading ? (
              <div className="p-8 text-center text-muted text-sm flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-brand" /> Loading available plans...
              </div>
            ) : plansError || plans.length === 0 ? (
              <div className="p-4 rounded-lg bg-danger-soft border border-danger text-danger text-xs">
                Unable to load official token plans. Please refresh or contact platform operations.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {plans.map((plan) => {
                  const isSelected = formData.selectedPlanId === plan.id;
                  return (
                    <div
                      key={plan.id}
                      onClick={() => setFormData({ ...formData, selectedPlanId: plan.id })}
                      className={`border rounded-xl p-4 cursor-pointer transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-ink bg-surface shadow-sm ring-1 ring-ink'
                          : 'border-line bg-canvas hover:border-line-strong'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-sm text-ink">{plan.name}</span>
                          {isSelected && (
                            <span className="w-4 h-4 rounded-full bg-ink text-surface flex items-center justify-center text-[10px]">
                              ✓
                            </span>
                          )}
                        </div>
                        <div className="text-lg font-bold text-ink mb-1">
                          ${(plan.priceCents / 100).toFixed(0)}{' '}
                          <span className="text-xs font-normal text-muted">
                            / {plan.billingCycle.toLowerCase()}
                          </span>
                        </div>
                        <div className="inline-block px-2 py-0.5 rounded bg-brand-soft text-brand text-xs font-mono font-medium mb-3">
                          {plan.tokenAmount.toLocaleString()} tokens
                        </div>
                        {plan.description && <p className="text-xs text-muted mb-3">{plan.description}</p>}

                        {plan.features && Array.isArray(plan.features) && plan.features.length > 0 && (
                          <ul className="text-xs text-muted space-y-1 pt-2 border-t border-line">
                            {plan.features.slice(0, 3).map((feat, idx) => (
                              <li key={idx} className="flex items-center gap-1.5">
                                <span className="text-success text-[10px]">✓</span> {feat}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-line">
                        <button
                          type="button"
                          className={`w-full py-1.5 text-xs font-medium rounded ${
                            isSelected
                              ? 'bg-ink text-surface'
                              : 'bg-surface border border-line text-ink hover:bg-canvas'
                          }`}
                        >
                          {isSelected ? 'Selected' : 'Select Plan'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Payment Information */}
            <div className="pt-4 border-t border-line space-y-3">
              <h3 className="text-xs font-bold uppercase text-ink tracking-wide">Payment Details</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">Payment Method</label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="field-input w-full"
                  >
                    <option value="BANK_TRANSFER">Bank Wire / Wire Transfer (Invoice)</option>
                    <option value="ACH">ACH Direct Debit</option>
                    <option value="CORPORATE_CARD">Corporate Card</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink mb-1">
                    Wire / Transaction Reference (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UTR-982347102 or Order #PO-881"
                    value={formData.paymentReference}
                    onChange={(e) => setFormData({ ...formData, paymentReference: e.target.value })}
                    className="field-input w-full font-mono text-xs"
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-soft border border-line text-xs text-muted flex items-start gap-2">
                <HelpCircle className="w-4 h-4 shrink-0 mt-0.5 text-muted" />
                <span>
                  <strong>Payment Verification Notice:</strong> Submitted payment details or receipts are verified manually by Platform Operations prior to paid token allocation.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: DOCUMENT UPLOAD */}
        {currentStep === 4 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-sm font-semibold text-ink uppercase tracking-wide flex items-center gap-2 mb-1">
                <FileUp className="w-4 h-4 text-brand" /> Required Organisation Documents
              </h2>
              <p className="text-xs text-muted">
                Please attach official verification documents. Accepted formats: PDF, DOC, DOCX, PNG, JPG (up to 15 MB each).
              </p>
            </div>

            {/* Document Upload Slots */}
            <div className="space-y-3">
              {DOCUMENT_TYPES.map((docType) => {
                const attached = stagedFiles.filter((f) => f.type === docType.value);
                return (
                  <div key={docType.value} className="border border-line rounded-lg p-3 bg-canvas/40">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div>
                        <div className="text-xs font-bold text-ink flex items-center gap-1.5">
                          {docType.label}
                          {docType.required ? (
                            <span className="text-danger text-[10px] uppercase font-mono">* Required</span>
                          ) : (
                            <span className="text-muted text-[10px] font-normal">(Optional)</span>
                          )}
                        </div>
                      </div>

                      <label className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-surface border border-line hover:border-line-strong text-ink font-medium transition-colors">
                        <Upload className="w-3.5 h-3.5 text-muted" />
                        <span>Choose File</span>
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleAddFile(docType.value, file);
                            e.target.value = '';
                          }}
                        />
                      </label>
                    </div>

                    {attached.length > 0 ? (
                      <div className="space-y-1.5 pt-1 border-t border-line/60">
                        {attached.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between text-xs bg-surface p-2 rounded border border-line"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <FileText className="w-3.5 h-3.5 text-muted shrink-0" />
                              <span className="truncate font-medium text-ink">{item.name}</span>
                              <span className="text-muted font-mono text-[11px]">
                                ({(item.size / 1024).toFixed(0)} KB)
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveFile(item.id)}
                              className="text-muted hover:text-danger p-1"
                              title="Remove file"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted italic">No file attached yet.</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 5: REVIEW & SUBMIT */}
        {currentStep === 5 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-ink uppercase tracking-wide flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-brand" /> Review & Confirm Application
            </h2>
            <p className="text-xs text-muted">
              Please inspect the details below before submitting. Authoritative provisioning takes place upon Platform Admin approval.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="border border-line rounded-lg p-3 bg-canvas/30 space-y-1.5">
                <div className="font-bold text-ink uppercase text-[11px] pb-1 border-b border-line">
                  Organisation Details
                </div>
                <div><span className="text-muted">Name:</span> <strong className="text-ink">{formData.name}</strong></div>
                <div><span className="text-muted">Slug:</span> <code className="font-mono">{formData.slug}</code></div>
                <div><span className="text-muted">Contact Email:</span> {formData.contactEmail}</div>
                <div><span className="text-muted">Domain:</span> {formData.domain || '—'}</div>
                <div><span className="text-muted">Industry:</span> {formData.industry} ({formData.companySize})</div>
              </div>

              <div className="border border-line rounded-lg p-3 bg-canvas/30 space-y-1.5">
                <div className="font-bold text-ink uppercase text-[11px] pb-1 border-b border-line">
                  Authorised Representative
                </div>
                <div><span className="text-muted">Name:</span> <strong className="text-ink">{formData.ownerFirstName} {formData.ownerLastName}</strong></div>
                <div><span className="text-muted">Email:</span> {formData.ownerEmail}</div>
                <div><span className="text-muted">Title:</span> {formData.ownerDesignation || '—'}</div>
                <div><span className="text-muted">Phone:</span> {formData.ownerPhone || '—'}</div>
              </div>

              <div className="border border-line rounded-lg p-3 bg-canvas/30 space-y-1.5">
                <div className="font-bold text-ink uppercase text-[11px] pb-1 border-b border-line">
                  Plan & Billing
                </div>
                <div><span className="text-muted">Plan:</span> <strong className="text-ink">{selectedPlan?.name || 'Standard'}</strong></div>
                <div><span className="text-muted">Tokens:</span> {selectedPlan?.tokenAmount.toLocaleString()} tokens</div>
                <div><span className="text-muted">Method:</span> {formData.paymentMethod}</div>
                <div><span className="text-muted">Reference:</span> {formData.paymentReference || '—'}</div>
              </div>

              <div className="border border-line rounded-lg p-3 bg-canvas/30 space-y-1.5">
                <div className="font-bold text-ink uppercase text-[11px] pb-1 border-b border-line">
                  Documents Attached ({stagedFiles.length})
                </div>
                {stagedFiles.length > 0 ? (
                  <ul className="space-y-1">
                    {stagedFiles.map((f) => (
                      <li key={f.id} className="truncate text-muted flex items-center gap-1">
                        <span>•</span> <span className="font-medium text-ink">{f.name}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-danger">No documents attached.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Wizard Footer Controls */}
      <div className="border-t border-line p-4 bg-canvas/50 flex items-center justify-between">
        {currentStep > 1 ? (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleBack}
            className="button button-secondary button-small flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
        ) : (
          <div />
        )}

        {currentStep < 5 ? (
          <button
            type="button"
            onClick={handleNext}
            className="button button-primary button-small flex items-center gap-1.5"
          >
            Continue <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmitApplication}
            className="button button-primary button-small flex items-center gap-1.5"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting Application...
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" /> Submit Application
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
