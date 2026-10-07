// ============================================================
// Clyptus Job Portal - Approve & Provision Application Dialog
// Explains atomic provisioning and handles concurrency protection
// ============================================================

import React, { useState } from 'react';
import { CheckCircle, Loader2, X, AlertCircle, Shield, Building2 } from 'lucide-react';
import { OrganisationApplicationService } from '../../../services/organisation-application.service';

interface Props {
  applicationId: string;
  applicationNumber: number;
  organisationName: string;
  slug: string;
  ownerEmail: string;
  planName?: string;
  onClose: () => void;
  onSuccess: (result: any) => void;
}

export const ApproveApplicationDialog: React.FC<Props> = ({
  applicationId,
  applicationNumber,
  organisationName,
  slug,
  ownerEmail,
  planName = 'Standard',
  onClose,
  onSuccess,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await OrganisationApplicationService.approveApplication(applicationId);
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
      <div className="bg-surface border border-line-strong rounded-xl w-full max-w-lg p-6 shadow-lg">
        <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
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

        <p className="text-xs text-muted mb-4">
          App #{applicationNumber} &middot; <strong className="text-ink">{organisationName}</strong>
        </p>

        {error && (
          <div role="alert" className="p-3 mb-4 rounded-lg bg-danger-soft border border-danger text-danger text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="bg-canvas border border-line rounded-lg p-4 text-xs space-y-2 mb-4">
          <div className="font-semibold text-ink flex items-center gap-1.5 mb-1">
            <Shield className="w-4 h-4 text-brand" /> Atomic Operations to be Executed:
          </div>
          <ul className="text-muted space-y-1 pl-4 list-disc">
            <li>Create official <strong>Organisation</strong> record (<code className="font-mono">{slug}</code>).</li>
            <li>Initialize ledger token balance for plan: <strong>{planName}</strong>.</li>
            <li>Create <strong>Organisation Super Admin</strong> account for <strong className="text-ink">{ownerEmail}</strong>.</li>
            <li>Set up role permissions and link created organisation to this application permanently.</li>
          </ul>
        </div>

        <p className="text-xs text-muted mb-6">
          This operation is atomic and irreversible. If any database constraint fails, all records roll back cleanly.
        </p>

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
            type="button"
            disabled={isSubmitting}
            onClick={handleApprove}
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
      </div>
    </div>
  );
};
