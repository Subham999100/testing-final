// ============================================================
// Organisation portal — Support Tickets & Platform Communications
// ============================================================

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Clock,
  HelpCircle,
  LifeBuoy,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  User,
} from 'lucide-react';
import React, { useState } from 'react';
import { orgApi, OrgSupportTicket, errorMessage } from '../lib/api';
import { fmtDate, fmtDateTime, fmtRelative, label, useDebounced } from '../lib/format';
import { usePermissions } from '../lib/session';
import { DataTable } from '../ui/DataTable';
import { toast } from '../ui/toast';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  KpiCard,
  Modal,
  PageHeader,
  PageSkeleton,
  Select,
  Sheet,
  Textarea,
  Tone,
} from '../ui/ui';

function priorityTone(priority: string): Tone {
  switch (priority) {
    case 'URGENT':
      return 'red';
    case 'HIGH':
      return 'amber';
    case 'MEDIUM':
      return 'blue';
    case 'LOW':
    default:
      return 'gray';
  }
}

function statusTone(status: string): Tone {
  switch (status) {
    case 'OPEN':
      return 'blue';
    case 'IN_PROGRESS':
      return 'amber';
    case 'WAITING_FOR_USER':
      return 'violet';
    case 'RESOLVED':
      return 'green';
    case 'CLOSED':
    default:
      return 'gray';
  }
}

export function SupportPage() {
  const qc = useQueryClient();
  const { can } = usePermissions();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search, 300);
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [category, setCategory] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  const queryKey = ['org', 'support', { page, search: debouncedSearch, status, priority, category }];

  const {
    data,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey,
    queryFn: () =>
      orgApi.supportList({
        page,
        limit: 15,
        search: debouncedSearch || undefined,
        status: status || undefined,
        priority: priority || undefined,
        category: category || undefined,
      }),
  });

  if (isLoading && !data) {
    return <PageSkeleton />;
  }

  if (isError && !data) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Support"
          subtitle="Need help? Create a ticket and our platform team will get back to you."
        />
        <Card className="p-10 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-rose-500 mb-2" />
          <p className="text-base font-semibold text-slate-800">Unable to load support tickets.</p>
          <p className="mt-1 text-sm text-slate-500">There was an issue communicating with the server.</p>
          <div className="mt-4">
            <Button variant="secondary" icon={RefreshCw} onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const summary = data?.summary ?? { open: 0, inProgress: 0, resolved: 0 };

  return (
    <>
      <PageHeader
        title="Support"
        subtitle="Need help? Create a ticket and our platform team will get back to you."
        actions={
          can('support.create') && (
            <Button icon={Plus} onClick={() => setCreateOpen(true)}>
              Create Ticket
            </Button>
          )
        }
      />

      {/* Summary KPI Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Open"
          value={summary.open}
          tone="sky"
          icon={HelpCircle}
          hint="Awaiting investigation or pickup"
        />
        <KpiCard
          label="In Progress"
          value={summary.inProgress}
          tone="amber"
          icon={Clock}
          hint="Being actively worked on"
        />
        <KpiCard
          label="Resolved"
          value={summary.resolved}
          tone="emerald"
          icon={LifeBuoy}
          hint="Successfully resolved issues"
        />
      </div>

      {/* Ticket List Table */}
      <DataTable<OrgSupportTicket>
        loading={isFetching && !data}
        rows={data?.data}
        meta={data?.meta}
        onPage={setPage}
        onRowClick={(t) => setSelectedTicketId(t.id)}
        toolbar={
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <Input
                placeholder="Search tickets..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full sm:w-64"
              />
              <Select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="w-36"
              >
                <option value="">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="WAITING_FOR_USER">Waiting for User</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </Select>
              <Select
                value={priority}
                onChange={(e) => {
                  setPriority(e.target.value);
                  setPage(1);
                }}
                className="w-32"
              >
                <option value="">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </Select>
              <Select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setPage(1);
                }}
                className="w-36"
              >
                <option value="">All Categories</option>
                <option value="JOB">Job</option>
                <option value="ACCOUNT">Account</option>
                <option value="AUTHENTICATION">Authentication</option>
                <option value="RECRUITER">Recruiter</option>
                <option value="APPLICATION">Application</option>
                <option value="PAYMENT">Payment</option>
                <option value="TECHNICAL">Technical</option>
                <option value="OTHER">Other</option>
              </Select>
            </div>
            {can('support.create') && (
              <Button size="sm" icon={Plus} onClick={() => setCreateOpen(true)}>
                Create Ticket
              </Button>
            )}
          </div>
        }
        empty={
          <EmptyState
            icon={LifeBuoy}
            title="No support tickets yet."
            text="Need help? Create a ticket and our platform team will get back to you."
            action={
              can('support.create') ? (
                <Button onClick={() => setCreateOpen(true)}>Create your first ticket</Button>
              ) : undefined
            }
          />
        }
        columns={[
          {
            key: 'ticketNumber',
            header: 'Ticket',
            cell: (t) => (
              <span className="font-semibold text-indigo-600">
                #{t.ticketNumber}
              </span>
            ),
          },
          {
            key: 'subject',
            header: 'Subject',
            cell: (t) => (
              <div className="min-w-0 max-w-md">
                <p className="truncate font-medium text-slate-800">{t.subject}</p>
                <p className="truncate text-xs text-slate-500">
                  {label(t.category)} · {t.description.slice(0, 60)}...
                </p>
              </div>
            ),
          },
          {
            key: 'priority',
            header: 'Priority',
            cell: (t) => (
              <Badge tone={priorityTone(t.priority)}>
                {t.priority}
              </Badge>
            ),
          },
          {
            key: 'status',
            header: 'Status',
            cell: (t) => (
              <Badge tone={statusTone(t.status)}>
                {t.status}
              </Badge>
            ),
          },
          {
            key: 'createdAt',
            header: 'Created',
            hideOnMobile: true,
            cell: (t) => (
              <span className="text-xs text-slate-500" title={fmtDateTime(t.createdAt)}>
                {fmtDate(t.createdAt)}
              </span>
            ),
          },
          {
            key: 'updatedAt',
            header: 'Updated',
            hideOnMobile: true,
            cell: (t) => (
              <span className="text-xs text-slate-500" title={fmtDateTime(t.updatedAt)}>
                {fmtRelative(t.updatedAt)}
              </span>
            ),
          },
          {
            key: 'actions',
            header: 'Action',
            className: 'text-right',
            cell: (t) => (
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedTicketId(t.id);
                }}
              >
                View
              </Button>
            ),
          },
        ]}
      />

      {/* Create Ticket Modal */}
      <CreateTicketModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => {
          qc.invalidateQueries({ queryKey: ['org', 'support'] });
          setSelectedTicketId(id);
        }}
      />

      {/* Ticket Details & Conversation Drawer */}
      <TicketDetailsSheet
        ticketId={selectedTicketId}
        onClose={() => setSelectedTicketId(null)}
      />
    </>
  );
}

