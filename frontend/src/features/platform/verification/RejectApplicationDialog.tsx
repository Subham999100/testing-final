// ============================================================
// Clyptus Job Portal - Reject Application Dialog
// ============================================================

import React, { useState } from 'react';
import { XCircle, Loader2, X, AlertCircle } from 'lucide-react';
import { OrganisationApplicationService } from '../../../services/organisation-application.service';

interface Props {
  applicationId: string;
  applicationNumber: number;
  organisationName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const RejectApplicationDialog: React.FC<Props> = ({
  applicationId,
  applicationNumber,
  organisationName,
  onClose,
  onSuccess,
}) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 5) {
      setError('Please provide a specific rejection reason (at least 5 characters).');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await OrganisationApplicationService.rejectApplication(applicationId, reason.trim());
      onSuccess();
    } catch (err: any) {
      if (err?.status === 409) {
        setError('This application was updated by another administrator. Refresh to see the latest status.');
      } else {
        setError(err?.message || 'Failed to reject organisation application.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Reject Organisation Application"
      className="fixed inset-0 z-50 bg-overlay flex items-center justify-center p-4 backdrop-blur-xs"
    >
      <div className="bg-surface border border-line-strong rounded-xl w-full max-w-lg p-6 shadow-lg">
        <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-danger" />
            <h2 className="font-bold text-base text-ink">Reject Organisation Application</h2>
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink mb-1.5">
              Reason for Rejection <span className="text-danger">*</span>
            </label>
            <textarea
              rows={4}
              placeholder="e.g. Ineligible business type, fraudulent credentials, or failed verification criteria."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="field-input w-full text-xs"
              required
            />
            <p className="text-[11px] text-muted mt-1">
              Rejection is permanent. The organisation cannot be provisioned from this application.
            </p>
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
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-danger text-surface hover:bg-danger/90 transition-colors flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Rejecting...
                </>
              ) : (
                'Confirm Rejection'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
