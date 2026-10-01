// ============================================================
// Organisation portal — members, permission matrix, invitations.
// The permission editor shows the platform ceiling for the member's
// role and only enables keys the viewer is allowed to grant.
// ============================================================

import { zodResolver } from '@hookform/resolvers/zod';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Mail, RotateCw, UserPlus, Users, XCircle } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { api, errorMessage } from '../lib/api';
import { fmtDate, fmtRelative, label, useDebounced } from '../lib/format';
import { qk, STALE } from '../lib/queryKeys';
import { ROLE_LABEL, usePermissions } from '../lib/session';
import { DataTable } from '../ui/DataTable';
import { toast } from '../ui/toast';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  Field,
  FilterChips,
  Input,
  PageHeader,
  PageSkeleton,
  Select,
  Sheet,
  Stat,
  StatusBadge,
  EmptyState,
} from '../ui/ui';

interface MemberRow {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  title: string | null;
  joinedAt: string;
  tokensRemaining: number;
  openJobs: number;
  openApplications: number;
  canManage: boolean;
}

interface Catalog {
  catalog: { key: string; group: string; label: string }[];
  ceilings: Record<string, string[]>;
  defaults: Record<string, string[]>;
  grantable: { ORGANISATION_ADMIN: string[]; RECRUITER: string[] };
}

export function useCatalog() {
  return useQuery({ queryKey: qk.catalog, queryFn: () => api.get<Catalog>('/org/permissions/catalog'), staleTime: STALE.static });
}

// ---------------- Members ----------------

export function MembersPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [role, setRole] = useState('');
  const [status, setStatus] = useState(params.get('status') ?? '');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [inviting, setInviting] = useState(false);
  const q = useDebounced(search);
  const { can } = usePermissions();
  const filters = { role, status, search: q, page };
  const { data, isFetching } = useQuery({
    queryKey: qk.members.list(filters),
    queryFn: () => api.page<MemberRow>('/org/members', { ...filters, limit: 20 }),
    placeholderData: keepPreviousData,
    staleTime: STALE.list,
  });
  useEffect(() => setPage(1), [role, status, q]);

  return (
    <>
      <PageHeader
        title="Members"
        subtitle="Organisation admins and recruiters in your workspace."
        actions={
          can('invitations.manage') && (
            <Button icon={UserPlus} onClick={() => setInviting(true)}>
              Invite member
            </Button>
          )
        }
      />
      <DataTable
        loading={isFetching && !data}
        rows={data?.data}
        meta={data?.meta}
        onPage={setPage}
        onRowClick={(m) => navigate(`/org/members/${m.id}`)}
        toolbar={
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <FilterChips
              value={role}
              onChange={setRole}
              options={[
                { value: '', label: 'Everyone' },
                { value: 'ORGANISATION_ADMIN', label: 'Org admins' },
                { value: 'RECRUITER', label: 'Recruiters' },
              ]}
            />
            <div className="flex flex-1 gap-2 sm:justify-end">
              <Select value={status} onChange={(e) => { setStatus(e.target.value); setParams({}); }} className="w-36">
                <option value="">Active & suspended</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="REMOVED">Removed</option>
              </Select>
              <Input placeholder="Search name or email" value={search} onChange={(e) => setSearch(e.target.value)} className="sm:w-64" />
            </div>
          </div>
        }
        empty={<EmptyState icon={Users} title="No members match" text="Try a different filter or invite someone new." />}
        columns={[
          {
            key: 'name',
            header: 'Member',
            cell: (m) => (
              <div className="flex items-center gap-3">
                <Avatar name={m.name} />
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-800">{m.name}</p>
                  <p className="truncate text-xs text-slate-500">{m.email}</p>
                </div>
              </div>
            ),
          },
          { key: 'role', header: 'Role', cell: (m) => <Badge tone={m.role === 'RECRUITER' ? 'blue' : 'violet'}>{ROLE_LABEL[m.role]}</Badge> },
          { key: 'status', header: 'Status', cell: (m) => <StatusBadge status={m.status} /> },
          { key: 'work', header: 'Workload', hideOnMobile: true, cell: (m) => <span className="text-xs text-slate-500">{m.openJobs} jobs · {m.openApplications} applications</span> },
          { key: 'tokens', header: 'Tokens left', hideOnMobile: true, cell: (m) => m.tokensRemaining.toLocaleString() },
          { key: 'joined', header: 'Joined', hideOnMobile: true, cell: (m) => fmtDate(m.joinedAt) },
        ]}
      />
      <InviteSheet open={inviting} onClose={() => setInviting(false)} />
    </>
  );
}

