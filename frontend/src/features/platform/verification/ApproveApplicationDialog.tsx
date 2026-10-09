// ============================================================
// Clyptus Job Portal - Approve & Provision Application Dialog
// Review and configure organisation setup before atomic provisioning
// ============================================================

import React, { useState } from 'react';
import { CheckCircle, Loader2, X, AlertCircle, Shield, Building2, User, Key, CreditCard } from 'lucide-react';
import { OrganisationApplicationService } from '../../../services/organisation-application.service';

interface Props {
  applicationId: string;
  applicationNumber: number;
  organisationName: string;
  slug: string;
  ownerEmail: string;
  planName?: string;
  defaultRecruiterLimit?: number;
  defaultTokenAllocation?: number;
  onClose: () => void;
  onSuccess: (result: any) => void;
}

export const ApproveApplicationDialog: React.FC<Props> = ({
  applicationId,
  applicationNumber,
  organisationName,
  slug: initialSlug,
  ownerEmail: initialOwnerEmail,
  planName = 'Standard',
  defaultRecruiterLimit = 25,
  defaultTokenAllocation = 0,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState(organisationName);
  const [slug, setSlug] = useState(initialSlug);
  const [ownerEmail, setOwnerEmail] = useState(initialOwnerEmail);
  const [recruiterLimit, setRecruiterLimit] = useState<number>(defaultRecruiterLimit);
  const [initialTokens, setInitialTokens] = useState<number>(defaultTokenAllocation);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await OrganisationApplicationService.approveApplication(applicationId, {
        name: name.trim(),
        slug: slug.trim(),
        ownerEmail: ownerEmail.trim(),
        recruiterLimit: Number(recruiterLimit),
        initialTokens: Number(initialTokens),
      });
      onSuccess(result);
    } catch (err: any) {
      if (err?.status === 409) {
        setError('This application was updated by another administrator. Refresh to see the latest status.');
      } else {
        setError(err?.message || 'Failed to approve and provision organisation.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Approve and Provision Organisation"
      className="fixed inset-0 z-50 bg-overlay flex items-center justify-center p-4 backdrop-blur-xs"
    >
      <div className="bg-surface border border-line-strong rounded-xl w-full max-w-lg p-6 shadow-lg space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-success" />
            <h2 className="font-bold text-base text-ink">Approve & Provision Organisation</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-muted hover:text-ink hover:bg-soft"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-muted">
          Application #{applicationNumber} &middot; Plan: <strong className="text-ink">{planName}</strong>
        </p>

        {error && (
          <div role="alert" className="p-3 rounded-lg bg-danger-soft border border-danger text-danger text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleApprove} className="space-y-4 text-xs">
          {/* Organisation Provisioning Configuration */}
          <div className="border border-line rounded-lg p-3 bg-canvas/40 space-y-3">
            <div className="font-semibold text-ink flex items-center gap-1.5 pb-1 border-b border-line">
              <Building2 className="w-3.5 h-3.5 text-brand" /> Provisioning Configuration
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-muted block mb-1">Organisation Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-surface border border-line rounded text-ink focus:outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="text-muted block mb-1">URL Slug</label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-surface border border-line rounded font-mono text-ink focus:outline-none focus:border-brand"
                />
              </div>
            </div>

            <div>
              <label className="text-muted block mb-1">Organisation Super Admin Email</label>
              <input
                type="email"
                required
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-surface border border-line rounded font-mono text-ink focus:outline-none focus:border-brand"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-muted block mb-1">Recruiter User Limit</label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  required
                  value={recruiterLimit}
                  onChange={(e) => setRecruiterLimit(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-surface border border-line rounded font-mono text-ink focus:outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="text-muted block mb-1">Initial Token Allocation</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={initialTokens}
                  onChange={(e) => setInitialTokens(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-surface border border-line rounded font-mono text-ink focus:outline-none focus:border-brand"
                />
              </div>
            </div>
          </div>

          <div className="bg-canvas border border-line rounded-lg p-3 text-xs space-y-1.5">
            <div className="font-semibold text-ink flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-brand" /> Atomic Database Operations:
            </div>
            <ul className="text-muted space-y-1 pl-4 list-disc text-[11px]">
              <li>Create Organisation (<code className="font-mono">{slug}</code>) and tenant metadata.</li>
              <li>Initialize token balance (<strong className="text-ink">{initialTokens.toLocaleString()} tokens</strong>).</li>
              <li>Create Super Admin user (<strong className="text-ink">{ownerEmail}</strong>) with role <code className="font-mono">ORGANISATION_SUPER_ADMIN</code>.</li>
              <li>Enforce single-transaction atomic commit & safe concurrency check.</li>
            </ul>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-line">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="button button-secondary button-small"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="button button-primary button-small flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Provisioning Organisation...
                </>
              ) : (
                'Confirm Approval & Provision'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
