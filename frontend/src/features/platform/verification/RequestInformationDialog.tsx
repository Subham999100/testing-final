// ============================================================
// Clyptus Job Portal - Request Information Dialog
// ============================================================

import React, { useState } from 'react';
import { HelpCircle, Loader2, X, AlertCircle } from 'lucide-react';
import { OrganisationApplicationService } from '../../../services/organisation-application.service';

interface Props {
  applicationId: string;
  applicationNumber: number;
  organisationName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const RequestInformationDialog: React.FC<Props> = ({
  applicationId,
  applicationNumber,
  organisationName,
  onClose,
  onSuccess,
}) => {
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim() || notes.trim().length < 5) {
      setError('Please provide detailed instructions for the applicant (at least 5 characters).');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await OrganisationApplicationService.requestInformation(applicationId, notes.trim());
      onSuccess();
    } catch (err: any) {
      if (err?.status === 409) {
        setError('This application was updated by another administrator. Refresh to see the latest status.');
      } else {
        setError(err?.message || 'Failed to request additional information.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Request More Information"
      className="fixed inset-0 z-50 bg-overlay flex items-center justify-center p-4 backdrop-blur-xs"
    >
      <div className="bg-surface border border-line-strong rounded-xl w-full max-w-lg p-6 shadow-lg">
        <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-warning" />
            <h2 className="font-bold text-base text-ink">Request More Information</h2>
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
              Information Requested from Applicant <span className="text-danger">*</span>
            </label>
            <textarea
              rows={4}
              placeholder="e.g. Please provide an updated Certificate of Incorporation with clear seal, or clarify company tax registration number."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="field-input w-full text-xs"
              required
            />
            <p className="text-[11px] text-muted mt-1">
              This notice will be recorded in the application history and made visible to the applicant.
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
              className="button button-primary button-small flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting Request...
                </>
              ) : (
                'Send Request'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
