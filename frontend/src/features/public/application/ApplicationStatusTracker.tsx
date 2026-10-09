// ============================================================
// Clyptus Job Portal - Application Status Tracker
// Allows applicants to check review status using their credentials
// ============================================================

import React, { useState } from 'react';
import {
  Search,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Shield,
  ArrowRight,
} from 'lucide-react';
import {
  OrganisationApplicationService,
  PublicApplicationStatusResult,
} from '../../../services/organisation-application.service';

export const ApplicationStatusTracker: React.FC = () => {
  const [applicationId, setApplicationId] = useState('');
  const [continuationToken, setContinuationToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusResult, setStatusResult] = useState<PublicApplicationStatusResult | null>(null);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicationId.trim() || !continuationToken.trim()) {
      setError('Both Application ID and Continuation Token are required to look up status.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await OrganisationApplicationService.getApplicationStatus(
        applicationId.trim(),
        continuationToken.trim(),
      );
      setStatusResult(result);
    } catch (err: any) {
      setError(err?.message || 'Unable to retrieve application status. Please check your token.');
      setStatusResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: PublicApplicationStatusResult['status']) => {
    switch (status) {
      case 'PENDING_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-warning-soft text-warning">
            <Clock className="w-3.5 h-3.5" /> Pending Review
          </span>
        );
      case 'MORE_INFO_REQUESTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-warning-soft text-warning">
            <AlertTriangle className="w-3.5 h-3.5" /> More Information Requested
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-success-soft text-success">
            <CheckCircle className="w-3.5 h-3.5" /> Approved & Provisioned
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-danger-soft text-danger">
            <XCircle className="w-3.5 h-3.5" /> Application Rejected
          </span>
        );
    }
  };

  return (
    <div className="bg-surface border border-line rounded-xl p-6 shadow-sm max-w-2xl mx-auto">
      <h2 className="text-base font-bold text-ink mb-1">Check Application Status</h2>
      <p className="text-xs text-muted mb-4">
        Enter the Application ID and secure continuation token provided during registration.
      </p>

      <form onSubmit={handleLookup} className="space-y-3 mb-6">
        <div>
          <label className="block text-xs font-medium text-ink mb-1">Application ID (UUID)</label>
          <input
            type="text"
            placeholder="e.g. 3fa85f64-5717-4562-b3fc-2c963f66afa6"
            value={applicationId}
            onChange={(e) => setApplicationId(e.target.value)}
            className="field-input w-full font-mono text-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-ink mb-1">Continuation Token</label>
          <input
            type="password"
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            value={continuationToken}
            onChange={(e) => setContinuationToken(e.target.value)}
            className="field-input w-full font-mono text-xs"
          />
        </div>

        {error && (
          <div role="alert" className="p-3 rounded-lg bg-danger-soft border border-danger text-danger text-xs">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="button button-primary button-small w-full flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Looking up...
            </>
          ) : (
            <>
              <Search className="w-4 h-4" /> Check Status
            </>
          )}
        </button>
      </form>

      {statusResult && (
        <div className="border border-line rounded-lg p-5 bg-canvas/50 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <div>
              <span className="text-xs text-muted">Application</span>
              <div className="text-base font-bold text-ink font-mono">#{statusResult.applicationNumber}</div>
            </div>
            <div>{getStatusBadge(statusResult.status)}</div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-muted block">Organisation</span>
              <strong className="text-ink">{statusResult.name}</strong>
            </div>
            <div>
              <span className="text-muted block">Documents Verified</span>
              <span className="text-ink">{statusResult.documentsCount} documents uploaded</span>
            </div>
            <div>
              <span className="text-muted block">Submitted Date</span>
              <span className="text-ink">{new Date(statusResult.submittedAt).toLocaleDateString()}</span>
            </div>
            <div>
              <span className="text-muted block">Payment Verification</span>
              <span className="text-ink font-medium">{statusResult.paymentStatus}</span>
            </div>
          </div>

          {statusResult.status === 'MORE_INFO_REQUESTED' && statusResult.requestedInfoNotes && (
            <div className="p-3 bg-warning-soft border border-warning rounded-lg text-xs space-y-1">
              <span className="font-bold text-ink">Action Required:</span>
              <p className="text-muted">{statusResult.requestedInfoNotes}</p>
            </div>
          )}

          {statusResult.status === 'REJECTED' && statusResult.rejectionReason && (
            <div className="p-3 bg-danger-soft border border-danger rounded-lg text-xs space-y-1">
              <span className="font-bold text-danger">Rejection Reason:</span>
              <p className="text-danger">{statusResult.rejectionReason}</p>
            </div>
          )}

          {statusResult.status === 'APPROVED' && (
            <div className="p-3 bg-success-soft border border-success rounded-lg text-xs space-y-1">
              <span className="font-bold text-success">Organisation Approved!</span>
              <p className="text-muted">
                Your workspace is active. The primary Organisation Super Admin can log in at the organisation portal.
              </p>
              <div className="pt-2">
                <a href="/org/login" className="button button-primary button-small inline-flex items-center gap-1">
                  Go to Organisation Portal <ArrowRight className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
