// ============================================================
// Organisation portal — analytics, AI usage, audit log, security.
// ============================================================

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, Download, ShieldCheck, Sparkles } from 'lucide-react';
import React, { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api, errorMessage } from '../lib/api';
import { fmtDateTime, fmtNum, fmtRelative, label, useDebounced } from '../lib/format';
import { qk, STALE } from '../lib/queryKeys';
import { ROLE_LABEL, usePermissions } from '../lib/session';
import { DataTable } from '../ui/DataTable';
import { toast } from '../ui/toast';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  FilterChips,
  Input,
  PageHeader,
  PageSkeleton,
  Sheet,
  StatusBadge,
} from '../ui/ui';

// ---------------- analytics ----------------

interface TeamStats {
  range: { from: string | null; to: string | null };
  members: { userId: string; name: string; role: string; jobsCreated: number; stageMoves: number; interviewsScheduled: number; offersCreated: number; hires: number }[];
}

interface JobPerf {
  id: string;
  title: string;
  status: string;
  total: number;
  daysOpen: number | null;
  [stage: string]: string | number | null;
}

export function AnalyticsPage() {
  const { can } = usePermissions();
  const [days, setDays] = useState('90');
  const from = new Date(Date.now() - Number(days) * 86_400_000).toISOString();
  const team = useQuery({ queryKey: qk.analytics.team({ days }), queryFn: () => api.get<TeamStats>('/org/analytics/team', { from }), staleTime: STALE.list });
  const jobs = useQuery({ queryKey: qk.analytics.jobs, queryFn: () => api.get<JobPerf[]>('/org/analytics/jobs'), staleTime: STALE.list });
  const wide = can('analytics.org', 'analytics.recruiter');

  const exportCsv = (type: string) =>
    api.download(`/org/exports/${type}`, `clyptus-${type}.csv`).then(
      () => toast.success('Export downloaded'),
      (e) => toast.error(errorMessage(e)),
    );

  return (
    <>
      <PageHeader
        title="Analytics"
        subtitle={wide ? 'Team performance and job funnels.' : 'Your own performance.'}
        actions={
          <>
            <FilterChips value={days} onChange={setDays} options={[{ value: '30', label: '30 days' }, { value: '90', label: '90 days' }, { value: '365', label: '12 months' }]} />
            {can('exports.run') && can('analytics.export') && (
              <Button variant="secondary" icon={Download} onClick={() => exportCsv('team-analytics')}>
                Export
              </Button>
            )}
          </>
        }
      />
      <div className="space-y-6">
        <Card>
          <CardHeader title={wide ? 'Team activity' : 'My activity'} />
          <div className="h-72 p-4">
            {team.isLoading ? (
              <PageSkeleton />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={team.data?.members ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" fontSize={11} stroke="#64748b" />
                  <YAxis allowDecimals={false} fontSize={11} stroke="#94a3b8" />
                  <Tooltip contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0', fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="stageMoves" name="Stage moves" fill="#818cf8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="interviewsScheduled" name="Interviews" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="offersCreated" name="Offers" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="hires" name="Hires" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
        <DataTable
          loading={team.isLoading}
          rows={(team.data?.members ?? []).map((m) => ({ ...m, id: m.userId }))}
          columns={[
            { key: 'name', header: 'Member', cell: (m) => <div><p className="font-medium text-slate-800">{m.name}</p><p className="text-xs text-slate-500">{ROLE_LABEL[m.role]}</p></div> },
            { key: 'jobs', header: 'Jobs created', cell: (m) => m.jobsCreated },
            { key: 'moves', header: 'Stage moves', cell: (m) => m.stageMoves },
            { key: 'int', header: 'Interviews', cell: (m) => m.interviewsScheduled },
            { key: 'off', header: 'Offers', cell: (m) => m.offersCreated },
            { key: 'hires', header: 'Hires', cell: (m) => <b>{m.hires}</b> },
          ]}
        />
        <Card>
          <CardHeader title="Job performance" subtitle="Most recent published jobs" />
          <DataTable
            loading={jobs.isLoading}
            rows={jobs.data}
            empty={<EmptyState title="No published jobs yet" />}
            columns={[
              { key: 'title', header: 'Job', cell: (j) => <div><p className="font-medium text-slate-800">{j.title}</p><StatusBadge status={j.status} /></div> },
              { key: 'total', header: 'Applicants', cell: (j) => j.total },
              { key: 'short', header: 'Shortlisted', cell: (j) => j.SHORTLISTED },
              { key: 'int', header: 'Interview', cell: (j) => j.INTERVIEW },
              { key: 'offer', header: 'Offer', cell: (j) => j.OFFER },
              { key: 'hired', header: 'Hired', cell: (j) => j.HIRED },
              { key: 'days', header: 'Days open', hideOnMobile: true, cell: (j) => j.daysOpen ?? '—' },
            ]}
          />
        </Card>
      </div>
    </>
  );
}

// ---------------- AI ----------------

interface AiRuns {
  runs: {
    data: { id: string; feature: string; status: string; tokens: number; user: string; error: string | null; createdAt: string }[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  };
  summary: { enabled: boolean; writingToolsConfigured: boolean; byFeature: { feature: string; runs: number; tokens: number }[]; costs: Record<string, number> };
}

export function AiPage() {
  const qc = useQueryClient();
  const { can } = usePermissions();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({ queryKey: qk.ai.runs({ page }), queryFn: () => api.get<AiRuns>('/org/ai/runs', { page, limit: 20 }), placeholderData: keepPreviousData });
  const toggle = useMutation({
    mutationFn: (enabled: boolean) => api.patch('/org/settings', { aiEnabled: enabled }),
    onSuccess: () => {
      toast.success('AI setting saved');
      qc.invalidateQueries({ queryKey: qk.ai.all });
      qc.invalidateQueries({ queryKey: qk.settings });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (isLoading || !data) return <PageSkeleton />;
  const s = data.summary;
  return (
    <>
      <PageHeader
        title="AI tools"
        subtitle="AI suggests; people decide. Every run is token-metered and refunded if it fails."
        actions={
          can('ai.govern') && (
            <Button variant={s.enabled ? 'secondary' : 'primary'} loading={toggle.isPending} onClick={() => toggle.mutate(!s.enabled)}>
              {s.enabled ? 'Turn AI off' : 'Turn AI on'}
            </Button>
          )
        }
      />
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs text-slate-500">Status</p>
          <p className="mt-1 text-lg font-semibold text-slate-800">{s.enabled ? 'Enabled' : 'Disabled'}</p>
          <p className="mt-1 text-xs text-slate-500">Writing tools: {s.writingToolsConfigured ? 'available' : 'not configured by the platform'}</p>
        </Card>
        <Card className="p-5 md:col-span-2">
          <p className="mb-2 text-xs text-slate-500">Where to find each tool</p>
          <ul className="space-y-1 text-sm text-slate-600">
            <li><Sparkles className="mr-1 inline h-3.5 w-3.5 text-indigo-500" /> Match score & explanation — on an application ({s.costs.AI_MATCH} tokens)</li>
            <li><Sparkles className="mr-1 inline h-3.5 w-3.5 text-indigo-500" /> Resume skill extraction — on a candidate ({s.costs.AI_RESUME_PARSE} tokens)</li>
            <li><Sparkles className="mr-1 inline h-3.5 w-3.5 text-indigo-500" /> Improve description & interview questions — on a job ({s.costs.AI_JD_IMPROVE} tokens)</li>
          </ul>
        </Card>
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        {s.byFeature.map((f) => (
          <Badge key={f.feature} tone="indigo">
            {label(f.feature)}: {f.runs} runs · {fmtNum(f.tokens)} tokens
          </Badge>
        ))}
      </div>
      <DataTable
        rows={data.runs.data}
        meta={data.runs.meta}
        onPage={setPage}
        empty={<EmptyState icon={Sparkles} title="No AI runs yet" />}
        columns={[
          { key: 'when', header: 'When', cell: (r) => fmtDateTime(r.createdAt) },
          { key: 'f', header: 'Feature', cell: (r) => label(r.feature) },
          { key: 'who', header: 'By', cell: (r) => r.user },
          { key: 'status', header: 'Result', cell: (r) => <span title={r.error ?? undefined}><StatusBadge status={r.status} /></span> },
          { key: 'tokens', header: 'Tokens', cell: (r) => r.tokens },
        ]}
      />
    </>
  );
}

// ---------------- audit ----------------

interface AuditRow {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorRole: string | null;
  actor: { name: string; email: string } | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: string;
}

export function AuditPage() {
  const { can } = usePermissions();
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<AuditRow | null>(null);
  const q = useDebounced(action);
  const { data, isFetching } = useQuery({
    queryKey: qk.audit.list({ action: q, page }),
    queryFn: () => api.page<AuditRow>('/org/audit', { action: q, page, limit: 25 }),
    placeholderData: keepPreviousData,
  });
  return (
    <>
      <PageHeader
        title="Audit log"
        subtitle={can('audit.read.org') ? 'Every privileged action in your organisation. Entries cannot be edited or deleted.' : 'Your own actions.'}
        actions={
          can('audit.export') &&
          can('exports.run') && (
            <Button variant="secondary" icon={Download} onClick={() => api.download('/org/exports/audit', 'clyptus-audit.csv').catch((e) => toast.error(errorMessage(e)))}>
              Export CSV
            </Button>
          )
        }
      />
      <DataTable<AuditRow>
        loading={isFetching && !data}
        rows={data?.data}
        meta={data?.meta}
        onPage={setPage}
        onRowClick={(r) => setOpen(r)}
        toolbar={<Input placeholder="Filter by action, e.g. JOB_ or MEMBER_SUSPENDED" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} className="sm:w-80" />}
        empty={<EmptyState icon={Activity} title="No audit entries" />}
        columns={[
          { key: 'when', header: 'When', cell: (r) => fmtDateTime(r.createdAt) },
          { key: 'actor', header: 'Actor', cell: (r) => r.actor?.name ?? 'System' },
          { key: 'action', header: 'Action', cell: (r) => <span className="font-mono text-xs">{r.action}</span> },
          { key: 'entity', header: 'Entity', hideOnMobile: true, cell: (r) => <span className="text-xs text-slate-500">{label(r.entityType)}</span> },
          { key: 'ip', header: 'IP', hideOnMobile: true, cell: (r) => <span className="text-xs text-slate-500">{r.ipAddress ?? '—'}</span> },
        ]}
      />
      <Sheet open={!!open} onClose={() => setOpen(null)} title={open?.action ?? ''} wide>
        {open && (
          <div className="space-y-3 text-sm">
            <p>
              <b>{open.actor?.name ?? 'System'}</b> ({open.actorRole ? ROLE_LABEL[open.actorRole] ?? label(open.actorRole) : '—'}) · {fmtDateTime(open.createdAt)}
            </p>
            <p className="text-slate-500">
              {label(open.entityType)} <span className="font-mono text-xs">{open.entityId}</span>
            </p>
            <pre className="overflow-x-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-700">{JSON.stringify(open.metadata, null, 2)}</pre>
          </div>
        )}
      </Sheet>
    </>
  );
}

// ---------------- security ----------------

interface SecurityData {
  sessions: { id: string; user: { id: string; name: string; email: string; role: string }; ipAddress: string | null; userAgent: string | null; createdAt: string; expiresAt: string; current: boolean }[];
  recentLogins: { id: string; action: string; ipAddress: string | null; createdAt: string; actor: string }[];
  failedLogins: { id: string; ipAddress: string | null; createdAt: string; actor: string }[];
}

export function SecurityPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: qk.security, queryFn: () => api.get<SecurityData>('/org/security') });
  const { data: settings } = useQuery({ queryKey: qk.settings, queryFn: () => api.get<{ messageOversight: boolean }>('/org/settings') });
  const [revoke, setRevoke] = useState<SecurityData['sessions'][number] | null>(null);
  const revokeM = useMutation({
    mutationFn: (id: string) => api.post(`/org/security/sessions/${id}/revoke`),
    onSuccess: () => {
      toast.success('Session signed out');
      setRevoke(null);
      qc.invalidateQueries({ queryKey: qk.security });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const oversight = useMutation({
    mutationFn: (v: boolean) => api.patch('/org/settings', { messageOversight: v }),
    onSuccess: () => {
      toast.success('Privacy policy updated');
      qc.invalidateQueries({ queryKey: qk.settings });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (isLoading || !data) return <PageSkeleton />;
  return (
    <>
      <PageHeader title="Security" subtitle="Active sessions, sign-in activity and privacy controls." />
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <p className="text-sm font-semibold text-slate-800">Message oversight</p>
          <p className="mt-1 text-sm text-slate-500">When on, members with oversight permission can read all candidate conversations. Off by default for privacy.</p>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" className="rounded border-slate-300" checked={!!settings?.messageOversight} onChange={(e) => oversight.mutate(e.target.checked)} />
            Allow oversight of candidate messages
          </label>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-semibold text-slate-800">Failed sign-ins</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{data.failedLogins.length}</p>
          <p className="text-xs text-slate-500">Most recent 30 attempts against member accounts. Suspend a compromised member from the Members page.</p>
        </Card>
      </div>
      <h2 className="mb-3 text-sm font-semibold text-slate-800">Active sessions</h2>
      <DataTable
        rows={data.sessions}
        empty={<EmptyState icon={ShieldCheck} title="No active sessions" />}
        columns={[
          { key: 'user', header: 'Member', cell: (s) => <div><p className="font-medium text-slate-800">{s.user.name}</p><p className="text-xs text-slate-500">{ROLE_LABEL[s.user.role]}</p></div> },
          { key: 'ip', header: 'IP', cell: (s) => s.ipAddress ?? '—' },
          { key: 'ua', header: 'Device', hideOnMobile: true, cell: (s) => <span className="line-clamp-1 max-w-xs text-xs text-slate-500">{s.userAgent ?? '—'}</span> },
          { key: 'since', header: 'Signed in', cell: (s) => fmtRelative(s.createdAt) },
          { key: 'act', header: '', className: 'text-right', cell: (s) => (s.current ? <Badge tone="green">This session</Badge> : <Button size="sm" variant="secondary" onClick={() => setRevoke(s)}>Sign out</Button>) },
        ]}
      />
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader title="Recent sign-ins" />
          <ul className="divide-y divide-slate-100">
            {data.recentLogins.map((l) => (
              <li key={l.id} className="flex justify-between px-5 py-2.5 text-sm">
                <span>
                  {l.actor} <span className="text-xs text-slate-400">· {label(l.action)}</span>
                </span>
                <span className="text-xs text-slate-500">{fmtRelative(l.createdAt)}</span>
              </li>
            ))}
            {!data.recentLogins.length && <li className="px-5 py-4 text-sm text-slate-400">No sign-ins yet.</li>}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Failed sign-ins" />
          <ul className="divide-y divide-slate-100">
            {data.failedLogins.map((l) => (
              <li key={l.id} className="flex justify-between px-5 py-2.5 text-sm">
                <span className="truncate">{l.actor}</span>
                <span className="text-xs text-slate-500">
                  {l.ipAddress ?? '—'} · {fmtRelative(l.createdAt)}
                </span>
              </li>
            ))}
            {!data.failedLogins.length && <li className="px-5 py-4 text-sm text-slate-400">None — good.</li>}
          </ul>
        </Card>
      </div>
      <ConfirmDialog
        open={!!revoke}
        title={`Sign out ${revoke?.user.name}?`}
        message="That device is signed out immediately."
        tone="danger"
        confirmLabel="Sign out"
        loading={revokeM.isPending}
        onClose={() => setRevoke(null)}
        onConfirm={() => revokeM.mutate(revoke.id)}
      />
    </>
  );
}