// ---------------- Create Ticket Modal ----------------

function CreateTicketModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('JOB');
  const [priority, setPriority] = useState('MEDIUM');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setSubject('');
    setCategory('JOB');
    setPriority('MEDIUM');
    setDescription('');
    setError(null);
  };

  const createMutation = useMutation({
    mutationFn: () =>
      orgApi.supportCreate({
        subject: subject.trim(),
        category,
        priority,
        description: description.trim(),
      }),
    onSuccess: (res: OrgSupportTicket) => {
      toast.success('Support ticket created successfully');
      reset();
      onClose();
      onCreated(res.id);
    },
    onError: (err) => {
      setError(errorMessage(err, 'Failed to create support ticket'));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      setError('Subject is required');
      return;
    }
    if (!description.trim()) {
      setError('Description is required');
      return;
    }
    setError(null);
    createMutation.mutate();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Create Support Ticket"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={createMutation.isPending}>
            Cancel
          </Button>
          <Button
            loading={createMutation.isPending}
            onClick={handleSubmit}
          >
            Submit Ticket
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700 flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Field label="Subject" hint="Brief summary of the issue">
          <Input
            placeholder="e.g. Recruiter cannot publish a job"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            autoFocus
            required
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="JOB">Job</option>
              <option value="ACCOUNT">Account</option>
              <option value="AUTHENTICATION">Authentication</option>
              <option value="RECRUITER">Recruiter</option>
              <option value="APPLICATION">Application</option>
              <option value="PAYMENT">Payment</option>
              <option value="TECHNICAL">Technical</option>
              <option value="OTHER">Other</option>
            </Select>
          </Field>

          <Field label="Priority">
            <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </Select>
          </Field>
        </div>

        <Field label="Description" hint="Include steps to reproduce or details for Platform Support">
          <Textarea
            rows={4}
            placeholder="Describe the issue in detail..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </Field>
      </form>
    </Modal>
  );
}

// ---------------- Ticket Details Sheet ----------------

