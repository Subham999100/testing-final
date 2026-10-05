import React, { useState, useEffect, useMemo } from 'react';
import {
  MessageSquare,
  AlertCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  RefreshCw,
  User,
  Building,
  Send,
  Lock,
  ChevronRight,
  X,
} from 'lucide-react';
import { Page, ErrorBox } from '../../components/platform/OperationsUI';
import { PlatformService } from '../../services/platform.service';
import {
  SupportTicket,
  SupportTicketStatus,
  SupportTicketPriority,
  SupportTicketCategory,
  SupportSummary,
  Organisation,
  PlatformAdminUser,
} from '../../types/platform.types';
import { useAuthStore } from '../../store/auth.store';

export function Support() {
  const currentUser = useAuthStore((s) => s.user);

  // Filters & Pagination State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [assignedFilter, setAssignedFilter] = useState<string>('');
  const [organisationFilter, setOrganisationFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [limit] = useState(15);

  // Data States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1, page: 1, limit: 15 });
  const [summary, setSummary] = useState<SupportSummary>({
    open: 0,
    inProgress: 0,
    urgent: 0,
    resolved: 0,
  });

  // Aux Data
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [admins, setAdmins] = useState<PlatformAdminUser[]>([]);

  // Modals & Active Ticket Detail
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reply state
  const [replyText, setReplyText] = useState('');
  const [isInternalReply, setIsInternalReply] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);

  // Quick Resolve state
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Load Organisations & Admins for dropdowns
  useEffect(() => {
    PlatformService.getOrganisations({ limit: 100 })
      .then((res) => setOrganisations(res.data || []))
      .catch(() => {});

    PlatformService.getAdmins()
      .then((res) => setAdmins(res.data || []))
      .catch(() => {});
  }, []);

  // Fetch Tickets List
  const fetchTickets = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await PlatformService.getSupportTickets({
        page,
        limit,
        search: searchTerm.trim() || undefined,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        category: categoryFilter || undefined,
        organisationId: organisationFilter || undefined,
        assignedToUserId: assignedFilter || undefined,
      });
      setTickets(res.data || []);
      setMeta(res.meta || { total: 0, totalPages: 1, page: 1, limit });
      if (res.summary) {
        setSummary(res.summary);
      }
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [page, statusFilter, priorityFilter, categoryFilter, assignedFilter, organisationFilter]);

  // Open Ticket Details
  const handleOpenTicket = async (ticketId: string) => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const fullTicket = await PlatformService.getSupportTicketById(ticketId);
      setSelectedTicket(fullTicket);
    } catch (err: any) {
      setDetailError(err?.message || 'Failed to load ticket details');
    } finally {
      setDetailLoading(false);
    }
  };

  // Reply Submit
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim() || sendingReply) return;

    setSendingReply(true);
    try {
      await PlatformService.addSupportMessage(selectedTicket.id, {
        body: replyText.trim(),
        isInternal: isInternalReply,
      });
      setReplyText('');
      setIsInternalReply(false);
      // Reload ticket details
      const refreshed = await PlatformService.getSupportTicketById(selectedTicket.id);
      setSelectedTicket(refreshed);
      // Update list in background
      fetchTickets();
    } catch (err: any) {
      alert(`Failed to send reply: ${err?.message || 'Unknown error'}`);
    } finally {
      setSendingReply(false);
    }
  };

  // Change Status
  const handleStatusChange = async (newStatus: SupportTicketStatus) => {
    if (!selectedTicket) return;
    try {
      const updated = await PlatformService.updateSupportTicketStatus(selectedTicket.id, {
        status: newStatus,
      });
      setSelectedTicket(updated);
      fetchTickets();
    } catch (err: any) {
      alert(`Failed to update status: ${err?.message || 'Unknown error'}`);
    }
  };

  // Quick Resolve
  const handleConfirmResolve = async () => {
    if (!selectedTicket) return;
    try {
      const updated = await PlatformService.updateSupportTicketStatus(selectedTicket.id, {
        status: 'RESOLVED',
        resolutionNotes: resolutionNotes.trim() || undefined,
      });
      setSelectedTicket(updated);
      setShowResolveModal(false);
      setResolutionNotes('');
      fetchTickets();
    } catch (err: any) {
      alert(`Failed to resolve ticket: ${err?.message || 'Unknown error'}`);
    }
  };

  // Assign Ticket
  const handleAssignTicket = async (assigneeId: string | null) => {
    if (!selectedTicket) return;
    try {
      const updated = await PlatformService.assignSupportTicket(selectedTicket.id, {
        assignedToUserId: assigneeId,
      });
      setSelectedTicket(updated);
      fetchTickets();
    } catch (err: any) {
      alert(`Failed to assign ticket: ${err?.message || 'Unknown error'}`);
    }
  };

  // Priority color badges
  const getPriorityBadge = (priority: SupportTicketPriority) => {
    switch (priority) {
      case 'URGENT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/20">
            URGENT
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">
            HIGH
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-600 border border-blue-500/20">
            MEDIUM
          </span>
        );
      case 'LOW':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-500/10 text-slate-600 border border-slate-500/20">
            LOW
          </span>
        );
    }
  };

  // Status color badges
  const getStatusBadge = (status: SupportTicketStatus) => {
    switch (status) {
      case 'OPEN':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/15 text-blue-700 dark:text-blue-400">
            OPEN
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/15 text-purple-700 dark:text-purple-400">
            IN PROGRESS
          </span>
        );
      case 'WAITING_FOR_USER':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-700 dark:text-amber-400">
            WAITING
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
            RESOLVED
          </span>
        );
      case 'CLOSED':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-500/15 text-slate-700 dark:text-slate-400">
            CLOSED
          </span>
        );
    }
  };

  return (
    <Page
      title="Platform Support"
      description="Centralized case management for technical, account, and operational requests across organisations."
    >
      {/* Top Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-surface border border-line rounded-xl p-4 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight">{summary.open}</div>
            <div className="text-xs text-muted font-medium">Open Cases</div>
          </div>
        </div>

        <div className="bg-surface border border-line rounded-xl p-4 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight">{summary.inProgress}</div>
            <div className="text-xs text-muted font-medium">In Progress</div>
          </div>
        </div>

        <div className="bg-surface border border-line rounded-xl p-4 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-rose-600">{summary.urgent}</div>
            <div className="text-xs text-muted font-medium">Urgent</div>
          </div>
        </div>

        <div className="bg-surface border border-line rounded-xl p-4 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-emerald-600">{summary.resolved}</div>
            <div className="text-xs text-muted font-medium">Resolved</div>
          </div>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="bg-surface border border-line rounded-xl p-4 space-y-3 mb-6 shadow-xs">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <form
            className="flex-1 w-full flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              fetchTickets();
            }}
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search tickets by subject, description, ticket #..."
                className="w-full bg-soft border border-line rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-hidden focus:ring-1 focus:ring-primary"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors"
            >
              Search
            </button>
          </form>

          {/* Create Ticket Trigger */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full md:w-auto px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover flex items-center justify-center gap-2 transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create Ticket</span>
          </button>
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-line">
          <div className="flex items-center gap-1.5 text-xs text-muted mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="bg-soft border border-line rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-hidden"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="WAITING_FOR_USER">Waiting for User</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
              setPage(1);
            }}
            className="bg-soft border border-line rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-hidden"
          >
            <option value="">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="bg-soft border border-line rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-hidden"
          >
            <option value="">All Categories</option>
            <option value="JOB">Job Operations</option>
            <option value="AUTHENTICATION">Authentication</option>
            <option value="ACCOUNT">Account</option>
            <option value="RECRUITER">Recruiter</option>
            <option value="APPLICATION">Application</option>
            <option value="PAYMENT">Payment</option>
            <option value="TECHNICAL">Technical</option>
            <option value="OTHER">Other</option>
          </select>

          <select
            value={assignedFilter}
            onChange={(e) => {
              setAssignedFilter(e.target.value);
              setPage(1);
            }}
            className="bg-soft border border-line rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-hidden"
          >
            <option value="">All Assignments</option>
            <option value="assigned">Assigned</option>
            <option value="unassigned">Unassigned</option>
          </select>

          {organisations.length > 0 && (
            <select
              value={organisationFilter}
              onChange={(e) => {
                setOrganisationFilter(e.target.value);
                setPage(1);
              }}
              className="bg-soft border border-line rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-hidden max-w-[180px] truncate"
            >
              <option value="">All Organisations</option>
              {organisations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          )}

          {(statusFilter || priorityFilter || categoryFilter || assignedFilter || organisationFilter || searchTerm) && (
            <button
              onClick={() => {
                setStatusFilter('');
                setPriorityFilter('');
                setCategoryFilter('');
                setAssignedFilter('');
                setOrganisationFilter('');
                setSearchTerm('');
                setPage(1);
              }}
              className="text-xs text-action hover:underline ml-auto flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Main Ticket Table */}
      {loading ? (
        <div className="bg-surface border border-line rounded-xl p-12 text-center text-muted">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
          <p className="text-sm">Loading support tickets...</p>
        </div>
      ) : error ? (
        <ErrorBox error={error} retry={fetchTickets} />
      ) : tickets.length === 0 ? (
        <div className="bg-surface border border-line rounded-xl p-12 text-center text-muted">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <h3 className="font-semibold text-ink text-base">No support tickets found</h3>
          <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
            {searchTerm || statusFilter || priorityFilter
              ? 'No tickets match your active filter criteria. Try resetting filters.'
              : 'There are currently no active support tickets in the system.'}
          </p>
        </div>
      ) : (
        <div className="bg-surface border border-line rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-soft text-muted font-medium text-xs border-b border-line">
                <tr>
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Organisation</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Assigned To</th>
                  <th className="py-3 px-4">Updated</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {tickets.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-soft/50 transition-colors cursor-pointer"
                    onClick={() => handleOpenTicket(t.id)}
                  >
                    <td className="py-3 px-4 font-mono font-semibold text-xs text-primary">
                      #{t.ticketNumber}
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate">
                      <div className="font-medium text-ink truncate">{t.subject}</div>
                      <div className="text-[11px] text-muted flex items-center gap-1.5 mt-0.5">
                        <span className="uppercase text-[10px] tracking-wider px-1 bg-soft rounded border border-line">
                          {t.category}
                        </span>
                        {t.messageCount ? (
                          <span className="flex items-center gap-0.5 text-muted">
                            <MessageSquare className="w-2.5 h-2.5" />
                            {t.messageCount}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-muted text-xs">
                      {t.organisation ? (
                        <div className="flex items-center gap-1">
                          <Building className="w-3.5 h-3.5 text-muted shrink-0" />
                          <span className="truncate">{t.organisation.name}</span>
                        </div>
                      ) : (
                        <span className="italic text-muted">Platform</span>
                      )}
                    </td>
                    <td className="py-3 px-4">{getPriorityBadge(t.priority)}</td>
                    <td className="py-3 px-4">{getStatusBadge(t.status)}</td>
                    <td className="py-3 px-4 text-xs text-muted">
                      {t.assignedToUser ? (
                        <div className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-muted shrink-0" />
                          <span>
                            {t.assignedToUser.firstName} {t.assignedToUser.lastName}
                          </span>
                        </div>
                      ) : (
                        <span className="italic text-muted/70">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-muted">
                      {new Date(t.updatedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenTicket(t.id);
                        }}
                        className="px-3 py-1 bg-soft border border-line text-ink rounded hover:bg-line text-xs font-medium transition-colors"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-line text-xs text-muted">
              <div>
                Showing page <span className="font-semibold text-ink">{meta.page}</span> of{' '}
                <span className="font-semibold text-ink">{meta.totalPages}</span> ({meta.total} tickets)
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1 bg-soft border border-line rounded text-ink disabled:opacity-50 hover:bg-line transition-colors"
                >
                  Previous
                </button>
                <button
                  disabled={page >= meta.totalPages || loading}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1 bg-soft border border-line rounded text-ink disabled:opacity-50 hover:bg-line transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Ticket Details Modal / Drawer */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-surface border border-line rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-line flex items-start justify-between bg-soft/30">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-bold text-primary px-2 py-0.5 rounded bg-primary/10">
                    #{selectedTicket.ticketNumber}
                  </span>
                  {getStatusBadge(selectedTicket.status)}
                  {getPriorityBadge(selectedTicket.priority)}
                  <span className="text-xs uppercase text-muted font-medium tracking-wider">
                    {selectedTicket.category}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-ink">{selectedTicket.subject}</h2>
                <div className="text-xs text-muted flex items-center gap-4 flex-wrap">
                  <span>
                    Organisation:{' '}
                    <strong className="text-ink">
                      {selectedTicket.organisation?.name || 'Platform-level'}
                    </strong>
                  </span>
                  <span>
                    Created by:{' '}
                    <strong className="text-ink">
                      {selectedTicket.createdByUser.firstName} {selectedTicket.createdByUser.lastName}
                    </strong>{' '}
                    ({selectedTicket.createdByUser.email})
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="text-muted hover:text-ink p-1 rounded-lg hover:bg-soft"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Action Toolbar */}
            <div className="p-3 bg-soft border-b border-line flex items-center justify-between gap-3 flex-wrap text-xs">
              <div className="flex items-center gap-2">
                <span className="text-muted font-medium">Assign To:</span>
                <select
                  value={selectedTicket.assignedToUserId || ''}
                  onChange={(e) => handleAssignTicket(e.target.value || null)}
                  className="bg-surface border border-line rounded px-2 py-1 text-xs font-medium"
                >
                  <option value="">Unassigned</option>
                  {currentUser && (
                    <option value={currentUser.userId}>Assign to Me</option>
                  )}
                  {admins.map((adm) => (
                    <option key={adm.id} value={adm.id}>
                      {adm.firstName} {adm.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-muted font-medium">Status:</span>
                <select
                  value={selectedTicket.status}
                  onChange={(e) => handleStatusChange(e.target.value as SupportTicketStatus)}
                  className="bg-surface border border-line rounded px-2 py-1 text-xs font-medium"
                >
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="WAITING_FOR_USER">Waiting for User</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                </select>

                {selectedTicket.status !== 'RESOLVED' && selectedTicket.status !== 'CLOSED' && (
                  <button
                    onClick={() => setShowResolveModal(true)}
                    className="px-2.5 py-1 bg-emerald-600 text-white rounded font-medium hover:bg-emerald-700 transition-colors"
                  >
                    Resolve Case
                  </button>
                )}
              </div>
            </div>

            {/* Modal Body: Description & Conversation Thread */}
            <div className="p-5 flex-1 overflow-y-auto space-y-5">
              {/* Problem Description Box */}
              <div className="bg-soft/50 border border-line rounded-lg p-4">
                <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                  Issue Description
                </div>
                <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed">
                  {selectedTicket.description}
                </p>
                {selectedTicket.resolutionNotes && (
                  <div className="mt-3 pt-3 border-t border-line">
                    <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">
                      Resolution Notes
                    </div>
                    <p className="text-xs text-ink">{selectedTicket.resolutionNotes}</p>
                  </div>
                )}
              </div>

              {/* Conversation Messages Thread */}
              <div>
                <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
                  Conversation Thread ({(selectedTicket.messages || []).length})
                </div>

                <div className="space-y-3">
                  {(selectedTicket.messages || []).length === 0 ? (
                    <p className="text-xs text-muted italic">No responses posted yet.</p>
                  ) : (
                    selectedTicket.messages?.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-lg border text-sm ${
                          msg.isInternal
                            ? 'bg-amber-500/10 border-amber-500/30'
                            : 'bg-surface border-line'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs text-muted mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-ink">
                              {msg.author.firstName} {msg.author.lastName}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 bg-soft rounded text-muted">
                              {msg.author.role}
                            </span>
                            {msg.isInternal && (
                              <span className="flex items-center gap-0.5 text-[10px] text-amber-700 font-semibold uppercase bg-amber-500/20 px-1 rounded">
                                <Lock className="w-2.5 h-2.5" /> Staff Note
                              </span>
                            )}
                          </div>
                          <span className="text-[11px]">
                            {new Date(msg.createdAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-ink whitespace-pre-wrap text-xs leading-relaxed">
                          {msg.body}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Reply Input Box Footer */}
            <form onSubmit={handleSendReply} className="p-4 border-t border-line bg-surface">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-muted">Post a Reply</span>
                <label className="flex items-center gap-1.5 text-xs text-muted cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isInternalReply}
                    onChange={(e) => setIsInternalReply(e.target.checked)}
                    className="rounded border-line text-primary focus:ring-0"
                  />
                  <span>Internal note (staff only)</span>
                </label>
              </div>
              <div className="flex gap-2">
                <textarea
                  rows={2}
                  placeholder={
                    isInternalReply
                      ? 'Add an internal note only visible to platform staff...'
                      : 'Type a message to the user...'
                  }
                  className="flex-1 bg-soft border border-line rounded-lg p-2.5 text-xs text-ink focus:outline-hidden focus:ring-1 focus:ring-primary resize-none"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={!replyText.trim() || sendingReply}
                  className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary-hover disabled:opacity-50 flex items-center justify-center gap-1.5 transition-colors shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sendingReply ? 'Sending...' : 'Send'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Resolve Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-surface border border-line rounded-xl p-5 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-ink">Resolve Support Ticket</h3>
            <p className="text-xs text-muted">
              Mark this ticket as resolved. You can optionally include internal resolution notes
              explaining how the problem was resolved.
            </p>
            <div>
              <label className="text-xs font-medium text-muted block mb-1">
                Resolution Notes (optional)
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Configured domain records, issue was resolved with client confirmation."
                className="w-full bg-soft border border-line rounded-lg p-2.5 text-xs text-ink focus:outline-hidden focus:ring-1 focus:ring-primary"
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowResolveModal(false)}
                className="px-3 py-1.5 text-xs font-medium text-muted hover:text-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmResolve}
                className="px-4 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                Confirm Resolution
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <CreateTicketModal
          organisations={organisations}
          admins={admins}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchTickets();
          }}
        />
      )}
    </Page>
  );
}

// Subcomponent: Create Ticket Modal
function CreateTicketModal({
  organisations,
  admins,
  onClose,
  onCreated,
}: {
  organisations: Organisation[];
  admins: PlatformAdminUser[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [organisationId, setOrganisationId] = useState('');
  const [priority, setPriority] = useState<SupportTicketPriority>('MEDIUM');
  const [category, setCategory] = useState<SupportTicketCategory>('TECHNICAL');
  const [assignedToUserId, setAssignedToUserId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      setError('Subject and description are required.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await PlatformService.createSupportTicket({
        subject: subject.trim(),
        description: description.trim(),
        organisationId: organisationId || undefined,
        priority,
        category,
        assignedToUserId: assignedToUserId || undefined,
      });
      onCreated();
    } catch (err: any) {
      setError(err?.message || 'Failed to create support ticket');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-surface border border-line rounded-xl p-6 max-w-lg w-full space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-ink">Create New Support Ticket</h3>
          <button onClick={onClose} className="text-muted hover:text-ink">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted block mb-1">Subject *</label>
            <input
              type="text"
              required
              placeholder="Brief summary of the issue"
              className="w-full bg-soft border border-line rounded-lg px-3 py-2 text-xs text-ink focus:outline-hidden focus:ring-1 focus:ring-primary"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted block mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as SupportTicketPriority)}
                className="w-full bg-soft border border-line rounded-lg px-2.5 py-2 text-xs text-ink focus:outline-hidden"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted block mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as SupportTicketCategory)}
                className="w-full bg-soft border border-line rounded-lg px-2.5 py-2 text-xs text-ink focus:outline-hidden"
              >
                <option value="TECHNICAL">Technical</option>
                <option value="JOB">Job</option>
                <option value="AUTHENTICATION">Authentication</option>
                <option value="ACCOUNT">Account</option>
                <option value="RECRUITER">Recruiter</option>
                <option value="APPLICATION">Application</option>
                <option value="PAYMENT">Payment</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted block mb-1">Organisation</label>
              <select
                value={organisationId}
                onChange={(e) => setOrganisationId(e.target.value)}
                className="w-full bg-soft border border-line rounded-lg px-2.5 py-2 text-xs text-ink focus:outline-hidden"
              >
                <option value="">Platform-level (None)</option>
                {organisations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted block mb-1">Assign Admin</label>
              <select
                value={assignedToUserId}
                onChange={(e) => setAssignedToUserId(e.target.value)}
                className="w-full bg-soft border border-line rounded-lg px-2.5 py-2 text-xs text-ink focus:outline-hidden"
              >
                <option value="">Unassigned</option>
                {admins.map((adm) => (
                  <option key={adm.id} value={adm.id}>
                    {adm.firstName} {adm.lastName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted block mb-1">Description *</label>
            <textarea
              rows={4}
              required
              placeholder="Detailed description of the issue or question..."
              className="w-full bg-soft border border-line rounded-lg p-2.5 text-xs text-ink focus:outline-hidden focus:ring-1 focus:ring-primary resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-muted hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary-hover disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Creating...' : 'Create Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