// ---------------- Permission checklist (shared by invite & editor) ----------------

function PermissionChecklist({
  catalog,
  role,
  value,
  onChange,
  grantable,
}: {
  catalog: Catalog;
  role: string;
  value: Set<string>;
  onChange: (next: Set<string>) => void;
  grantable: string[];
}) {
  const ceiling = new Set(catalog.ceilings[role] ?? []);
  const groups = useMemo(() => {
    const g = new Map<string, Catalog['catalog']>();
    catalog.catalog.filter((p) => ceiling.has(p.key)).forEach((p) => g.set(p.group, [...(g.get(p.group) ?? []), p]));
    return [...g.entries()];
  }, [catalog, role]);

  return (
    <div className="space-y-4">
      {groups.map(([group, perms]) => (
        <fieldset key={group}>
          <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">{group}</legend>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {perms.map((p) => {
              const allowed = grantable.includes(p.key);
              const checked = value.has(p.key);
              return (
                <label
                  key={p.key}
                  className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${checked ? 'border-indigo-200 bg-indigo-50/60' : 'border-slate-200'} ${allowed ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
                  title={allowed ? p.key : 'You can only grant permissions you hold'}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 rounded border-slate-300"
                    checked={checked}
                    disabled={!allowed}
                    onChange={() => {
                      const next = new Set(value);
                      checked ? next.delete(p.key) : next.add(p.key);
                      onChange(next);
                    }}
                  />
                  <span className="text-slate-700">{p.label}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

// ---------------- Invite sheet ----------------

const inviteSchema = z.object({ email: z.string().email('Enter a valid email'), role: z.enum(['ORGANISATION_ADMIN', 'RECRUITER']) });

export function InviteSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: catalog } = useCatalog();
  const canInviteAdmins = !!catalog?.grantable.ORGANISATION_ADMIN.length;
  const { register, handleSubmit, watch, reset, formState } = useForm<z.infer<typeof inviteSchema>>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: 'RECRUITER' },
  });
  const role = watch('role');
  const grantable = catalog?.grantable[role] ?? [];
  const [perms, setPerms] = useState<Set<string>>(new Set());
  const [link, setLink] = useState<string | null>(null);

  useEffect(() => {
    if (catalog) setPerms(new Set((catalog.defaults[role] ?? []).filter((k) => grantable.includes(k))));
  }, [catalog, role]);

  const invite = useMutation({
    mutationFn: (v: z.infer<typeof inviteSchema>) => api.post<{ inviteUrl?: string }>('/org/invitations', { ...v, permissions: [...perms] }),
    onSuccess: (res, v) => {
      toast.success(`Invitation sent to ${v.email}`);
      qc.invalidateQueries({ queryKey: qk.invitations.all });
      if (res.inviteUrl) setLink(res.inviteUrl);
      else close();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const close = () => {
    reset({ email: '', role: 'RECRUITER' });
    setLink(null);
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={close}
      title="Invite a member"
      wide
      footer={
        link ? (
          <Button onClick={close}>Done</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button loading={invite.isPending} onClick={handleSubmit((v) => invite.mutate(v))}>
              Send invitation
            </Button>
          </>
        )
      }
    >
      {link ? (
        <div className="space-y-3 text-sm">
          <p className="text-slate-600">Invitation created. Email delivery is not configured in this environment, so share this one-time link:</p>
          <div className="flex gap-2">
            <Input readOnly value={link} onFocus={(e) => e.target.select()} />
            <Button variant="secondary" icon={Copy} onClick={() => navigator.clipboard.writeText(link).then(() => toast.success('Link copied'))}>
              Copy
            </Button>
          </div>
        </div>
      ) : !catalog ? (
        <PageSkeleton />
      ) : (
        <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" error={formState.errors.email?.message}>
              <Input type="email" autoFocus {...register('email')} />
            </Field>
            <Field label="Role">
              <Select {...register('role')}>
                <option value="RECRUITER">Recruiter</option>
                {canInviteAdmins && <option value="ORGANISATION_ADMIN">Organisation admin</option>}
              </Select>
            </Field>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Permissions</p>
            <PermissionChecklist catalog={catalog} role={role} value={perms} onChange={setPerms} grantable={grantable} />
          </div>
        </form>
      )}
    </Sheet>
  );
}

// ---------------- Member detail ----------------

interface MemberDetail {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  title: string | null;
  timezone: string;
  joinedAt: string;
  permissions: string[];
  ceiling: string[];
  grantable: string[];
  canManage: boolean;
  tokens: { allocated: number; consumed: number; remaining: number };
  recentActivity: { id: string; action: string; entityType: string; createdAt: string }[];
}

export function MemberDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: catalog } = useCatalog();
  const { data: m, isLoading } = useQuery({ queryKey: qk.members.detail(id), queryFn: () => api.get<MemberDetail>(`/org/members/${id}`) });
  const [perms, setPerms] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<null | 'suspend' | 'reactivate' | 'remove'>(null);
  useEffect(() => m && setPerms(new Set(m.permissions)), [m?.permissions]);

  const dirty = m && (perms.size !== m.permissions.length || m.permissions.some((p) => !perms.has(p)));

  const save = useMutation({
    mutationFn: () => api.put<MemberDetail>(`/org/members/${id}/permissions`, { permissions: [...perms] }),
    onSuccess: (res) => {
      qc.setQueryData(qk.members.detail(id), res);
      toast.success('Permissions updated');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const status = useMutation({
    mutationFn: (action: 'suspend' | 'reactivate' | 'remove') =>
      action === 'remove' ? api.del(`/org/members/${id}`) : api.post(`/org/members/${id}/${action}`),
    onMutate: async (action) => {
      await qc.cancelQueries({ queryKey: qk.members.detail(id) });
      const prev = qc.getQueryData<MemberDetail>(qk.members.detail(id));
      if (prev) qc.setQueryData(qk.members.detail(id), { ...prev, status: action === 'suspend' ? 'SUSPENDED' : action === 'remove' ? 'REMOVED' : 'ACTIVE' });
      return { prev };
    },
    onError: (e, _a, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.members.detail(id), ctx.prev);
      toast.error(errorMessage(e));
    },
    onSuccess: (_r, action) => {
      toast.success(action === 'remove' ? 'Member removed' : action === 'suspend' ? 'Member suspended and signed out' : 'Member reactivated');
      if (action === 'remove') navigate('/org/members');
    },
    onSettled: () => {
      setConfirm(null);
      qc.invalidateQueries({ queryKey: qk.members.all });
    },
  });

  if (isLoading || !m || !catalog) return <PageSkeleton />;

  return (
    <>
      <PageHeader
        back={{ to: '/org/members', label: 'Members' }}
        title={
          <span className="flex items-center gap-3">
            {m.name} <StatusBadge status={m.status} />
          </span>
        }
        subtitle={`${ROLE_LABEL[m.role]} · ${m.email}`}
        actions={
          m.canManage && (
            <>
              {m.status === 'ACTIVE' && (
                <Button variant="secondary" onClick={() => setConfirm('suspend')}>
                  Suspend
                </Button>
              )}
              {m.status === 'SUSPENDED' && (
                <Button variant="secondary" onClick={() => setConfirm('reactivate')}>
                  Reactivate
                </Button>
              )}
              {m.status !== 'REMOVED' && (
                <Button variant="danger" onClick={() => setConfirm('remove')}>
                  Remove
                </Button>
              )}
            </>
          )
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <Card className="p-5">
            <dl className="grid grid-cols-2 gap-4">
              <Stat label="Title" value={m.title} />
              <Stat label="Timezone" value={m.timezone} />
              <Stat label="Joined" value={fmtDate(m.joinedAt)} />
              <Stat label="Tokens left" value={`${m.tokens.remaining} / ${m.tokens.allocated}`} />
            </dl>
          </Card>
          <Card>
            <CardHeader title="Recent activity" />
            {m.recentActivity.length ? (
              <ul className="divide-y divide-slate-100">
                {m.recentActivity.map((a) => (
                  <li key={a.id} className="px-5 py-2.5 text-sm">
                    <p className="text-slate-700">{label(a.action)}</p>
                    <p className="text-xs text-slate-400">{fmtRelative(a.createdAt)}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No activity yet" />
            )}
          </Card>
        </div>
        <Card className="lg:col-span-2">
          <CardHeader
            title="Permissions"
            subtitle={m.canManage ? 'Greyed-out items are outside what you can grant.' : 'You can view but not change these permissions.'}
            action={
              m.canManage && (
                <Button size="sm" disabled={!dirty} loading={save.isPending} onClick={() => save.mutate()}>
                  Save changes
                </Button>
              )
            }
          />
          <div className="p-5">
            <PermissionChecklist catalog={catalog} role={m.role} value={perms} onChange={setPerms} grantable={m.canManage ? m.grantable : []} />
          </div>
        </Card>
      </div>
      <ConfirmDialog
        open={!!confirm}
        title={confirm === 'remove' ? `Remove ${m.name}?` : confirm === 'suspend' ? `Suspend ${m.name}?` : `Reactivate ${m.name}?`}
        message={
          confirm === 'remove'
            ? 'They lose access immediately. Their unused tokens return to the pool. Their history stays in the audit log.'
            : confirm === 'suspend'
              ? 'They are signed out everywhere and cannot sign in until reactivated.'
              : 'They will be able to sign in again.'
        }
        tone={confirm === 'reactivate' ? 'primary' : 'danger'}
        confirmLabel={label(confirm ?? '')}
        loading={status.isPending}
        onConfirm={() => status.mutate(confirm)}
        onClose={() => setConfirm(null)}
      />
    </>
  );
}

// ---------------- Invitations ----------------

interface InvitationRow {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  invitedBy: string;
  canManage: boolean;
}

export function InvitationsPage() {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState('PENDING');
  const [page, setPage] = useState(1);
  const [inviting, setInviting] = useState(params.get('new') === '1');
  const filters = { status, page };
  const { data, isFetching } = useQuery({
    queryKey: qk.invitations.list(filters),
    queryFn: () => api.page<InvitationRow>('/org/invitations', { ...filters, limit: 20 }),
    placeholderData: keepPreviousData,
  });
  const act = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'resend' | 'cancel' }) => api.post<{ inviteUrl?: string }>(`/org/invitations/${id}/${action}`),
    onSuccess: (res, v) => {
      if (v.action === 'resend' && res.inviteUrl) {
        navigator.clipboard?.writeText(res.inviteUrl).catch(() => undefined);
        toast.success('Invitation resent — new link copied to clipboard');
      } else toast.success(v.action === 'resend' ? 'Invitation resent' : 'Invitation cancelled');
      qc.invalidateQueries({ queryKey: qk.invitations.all });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <>
      <PageHeader
        title="Invitations"
        subtitle="Links expire after 7 days. Resending creates a new link and invalidates the old one."
        actions={
          <Button icon={UserPlus} onClick={() => setInviting(true)}>
            Invite member
          </Button>
        }
      />
      <DataTable
        loading={isFetching && !data}
        rows={data?.data}
        meta={data?.meta}
        onPage={setPage}
        toolbar={
          <FilterChips
            value={status}
            onChange={(v) => { setStatus(v); setPage(1); }}
            options={[
              { value: 'PENDING', label: 'Pending' },
              { value: 'ACCEPTED', label: 'Accepted' },
              { value: 'EXPIRED', label: 'Expired' },
              { value: 'CANCELLED', label: 'Cancelled' },
              { value: '', label: 'All' },
            ]}
          />
        }
        empty={<EmptyState icon={Mail} title="No invitations" text="Invite admins and recruiters to join your workspace." />}
        columns={[
          { key: 'email', header: 'Email', cell: (r) => <span className="font-medium text-slate-800">{r.email}</span> },
          { key: 'role', header: 'Role', cell: (r) => ROLE_LABEL[r.role] ?? label(r.role) },
          { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
          { key: 'by', header: 'Invited by', hideOnMobile: true, cell: (r) => r.invitedBy },
          { key: 'exp', header: 'Expires', hideOnMobile: true, cell: (r) => fmtDate(r.expiresAt) },
          {
            key: 'actions',
            header: '',
            className: 'text-right',
            cell: (r) =>
              r.canManage && (r.status === 'PENDING' || r.status === 'EXPIRED') ? (
                <div className="flex justify-end gap-1">
                  <Button size="sm" variant="ghost" icon={RotateCw} onClick={() => act.mutate({ id: r.id, action: 'resend' })}>
                    Resend
                  </Button>
                  {r.status === 'PENDING' && (
                    <Button size="sm" variant="ghost" icon={XCircle} onClick={() => act.mutate({ id: r.id, action: 'cancel' })}>
                      Cancel
                    </Button>
                  )}
                </div>
              ) : null,
          },
        ]}
      />
      <InviteSheet open={inviting} onClose={() => { setInviting(false); setParams({}); }} />
    </>
  );
}
