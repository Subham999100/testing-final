// ============================================================
// Clyptus Job Portal - Platform Verification Page
// Production-grade queue for reviewing organisation applications
// ============================================================

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Filter,
  RefreshCw,
  Building2,
  Calendar,
  CreditCard,
  User,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { Page } from '../../components/platform/OperationsUI';
import {
  OrganisationApplicationService,
  PlatformApplicationItem,
} from '../../services/organisation-application.service';
import { VerificationDetailModal } from '../../features/platform/verification/VerificationDetailModal';

type StatusFilter = 'ALL' | 'PENDING_REVIEW' | 'MORE_INFO_REQUESTED' | 'APPROVED' | 'REJECTED';

export function Verification() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const limit = 15;

  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);

  const queryParams = {
    page,
    limit,
    ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
    ...(searchTerm.trim() ? { search: searchTerm.trim() } : {}),
  };

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['platform-applications', queryParams],
    queryFn: () => OrganisationApplicationService.getApplications(queryParams),
  });

  const applications = data?.data || [];
  const meta = data?.meta || { total: 0, page: 1, limit, totalPages: 1 };

  const getStatusBadge = (status: PlatformApplicationItem['status']) => {
    switch (status) {
      case 'PENDING_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Clock className="w-3 h-3" />
            Pending Review
          </span>
        );
      case 'MORE_INFO_REQUESTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-500/10 text-blue-500 border border-blue-500/20">
            <AlertTriangle className="w-3 h-3" />
            Info Requested
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <CheckCircle className="w-3 h-3" />
            Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-rose-500/10 text-rose-500 border border-rose-500/20">
            <XCircle className="w-3 h-3" />
            Rejected
          </span>
        );
    }
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-500">
            Verified
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-rose-500/10 text-rose-500">
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-muted/20 text-muted">
            Pending
          </span>
        );
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Page
      title="Organisation Applications"
      description="Review verification submissions, inspect company documentation, and provision approved organisations."
    >
      <div className="space-y-4">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 p-1 bg-surface-soft border border-border rounded-lg overflow-x-auto text-xs">
            {(
              [
                { id: 'ALL', label: 'All Submissions' },
                { id: 'PENDING_REVIEW', label: 'Pending Review' },
                { id: 'MORE_INFO_REQUESTED', label: 'Info Requested' },
                { id: 'APPROVED', label: 'Approved' },
                { id: 'REJECTED', label: 'Rejected' },
              ] as const
            ).map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => {
                  setStatusFilter(filter.id);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-colors ${
                  statusFilter === filter.id
                    ? 'bg-action text-on-action shadow-xs'
                    : 'text-muted hover:text-ink hover:bg-surface'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Search & Refresh */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <input
                type="text"
                placeholder="Search org, email, ref..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-surface border border-border rounded-lg text-ink placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-action"
              />
            </div>

            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              title="Refresh Queue"
              className="p-2 border border-border rounded-lg text-muted hover:text-ink hover:bg-surface-soft transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-action' : ''}`} />
            </button>
          </div>
        </div>

        {/* Content Table Container */}
        <div className="border border-border rounded-xl bg-surface overflow-hidden shadow-xs">
          {isLoading ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-action border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-muted">Loading verification applications...</p>
            </div>
          ) : isError ? (
            <div className="p-8 text-center space-y-3">
              <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
              <p className="text-sm font-medium text-ink">Failed to load verification applications</p>
              <p className="text-xs text-muted max-w-sm mx-auto">
                {(error as any)?.message || 'An error occurred while fetching the application queue.'}
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-surface-soft border border-border text-ink hover:bg-surface"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Try again
              </button>
            </div>
          ) : applications.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <FileText className="w-8 h-8 text-muted mx-auto opacity-50" />
              <p className="text-sm font-semibold text-ink">No organisation applications found</p>
              <p className="text-xs text-muted max-w-sm mx-auto">
                {searchTerm || statusFilter !== 'ALL'
                  ? 'No applications match your active search or status filter criteria.'
                  : 'There are currently no organisation applications submitted for verification.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-surface-soft/60 text-muted font-medium">
                    <th className="py-3 px-4 font-medium">Application #</th>
                    <th className="py-3 px-4 font-medium">Organisation</th>
                    <th className="py-3 px-4 font-medium">Representative</th>
                    <th className="py-3 px-4 font-medium">Plan & Tokens</th>
                    <th className="py-3 px-4 font-medium">Payment</th>
                    <th className="py-3 px-4 font-medium">Status</th>
                    <th className="py-3 px-4 font-medium">Submitted</th>
                    <th className="py-3 px-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {applications.map((app) => (
                    <tr
                      key={app.id}
                      className="hover:bg-surface-soft/40 transition-colors group cursor-pointer"
                      onClick={() => setSelectedApplicationId(app.id)}
                    >
                      {/* Application # */}
                      <td className="py-3 px-4 font-mono font-medium text-ink">
                        {app.applicationNumber}
                      </td>

                      {/* Organisation */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-ink">{app.name}</div>
                        <div className="text-[11px] text-muted flex items-center gap-2">
                          <span>{app.slug}</span>
                          {app.domain && <span>• {app.domain}</span>}
                        </div>
                      </td>

                      {/* Representative */}
                      <td className="py-3 px-4">
                        <div className="text-ink font-medium">{app.ownerName}</div>
                        <div className="text-[11px] text-muted">{app.ownerEmail || app.contactEmail}</div>
                      </td>

                      {/* Plan & Tokens */}
                      <td className="py-3 px-4">
                        <div className="text-ink font-medium">
                          {app.selectedPlan?.name || 'Standard'}
                        </div>
                        <div className="text-[11px] text-muted font-mono">
                          {app.selectedPlan?.tokenAmount
                            ? Number(app.selectedPlan.tokenAmount).toLocaleString()
                            : '0'}{' '}
                          tokens
                        </div>
                      </td>

                      {/* Payment */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-mono text-ink">
                            {app.paymentMethod ? app.paymentMethod.replace(/_/g, ' ') : '—'}
                          </span>
                          {getPaymentBadge(app.paymentStatus)}
                        </div>
                        {app.paymentReference && (
                          <div className="text-[10px] text-muted font-mono truncate max-w-[120px]">
                            {app.paymentReference}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getStatusBadge(app.status)}
                      </td>

                      {/* Submitted */}
                      <td className="py-3 px-4 text-muted whitespace-nowrap">
                        {formatDate(app.submittedAt)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setSelectedApplicationId(app.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-border bg-surface hover:bg-surface-soft text-ink transition-colors shadow-xs"
                        >
                          <Eye className="w-3.5 h-3.5 text-muted" />
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {meta.totalPages > 1 && (
            <div className="p-3 border-t border-border bg-surface flex items-center justify-between text-xs text-muted">
              <div>
                Showing{' '}
                <span className="font-medium text-ink">
                  {(meta.page - 1) * meta.limit + 1}
                </span>{' '}
                to{' '}
                <span className="font-medium text-ink">
                  {Math.min(meta.page * meta.limit, meta.total)}
                </span>{' '}
                of <span className="font-medium text-ink">{meta.total}</span> applications
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1 rounded border border-border disabled:opacity-40 hover:bg-surface-soft text-ink"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span>
                  Page <strong className="text-ink">{meta.page}</strong> of{' '}
                  <strong className="text-ink">{meta.totalPages}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                  disabled={page >= meta.totalPages}
                  className="p-1 rounded border border-border disabled:opacity-40 hover:bg-surface-soft text-ink"
                  title="Next Page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail & Action Modal */}
      {selectedApplicationId && (
        <VerificationDetailModal
          applicationId={selectedApplicationId}
          onClose={() => setSelectedApplicationId(null)}
          onRefreshQueue={() => {
            refetch();
          }}
        />
      )}
    </Page>
  );
}