function TicketDetailsSheet({
  ticketId,
  onClose,
}: {
  ticketId: string | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { can } = usePermissions();
  const [replyBody, setReplyBody] = useState('');
  const [replyError, setReplyError] = useState<string | null>(null);

  const { data: ticket, isLoading, isError } = useQuery({
    queryKey: ['org', 'support', ticketId],
    queryFn: () => (ticketId ? orgApi.supportGet(ticketId) : null),
    enabled: !!ticketId,
  });

  const replyMutation = useMutation({
    mutationFn: (bodyText: string) => orgApi.supportMessage(ticketId!, { body: bodyText }),
    onSuccess: () => {
      setReplyBody('');
      setReplyError(null);
      toast.success('Reply sent');
      qc.invalidateQueries({ queryKey: ['org', 'support', ticketId] });
      qc.invalidateQueries({ queryKey: ['org', 'support'] });
    },
    onError: (err) => {
      setReplyError(errorMessage(err, 'Failed to send reply'));
    },
  });

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyBody.trim()) {
      setReplyError('Message cannot be empty');
      return;
    }
    setReplyError(null);
    replyMutation.mutate(replyBody.trim());
  };

  return (
    <Sheet
      open={!!ticketId}
      onClose={onClose}
      wide
      title={
        ticket ? (
          <div className="flex items-center gap-2">
            <span>Ticket #{ticket.ticketNumber}</span>
            <Badge tone={statusTone(ticket.status)}>{ticket.status}</Badge>
            <Badge tone={priorityTone(ticket.priority)}>{ticket.priority}</Badge>
          </div>
        ) : (
          'Ticket Details'
        )
      }
    >
      {isLoading && (
        <div className="space-y-4 py-8 text-center text-sm text-slate-500">
          <LifeBuoy className="mx-auto h-6 w-6 animate-spin text-indigo-500" />
          <p>Loading ticket details...</p>
        </div>
      )}

      {isError && (
        <div className="rounded-lg bg-rose-50 p-4 text-center text-sm text-rose-700">
          <AlertCircle className="mx-auto h-5 w-5 mb-1" />
          <p>Unable to load ticket details.</p>
        </div>
      )}

      {ticket && (
        <div className="space-y-6">
          {/* Metadata Card */}
          <Card className="p-4 bg-slate-50/50">
            <h3 className="text-base font-semibold text-slate-900 mb-1">{ticket.subject}</h3>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mb-3">
              <span>Category: <strong>{label(ticket.category)}</strong></span>
              <span>Created: <strong>{fmtDateTime(ticket.createdAt)}</strong></span>
              <span>Updated: <strong>{fmtRelative(ticket.updatedAt)}</strong></span>
              {ticket.createdByUser && (
                <span>
                  By: <strong>{ticket.createdByUser.firstName} {ticket.createdByUser.lastName}</strong> ({ticket.createdByUser.email})
                </span>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700 whitespace-pre-wrap">
              {ticket.description}
            </div>

            {ticket.resolutionNotes && (
              <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-900">
                <span className="font-semibold block mb-0.5">Resolution Notes:</span>
                {ticket.resolutionNotes}
              </div>
            )}
          </Card>

          {/* Conversation Thread */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" />
                Conversation
              </h4>
              <span className="text-xs text-slate-400">
                {ticket.messages?.length || 0} messages
              </span>
            </div>

            <div className="space-y-3">
              {(!ticket.messages || ticket.messages.length === 0) ? (
                <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
                  No replies on this ticket yet. Platform Support will respond shortly.
                </div>
              ) : (
                ticket.messages.map((m) => {
                  const isPlatform =
                    m.author?.role?.startsWith('PLATFORM_') || false;

                  return (
                    <div
                      key={m.id}
                      className={`rounded-xl border p-3.5 ${
                        isPlatform
                          ? 'border-indigo-200 bg-indigo-50/40 ml-4'
                          : 'border-slate-200 bg-white mr-4'
                      }`}
                    >
                      <div className="mb-1.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 font-semibold ${
                              isPlatform ? 'text-indigo-700' : 'text-slate-700'
                            }`}
                          >
                            <User className="h-3 w-3" />
                            {isPlatform
                              ? 'Platform Support'
                              : `${m.author?.firstName || ''} ${m.author?.lastName || ''}`.trim() || 'Organisation Admin'}
                          </span>
                          <Badge tone={isPlatform ? 'indigo' : 'gray'}>
                            {isPlatform ? 'Platform Team' : 'Organisation'}
                          </Badge>
                        </div>
                        <span className="text-[11px] text-slate-400" title={fmtDateTime(m.createdAt)}>
                          {fmtRelative(m.createdAt)}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm text-slate-800 leading-relaxed">
                        {m.body}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Reply Form */}
          {ticket.status === 'CLOSED' ? (
            <div className="rounded-lg bg-slate-100 p-3 text-center text-xs text-slate-600">
              This ticket is closed. If you require further assistance, please create a new support ticket.
            </div>
          ) : can('support.reply') ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h5 className="text-xs font-semibold text-slate-700 mb-2">Write a Reply</h5>
              {replyError && (
                <div className="mb-2 rounded bg-rose-50 p-2 text-xs text-rose-700">
                  {replyError}
                </div>
              )}
              <Textarea
                rows={3}
                placeholder="Write your message to Platform Support..."
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                className="bg-white mb-2"
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  icon={Send}
                  loading={replyMutation.isPending}
                  onClick={handleSendReply}
                >
                  Send Reply
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </Sheet>
  );
}
