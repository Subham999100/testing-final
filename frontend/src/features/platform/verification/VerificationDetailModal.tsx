// ============================================================
// Clyptus Job Portal - Verification Detail Modal
// Full inspection of application metadata, documents, and review history
// ============================================================

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  X,
  Building2,
  User,
  CreditCard,
  FileText,
  History,
  Shield,
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  Check,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import {
  OrganisationApplicationService,
  PlatformApplicationDetail,
} from '../../../services/organisation-application.service';
import { DocumentPreviewModal } from './DocumentPreviewModal';
import { RequestInformationDialog } from './RequestInformationDialog';
import { RejectApplicationDialog } from './RejectApplicationDialog';
import { ApproveApplicationDialog } from './ApproveApplicationDialog';

interface Props {
  applicationId: string;
  onClose: () => void;
  onRefreshQueue: () => void;
}

export const VerificationDetailModal: React.FC<Props> = ({
  applicationId,
  onClose,
  onRefreshQueue,
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'documents' | 'history'>('details');

  // Dialog states
  const [previewDoc, setPreviewDoc] = useState<{ id: string; name: string; mime: string } | null>(null);
  const [showRequestInfo, setShowRequestInfo] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [showApprove, setShowApprove] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const {
    data: app,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<PlatformApplicationDetail>({
    queryKey: ['platform-application', applicationId],
    queryFn: () => OrganisationApplicationService.getApplicationById(applicationId),
  });

  const getStatusBadge = (status: PlatformApplicationDetail['status']) => {
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
            <XCircle className="w-3.5 h-3.5" /> Rejected
          </span>
        );
    }
  };

  const handleActionComplete = (msg: string) => {
    setActionSuccessMessage(msg);
    setShowRequestInfo(false);
    setShowReject(false);
    setShowApprove(false);
    void refetch();
    onRefreshQueue();
  };

  const isReviewable =
    app && (app.status === 'PENDING_REVIEW' || app.status === 'MORE_INFO_REQUESTED');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Application Inspection"
      className="fixed inset-0 z-50 bg-overlay flex items-center justify-center p-4 backdrop-blur-xs"
    >
      <div className="bg-surface border border-line-strong rounded-xl w-full max-w-4xl h-[90vh] flex flex-col shadow-xl overflow-hidden">
        {/* Header */}
        <div className="p-4 px-6 border-b border-line bg-canvas/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base text-ink">{app?.name || 'Loading Application...'}</h2>
                {app && <span className="font-mono text-xs text-muted">#{app.applicationNumber}</span>}
                {app && getStatusBadge(app.status)}
              </div>
              {app && (
                <p className="text-xs text-muted mt-0.5">
                  Submitted {app.submittedAt && !isNaN(new Date(app.submittedAt).getTime()) ? new Date(app.submittedAt).toLocaleString() : '—'} &middot; Slug:{' '}
                  <code className="font-mono">{app.slug}</code>
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-muted hover:text-ink hover:bg-soft"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Success Alert */}
        {actionSuccessMessage && (
          <div className="mx-6 mt-3 p-3 rounded-lg bg-success-soft border border-success text-success text-xs flex items-center justify-between">
            <span>{actionSuccessMessage}</span>
            <button
              type="button"
              onClick={() => setActionSuccessMessage(null)}
              className="text-success hover:underline font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-line px-6 bg-surface text-xs font-medium gap-6">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'details'
                ? 'border-brand text-brand font-semibold'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" /> Details & Billing
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('documents')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'documents'
                ? 'border-brand text-brand font-semibold'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Documents ({app?.documents?.length || 0})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-brand text-brand font-semibold'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            <History className="w-3.5 h-3.5" /> Review Timeline ({app?.reviewHistory?.length || 0})
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center text-muted text-xs gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-brand" />
              <span>Fetching application details from database...</span>
            </div>
          ) : isError || !app ? (
            <div className="p-4 rounded-lg bg-danger-soft border border-danger text-danger text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{(error as any)?.message || 'Failed to load application details.'}</span>
            </div>
          ) : (
            <>
              {/* TAB 1: DETAILS & BILLING */}
              {activeTab === 'details' && (
                <div className="space-y-5 text-xs">
                  {/* Notes / Reason Notice */}
                  {app.status === 'MORE_INFO_REQUESTED' && app.requestedInfoNotes && (
                    <div className="p-3.5 rounded-lg bg-warning-soft border border-warning space-y-1">
                      <strong className="text-ink flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-warning" /> More Information Requested:
                      </strong>
                      <p className="text-muted">{app.requestedInfoNotes}</p>
                    </div>
                  )}

                  {app.status === 'REJECTED' && app.rejectionReason && (
                    <div className="p-3.5 rounded-lg bg-danger-soft border border-danger space-y-1">
                      <strong className="text-danger flex items-center gap-1.5">
                        <XCircle className="w-3.5 h-3.5" /> Rejection Reason:
                      </strong>
                      <p className="text-danger">{app.rejectionReason}</p>
                    </div>
                  )}

                  {app.createdOrganisationId && (
                    <div className="p-3.5 rounded-lg bg-success-soft border border-success space-y-1">
                      <strong className="text-success flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5" /> Organisation Provisioned:
                      </strong>
                      <p className="text-muted">
                        Linked Organisation ID: <code className="font-mono text-ink">{app.createdOrganisationId}</code>
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Organisation Section */}
                    <div className="border border-line rounded-lg p-4 bg-canvas/40 space-y-2">
                      <h3 className="font-bold text-ink uppercase text-[11px] pb-1.5 border-b border-line flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-brand" /> Organisation Information
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        <div><span className="text-muted block">Legal Entity</span><strong className="text-ink">{app.name}</strong></div>
                        <div><span className="text-muted block">Slug</span><code className="font-mono">{app.slug}</code></div>
                        <div><span className="text-muted block">Corporate Email</span><span>{app.contactEmail}</span></div>
                        <div><span className="text-muted block">Contact Phone</span><span>{app.contactPhone || '—'}</span></div>
                        <div><span className="text-muted block">Domain</span><span>{app.domain || '—'}</span></div>
                        <div><span className="text-muted block">Industry</span><span>{app.industry || '—'}</span></div>
                        <div><span className="text-muted block">Company Size</span><span>{app.companySize || '—'}</span></div>
                        <div>
                          <span className="text-muted block">Website</span>
                          {app.website ? (
                            <a href={app.website} target="_blank" rel="noreferrer" className="text-brand hover:underline inline-flex items-center gap-0.5">
                              {app.website} <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          ) : '—'}
                        </div>
                      </div>
                      <div className="pt-2 border-t border-line/60">
                        <span className="text-muted block">Registered Address</span>
                        <span className="text-ink">{app.address || '—'}</span>
                      </div>
                    </div>

                    {/* Representative Section */}
                    <div className="border border-line rounded-lg p-4 bg-canvas/40 space-y-2">
                      <h3 className="font-bold text-ink uppercase text-[11px] pb-1.5 border-b border-line flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-brand" /> Authorised Representative (Super Admin)
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        <div><span className="text-muted block">Representative Name</span><strong className="text-ink">{app.ownerName}</strong></div>
                        <div><span className="text-muted block">Designation</span><span>{app.ownerDesignation || '—'}</span></div>
                        <div className="col-span-2"><span className="text-muted block">Email Address</span><span className="font-mono">{app.ownerEmail}</span></div>
                        <div><span className="text-muted block">Direct Phone</span><span>{app.ownerPhone || '—'}</span></div>
                      </div>
                      <div className="pt-2 border-t border-line/60 text-[11px] text-muted">
                        This user account is created with role <code className="font-mono">ORGANISATION_SUPER_ADMIN</code> upon approval.
                      </div>
                    </div>

                    {/* Plan & Billing Section */}
                    <div className="border border-line rounded-lg p-4 bg-canvas/40 space-y-2 md:col-span-2">
                      <h3 className="font-bold text-ink uppercase text-[11px] pb-1.5 border-b border-line flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-brand" /> Plan Selection & Payment Information
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <span className="text-muted block">Selected Plan</span>
                          <strong className="text-ink text-sm">{app.selectedPlan?.name || 'Default Tier'}</strong>
                        </div>
                        <div>
                          <span className="text-muted block">Token Capacity</span>
                          <span className="font-mono font-semibold text-brand">
                            {app.selectedPlan ? `${app.selectedPlan.tokenAmount.toLocaleString()} tokens` : '0 tokens'}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted block">Plan Price</span>
                          <span>{app.selectedPlan ? `$${(app.selectedPlan.priceCents / 100).toFixed(0)} / month` : 'Free'}</span>
                        </div>
                        <div>
                          <span className="text-muted block">Payment Method</span>
                          <span className="font-mono">{app.paymentMethod || 'BANK_TRANSFER'}</span>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-line/60 flex items-center justify-between">
                        <div>
                          <span className="text-muted">Payment Reference / UTR:</span>{' '}
                          <code className="font-mono font-semibold text-ink">{app.paymentReference || 'None Provided'}</code>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted">Application Status:</span>
                            <span className="font-mono font-semibold text-ink text-[11px]">{app.status}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted">Payment Status:</span>
                            <span className={`px-2 py-0.5 rounded font-mono font-semibold text-[11px] ${
                              app.paymentStatus === 'VERIFIED' ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning'
                            }`}>
                              {app.paymentStatus}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: DOCUMENTS */}
              {activeTab === 'documents' && (
                <div className="space-y-4 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-ink">Attached Legal & Verification Documents</span>
                    <span className="text-muted">{app.documents?.length || 0} files</span>
                  </div>

                  {!app.documents || app.documents.length === 0 ? (
                    <div className="text-center p-8 border border-line rounded-lg bg-canvas text-muted">
                      No documents have been uploaded for this application.
                    </div>
                  ) : (
                    <div className="border border-line rounded-lg overflow-hidden bg-surface">
                      <table className="w-full text-left">
                        <thead className="bg-canvas border-b border-line text-muted">
                          <tr>
                            <th className="p-3 font-medium">Type</th>
                            <th className="p-3 font-medium">File Name</th>
                            <th className="p-3 font-medium">Size</th>
                            <th className="p-3 font-medium">Uploaded</th>
                            <th className="p-3 font-medium text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                          {app.documents.map((doc) => (
                            <tr key={doc.id} className="hover:bg-canvas/40 transition-colors">
                              <td className="p-3 font-mono text-[11px] font-semibold text-ink">
                                {doc.type.replace(/_/g, ' ')}
                              </td>
                              <td className="p-3 font-medium text-ink flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-muted shrink-0" />
                                <span className="truncate max-w-xs">{doc.fileName}</span>
                              </td>
                              <td className="p-3 text-muted font-mono text-[11px]">
                                {(doc.fileSize / 1024).toFixed(0)} KB
                              </td>
                              <td className="p-3 text-muted">
                                {new Date(doc.createdAt).toLocaleDateString()}
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewDoc({
                                      id: doc.id,
                                      name: doc.fileName,
                                      mime: doc.mimeType,
                                    })
                                  }
                                  className="button button-secondary button-small inline-flex items-center gap-1"
                                >
                                  <Eye className="w-3 h-3" /> Preview
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: REVIEW TIMELINE */}
              {activeTab === 'history' && (
                <div className="space-y-4 text-xs">
                  <div className="font-semibold text-ink">Application Lifecycle & Audit History</div>

                  {!app.reviewHistory || app.reviewHistory.length === 0 ? (
                    <div className="text-center p-8 border border-line rounded-lg bg-canvas text-muted">
                      No review actions recorded yet.
                    </div>
                  ) : (
                    <div className="relative pl-6 border-l-2 border-line space-y-4 ml-2">
                      {app.reviewHistory.map((h) => (
                        <div key={h.id} className="relative">
                          {/* Dot */}
                          <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full border-2 border-surface bg-ink" />

                          <div className="bg-canvas border border-line rounded-lg p-3 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-ink uppercase tracking-wide">
                                {h.action.replace(/_/g, ' ')}
                              </span>
                              <span className="text-muted text-[11px]">
                                {new Date(h.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <div className="text-muted text-[11px]">
                              Actor Role: <code className="font-mono">{h.actorRole}</code>
                            </div>
                            {h.notes && (
                              <p className="p-2 rounded bg-surface border border-line text-ink mt-1">
                                {h.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-6 border-t border-line bg-canvas/60 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="button button-secondary button-small"
          >
            Close
          </button>

          {isReviewable && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowRequestInfo(true)}
                className="button button-secondary button-small flex items-center gap-1.5"
              >
                <HelpCircle className="w-3.5 h-3.5 text-warning" /> Request Information
              </button>

              <button
                type="button"
                onClick={() => setShowReject(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-danger border border-danger/40 hover:bg-danger-soft transition-colors flex items-center gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5" /> Reject
              </button>

              <button
                type="button"
                onClick={() => setShowApprove(true)}
                className="button button-primary button-small flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" /> Approve & Provision
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sub-modals */}
      {previewDoc && (
        <DocumentPreviewModal
          applicationId={applicationId}
          documentId={previewDoc.id}
          fileName={previewDoc.name}
          mimeType={previewDoc.mime}
          onClose={() => setPreviewDoc(null)}
        />
      )}

      {showRequestInfo && app && (
        <RequestInformationDialog
          applicationId={app.id}
          applicationNumber={app.applicationNumber}
          organisationName={app.name}
          onClose={() => setShowRequestInfo(false)}
          onSuccess={() =>
            handleActionComplete('Information requested from applicant. Status updated.')
          }
        />
      )}

      {showReject && app && (
        <RejectApplicationDialog
          applicationId={app.id}
          applicationNumber={app.applicationNumber}
          organisationName={app.name}
          onClose={() => setShowReject(false)}
          onSuccess={() =>
            handleActionComplete('Application rejected successfully.')
          }
        />
      )}

      {showApprove && app && (
        <ApproveApplicationDialog
          applicationId={app.id}
          applicationNumber={app.applicationNumber}
          organisationName={app.name}
          slug={app.slug}
          ownerEmail={app.ownerEmail}
          planName={app.selectedPlan?.name}
          defaultTokenAllocation={app.selectedPlan?.tokenAmount || 0}
          onClose={() => setShowApprove(false)}
          onSuccess={(result) =>
            handleActionComplete(
              `Application approved and Organisation '${result?.organisation?.name || app.name}' provisioned successfully!`,
            )
          }
        />
      )}
    </div>
  );
};

