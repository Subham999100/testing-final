// ============================================================
// Organisation portal — members, permission matrix, organisation admin,
// direct recruiter provisioning, and recruiter limits.
// ============================================================

import { zodResolver } from '@hookform/resolvers/zod';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  KeyRound,
  Shield,
  UserPlus,
  Users,
} from 'lucide-react';
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

interface AdminData {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  status: string;
  mustChangePassword: boolean;
  createdAt: string;
}

interface RecruiterUsage {
  limit: number;
  used: number;
  available: number;
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

// ---------------- Direct Provisioning Modals ----------------

const adminSchema = z
  .object({
    name: z.string().min(1, 'Full name is required').max(120),
    email: z.string().email('Enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
    confirmPassword: z.string().min(1, 'Please confirm password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

function CreateAdminSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit, reset, formState } = useForm<z.infer<typeof adminSchema>>({
    resolver: zodResolver(adminSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const create = useMutation({
    mutationFn: (v: z.infer<typeof adminSchema>) => api.post('/org/admins', v),
    onSuccess: () => {
      toast.success('Organisation Admin created successfully');
      qc.invalidateQueries({ queryKey: ['org', 'admins'] });
      qc.invalidateQueries({ queryKey: qk.members.all });
      reset();
      onClose();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={handleClose}
      title="Create Organisation Admin"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button loading={create.isPending} onClick={handleSubmit((v) => create.mutate(v))}>
            Create Admin
          </Button>
        </>
      }
    >
      <p className="mb-4 text-xs text-slate-500">
        Creates the primary Organisation Admin with direct credentials. Exactly one active admin is permitted.
      </p>
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <Field label="Full Name" error={formState.errors.name?.message}>
          <Input placeholder="Jane Doe" autoFocus {...register('name')} />
        </Field>
        <Field label="Email Address" error={formState.errors.email?.message}>
          <Input type="email" placeholder="admin@acme.com" {...register('email')} />
        </Field>
        <Field label="Initial Password" error={formState.errors.password?.message}>
          <Input type="password" placeholder="Min 8 characters" {...register('password')} />
        </Field>
        <Field label="Confirm Password" error={formState.errors.confirmPassword?.message}>
          <Input type="password" placeholder="Repeat password" {...register('confirmPassword')} />
        </Field>
        <p className="text-xs text-slate-500">
          Newly created administrators will be prompted to change their password upon their first login.
        </p>
      </form>
    </Sheet>
  );
}

const recruiterSchema = z
  .object({
    name: z.string().min(1, 'Full name is required').max(120),
    email: z.string().email('Enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
    confirmPassword: z.string().min(1, 'Please confirm password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

function CreateRecruiterSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit, reset, formState } = useForm<z.infer<typeof recruiterSchema>>({
    resolver: zodResolver(recruiterSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const create = useMutation({
    mutationFn: (v: z.infer<typeof recruiterSchema>) => api.post('/org/recruiters', v),
    onSuccess: () => {
      toast.success('Recruiter created successfully');
      qc.invalidateQueries({ queryKey: ['org', 'recruiters', 'usage'] });
      qc.invalidateQueries({ queryKey: qk.members.all });
      reset();
      onClose();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={handleClose}
      title="Create Recruiter"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button loading={create.isPending} onClick={handleSubmit((v) => create.mutate(v))}>
            Create Recruiter
          </Button>
        </>
      }
    >
      <p className="mb-4 text-xs text-slate-500">
        Creates a recruiter account with direct credentials under the organisation's recruiter seat limit.
      </p>
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <Field label="Full Name" error={formState.errors.name?.message}>
          <Input placeholder="John Smith" autoFocus {...register('name')} />
        </Field>
        <Field label="Email Address" error={formState.errors.email?.message}>
          <Input type="email" placeholder="recruiter@acme.com" {...register('email')} />
        </Field>
        <Field label="Initial Password" error={formState.errors.password?.message}>
          <Input type="password" placeholder="Min 8 characters" {...register('password')} />
        </Field>
        <Field label="Confirm Password" error={formState.errors.confirmPassword?.message}>
          <Input type="password" placeholder="Repeat password" {...register('confirmPassword')} />
        </Field>
        <p className="text-xs text-slate-500">
          Newly created recruiters will be prompted to change their password upon their first login.
        </p>
      </form>
    </Sheet>
  );
}

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters long'),
    confirmPassword: z.string().min(1, 'Please confirm password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

function ResetPasswordSheet({
  user,
  onClose,
}: {
  user: { id: string; name: string; email: string } | null;
  onClose: () => void;
}) {
  const { register, handleSubmit, reset, formState } = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const resetPwd = useMutation({
    mutationFn: (v: z.infer<typeof resetPasswordSchema>) =>
      api.post(`/org/members/${user?.id}/reset-password`, v),
    onSuccess: () => {
      toast.success('Password reset successfully. User must change password on next login.');
      reset();
      onClose();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Sheet
      open={!!user}
      onClose={handleClose}
      title="Reset Password"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button loading={resetPwd.isPending} onClick={handleSubmit((v) => resetPwd.mutate(v))}>
            Reset Password
          </Button>
        </>
      }
    >
      {user && (
        <p className="mb-4 text-xs text-slate-500">
          Set a new password for <span className="font-semibold text-slate-700">{user.name}</span> ({user.email})
        </p>
      )}
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <Field label="New Password" error={formState.errors.password?.message}>
          <Input type="password" placeholder="Min 8 characters" autoFocus {...register('password')} />
        </Field>
        <Field label="Confirm New Password" error={formState.errors.confirmPassword?.message}>
          <Input type="password" placeholder="Repeat password" {...register('confirmPassword')} />
        </Field>
        <p className="text-xs text-slate-500">
          This will invalidate all current active sessions for this user and require them to set a new password upon login.
        </p>
      </form>
    </Sheet>
  );
}

// ---------------- Members Page ----------------

export function MembersPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [role, setRole] = useState('');
  const [status, setStatus] = useState(params.get('status') ?? '');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [creatingRecruiter, setCreatingRecruiter] = useState(false);
  const [resettingUser, setResettingUser] = useState<{ id: string; name: string; email: string } | null>(null);

  const q = useDebounced(search);
  const { can } = usePermissions();

  const { data: admin } = useQuery<AdminData | null>({
    queryKey: ['org', 'admins'],
    queryFn: () => api.get<AdminData | null>('/org/admins'),
    staleTime: STALE.list,
  });

  const { data: usage } = useQuery<RecruiterUsage>({
    queryKey: ['org', 'recruiters', 'usage'],
    queryFn: () => api.get<RecruiterUsage>('/org/recruiters/usage'),
    staleTime: STALE.list,
  });

  const recruiterLimit = usage?.limit ?? 25;
  const recruitersUsed = usage?.used ?? 0;
  const recruitersAvailable = usage?.available ?? Math.max(0, recruiterLimit - recruitersUsed);
  const isLimitReached = recruitersAvailable <= 0;
  const hasActiveAdmin = !!admin && admin.isActive;

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
        title="Team Management"
        subtitle="Manage Organisation Admin, Recruiters, and workspace team members."
        actions={
          <div className="flex items-center gap-2">
            {can('org_admins.manage') && (
              <Button
                variant="secondary"
                icon={Shield}
                disabled={hasActiveAdmin}
                title={hasActiveAdmin ? 'Organisation already has an Organisation Admin (1 max)' : undefined}
                onClick={() => setCreatingAdmin(true)}
              >
                Create Org Admin
              </Button>
            )}
            {can('recruiters.manage') && (
              <Button
                icon={UserPlus}
                disabled={isLimitReached}
                title={isLimitReached ? `Recruiter limit reached (${recruiterLimit}/${recruiterLimit})` : undefined}
                onClick={() => setCreatingRecruiter(true)}
              >
                Create Recruiter
              </Button>
            )}
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-indigo-600" />
              <h3 className="font-semibold text-slate-800">Organisation Admin</h3>
            </div>
            <Badge tone="violet">Max 1 Active</Badge>
          </div>
          {admin ? (
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar name={admin.name} />
                <div>
                  <p className="font-medium text-slate-900">{admin.name}</p>
                  <p className="text-xs text-slate-500">{admin.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={admin.status} />
                <Button size="sm" variant="secondary" onClick={() => navigate(`/org/members/${admin.id}`)}>
                  View
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-slate-500">No Organisation Admin created yet.</p>
              {can('org_admins.manage') && (
                <Button size="sm" variant="secondary" onClick={() => setCreatingAdmin(true)}>
                  Create Admin
                </Button>
              )}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-slate-800">Recruiters & Capacity</h3>
            </div>
            <span
              className={`font-mono text-xs font-semibold px-2 py-0.5 rounded-full ${
                isLimitReached ? 'bg-rose-100 text-rose-700' : 'bg-blue-50 text-blue-700'
              }`}
            >
              {recruitersUsed} / {recruiterLimit} Seats
            </span>
          </div>
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>
                Recruiters Used: <strong className="text-slate-900">{recruitersUsed}</strong>
              </span>
              <span>
                Available:{' '}
                <strong className={isLimitReached ? 'text-rose-600' : 'text-emerald-600'}>
                  {recruitersAvailable}
                </strong>
              </span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  isLimitReached ? 'bg-rose-500' : recruitersUsed / recruiterLimit > 0.8 ? 'bg-amber-500' : 'bg-indigo-600'
                }`}
                style={{ width: `${Math.min(100, Math.round((recruitersUsed / (recruiterLimit || 1)) * 100))}%` }}
              />
            </div>
            {isLimitReached && (
              <p className="text-[11px] text-rose-600 flex items-center gap-1 font-medium pt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                Recruiter seat limit reached ({recruiterLimit}/{recruiterLimit}). Contact Platform Admin to increase seats.
              </p>
            )}
          </div>
        </Card>
      </div>

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
              <Select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setParams({});
                }}
                className="w-36"
              >
                <option value="">Active & suspended</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="REMOVED">Removed</option>
              </Select>
              <Input
                placeholder="Search name or email"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="sm:w-64"
              />
            </div>
          </div>
        }
        empty={
          <EmptyState
            icon={Users}
            title="No members match"
            text="Try a different filter or create a new team member."
          />
        }
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
          {
            key: 'role',
            header: 'Role',
            cell: (m) => (
              <Badge tone={m.role === 'RECRUITER' ? 'blue' : m.role === 'ORGANISATION_ADMIN' ? 'violet' : 'amber'}>
                {ROLE_LABEL[m.role]}
              </Badge>
            ),
          },
          { key: 'status', header: 'Status', cell: (m) => <StatusBadge status={m.status} /> },
          {
            key: 'work',
            header: 'Workload',
            hideOnMobile: true,
            cell: (m) => (
              <span className="text-xs text-slate-500">
                {m.openJobs} jobs · {m.openApplications} applications
              </span>
            ),
          },
          {
            key: 'tokens',
            header: 'Tokens left',
            hideOnMobile: true,
            cell: (m) => m.tokensRemaining.toLocaleString(),
          },
          { key: 'joined', header: 'Joined', hideOnMobile: true, cell: (m) => fmtDate(m.joinedAt) },
          {
            key: 'actions',
            header: '',
            className: 'text-right',
            cell: (m) =>
              m.canManage && (
                <div className="flex justify-end gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={KeyRound}
                    title="Reset Password"
                    onClick={(e) => {
                      e.stopPropagation();
                      setResettingUser({ id: m.id, name: m.name, email: m.email });
                    }}
                  >
                    Reset
                  </Button>
                </div>
              ),
          },
        ]}
      />

      <CreateAdminSheet open={creatingAdmin} onClose={() => setCreatingAdmin(false)} />
      <CreateRecruiterSheet open={creatingRecruiter} onClose={() => setCreatingRecruiter(false)} />
      <ResetPasswordSheet user={resettingUser} onClose={() => setResettingUser(null)} />
    </>
  );
}

// ---------------- Permission checklist (shared by editor) ----------------

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
  const [resettingPassword, setResettingPassword] = useState(false);

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

  const grantable = catalog.grantable[m.role as 'ORGANISATION_ADMIN' | 'RECRUITER'] ?? [];

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
            <div className="flex items-center gap-2">
              <Button variant="secondary" icon={KeyRound} onClick={() => setResettingPassword(true)}>
                Reset Password
              </Button>
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
            </div>
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
              <p className="p-5 text-sm text-slate-400">No activity logged yet.</p>
            )}
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-800">Permissions</h3>
                <p className="text-xs text-slate-500">Effective permissions based on role ceiling and individual assignments.</p>
              </div>
              {dirty && (
                <Button loading={save.isPending} onClick={() => save.mutate()}>
                  Save changes
                </Button>
              )}
            </div>
            <PermissionChecklist catalog={catalog} role={m.role} value={perms} onChange={setPerms} grantable={grantable} />
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirm}
        title={confirm === 'remove' ? 'Remove member?' : confirm === 'suspend' ? 'Suspend member?' : 'Reactivate member?'}
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
        onConfirm={() => status.mutate(confirm!)}
        onClose={() => setConfirm(null)}
      />

      <ResetPasswordSheet
        user={resettingPassword ? { id: m.id, name: m.name, email: m.email } : null}
        onClose={() => setResettingPassword(false)}
      />
    </>
  );
}
