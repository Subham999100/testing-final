// ============================================================
// Organisation portal — organisation profile, workflow settings,
// integrations (secrets masked) and the member's own profile.
// ============================================================

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, KeyRound, Plug } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { api, errorMessage } from '../lib/api';
import { fmtDate, fmtRelative, label } from '../lib/format';
import { qk, STALE } from '../lib/queryKeys';
import { ROLE_LABEL, usePermissions } from '../lib/session';
import { toast } from '../ui/toast';
import { Badge, Button, Card, CardHeader, Field, Input, PageHeader, PageSkeleton, Sheet, Stat, StatusBadge, Tabs } from '../ui/ui';

interface Organisation {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  contactEmail: string;
  contactPhone: string | null;
  status: string;
  suspensionReason: string | null;
  createdAt: string;
  metadata: { industry: string | null; companySize: string | null; website: string | null; logoUrl: string | null; address: string | null };
  platformLimits: { tier: string; maxRecruiters: number; recruitersUsed: number; activeMembers: number };
}

interface Settings {
  jobApprovalRequired: boolean;
  offerApprovalRequired: boolean;
  rejectReasonRequired: boolean;
  messageOversight: boolean;
  aiEnabled: boolean;
  lowBalanceThreshold: number;
  tokenConfirmThreshold: number;
  updatedAt: string;
}

interface Integration {
  provider: string;
  connected: boolean;
  label: string | null;
  enabled: boolean;
  secret: string | null;
  updatedAt: string | null;
}

type Tab = 'profile' | 'workflow' | 'integrations';

export function OrganisationPage() {
  const { can } = usePermissions();
  const [tab, setTab] = useState<Tab>('profile');
  return (
    <>
      <PageHeader title="Organisation" subtitle="Profile, workflow rules and integrations." />
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'profile', label: 'Profile' },
          { key: 'workflow', label: 'Workflow settings' },
          ...(can('org.integrations.manage') ? [{ key: 'integrations' as const, label: 'Integrations' }] : []),
        ]}
      />
      {tab === 'profile' && <ProfileTab />}
      {tab === 'workflow' && <WorkflowTab />}
      {tab === 'integrations' && <IntegrationsTab />}
    </>
  );
}

function ProfileTab() {
  const qc = useQueryClient();
  const { can } = usePermissions();
  const editable = can('org.profile.update');
  const { data: org, isLoading } = useQuery({ queryKey: qk.organisation, queryFn: () => api.get<Organisation>('/org/organisation'), staleTime: STALE.reference });
  const [form, setForm] = useState<Record<string, string>>({});
  useEffect(() => {
    if (org)
      setForm({
        name: org.name,
        contactEmail: org.contactEmail,
        contactPhone: org.contactPhone ?? '',
        industry: org.metadata.industry ?? '',
        companySize: org.metadata.companySize ?? '',
        website: org.metadata.website ?? '',
        logoUrl: org.metadata.logoUrl ?? '',
        address: org.metadata.address ?? '',
      });
  }, [org]);
  const save = useMutation({
    mutationFn: () => api.patch('/org/organisation', Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v || undefined]))),
    onSuccess: () => {
      toast.success('Organisation profile saved');
      qc.invalidateQueries({ queryKey: qk.organisation });
      qc.invalidateQueries({ queryKey: qk.me });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (isLoading || !org) return <PageSkeleton />;
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });
  const fields: [string, string][] = [
    ['name', 'Organisation name'],
    ['contactEmail', 'Contact email'],
    ['contactPhone', 'Contact phone'],
    ['website', 'Website'],
    ['industry', 'Industry'],
    ['companySize', 'Company size'],
    ['logoUrl', 'Logo URL (https)'],
    ['address', 'Billing address'],
  ];
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="p-5 lg:col-span-2">
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map(([k, l]) => (
            <Field key={k} label={l}>
              <Input value={form[k] ?? ''} onChange={set(k)} disabled={!editable} />
            </Field>
          ))}
        </div>
        {editable && (
          <div className="mt-5 flex justify-end">
            <Button loading={save.isPending} onClick={() => save.mutate()}>
              Save profile
            </Button>
          </div>
        )}
      </Card>
      <Card className="p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Building2 className="h-4 w-4 text-indigo-500" /> Platform account
        </h3>
        <dl className="grid grid-cols-2 gap-4">
          <Stat label="Status" value={<StatusBadge status={org.status} />} />
          <Stat label="Plan tier" value={label(org.platformLimits.tier)} />
          <Stat label="Recruiter seats" value={`${org.platformLimits.recruitersUsed} / ${org.platformLimits.maxRecruiters}`} />
          <Stat label="Active members" value={org.platformLimits.activeMembers} />
          <Stat label="Workspace ID" value={<span className="font-mono text-xs">{org.slug}</span>} />
          <Stat label="Since" value={fmtDate(org.createdAt)} />
        </dl>
        <p className="mt-4 text-xs text-slate-500">Tier, seats and verification are managed by the Clyptus platform team.</p>
      </Card>
    </div>
  );
}

function WorkflowTab() {
  const qc = useQueryClient();
  const { can } = usePermissions();
  const { data: s, isLoading } = useQuery({ queryKey: qk.settings, queryFn: () => api.get<Settings>('/org/settings') });
  const save = useMutation({
    mutationFn: (patch: Partial<Settings>) => api.patch<Settings>('/org/settings', patch),
    onMutate: async (patch) => {
      const prev = qc.getQueryData<Settings>(qk.settings);
      if (prev) qc.setQueryData(qk.settings, { ...prev, ...patch });
      return { prev };
    },
    onError: (e, _p, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.settings, ctx.prev);
      toast.error(errorMessage(e));
    },
    onSuccess: () => toast.success('Setting saved'),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.settings });
      qc.invalidateQueries({ queryKey: qk.tokens.all });
    },
  });
  const [thresholds, setThresholds] = useState({ low: '', confirm: '' });
  useEffect(() => s && setThresholds({ low: String(s.lowBalanceThreshold), confirm: String(s.tokenConfirmThreshold) }), [s]);
  if (isLoading || !s) return <PageSkeleton />;
  const workflow = can('org.settings.update');
  const toggles: { key: keyof Settings; title: string; text: string; perm: boolean }[] = [
    { key: 'jobApprovalRequired', title: 'Require approval before jobs go live', text: 'Recruiters submit jobs; someone with approve permission publishes them.', perm: workflow },
    { key: 'offerApprovalRequired', title: 'Require approval for offers', text: 'Offers need a second person to approve before they can be sent.', perm: workflow },
    { key: 'rejectReasonRequired', title: 'Require a reason when rejecting', text: 'Keeps rejection decisions explainable and auditable.', perm: workflow },
    { key: 'aiEnabled', title: 'Enable AI features', text: 'Match scores, resume extraction and writing help. AI never makes decisions.', perm: can('ai.govern') },
    { key: 'messageOversight', title: 'Allow message oversight', text: 'Lets members with oversight permission read all candidate conversations.', perm: can('org.security.manage') },
  ];
  return (
    <div className="space-y-6">
      <Card className="divide-y divide-slate-100">
        {toggles.map((t) => (
          <label key={t.key} className={`flex items-start justify-between gap-6 px-5 py-4 ${t.perm ? 'cursor-pointer' : 'opacity-60'}`}>
            <span>
              <span className="block text-sm font-medium text-slate-800">{t.title}</span>
              <span className="block text-xs text-slate-500">{t.text}</span>
            </span>
            <input type="checkbox" className="mt-1 h-4 w-4 rounded border-slate-300" disabled={!t.perm} checked={!!s[t.key]} onChange={(e) => save.mutate({ [t.key]: e.target.checked })} />
          </label>
        ))}
      </Card>
      <Card className="p-5">
        <CardHeader title="Token alerts" />
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field label="Low-balance alert below" hint="Owners are notified when the balance drops under this">
            <Input type="number" min={0} value={thresholds.low} disabled={!workflow} onChange={(e) => setThresholds({ ...thresholds, low: e.target.value })} />
          </Field>
          <Field label="Confirm spends of at least" hint="Ask before any action costing this many tokens">
            <Input type="number" min={0} value={thresholds.confirm} disabled={!workflow} onChange={(e) => setThresholds({ ...thresholds, confirm: e.target.value })} />
          </Field>
          {workflow && (
            <div className="flex items-end">
              <Button onClick={() => save.mutate({ lowBalanceThreshold: Number(thresholds.low), tokenConfirmThreshold: Number(thresholds.confirm) })}>Save thresholds</Button>
            </div>
          )}
        </div>
        <p className="mt-3 text-xs text-slate-400">Last changed {fmtRelative(s.updatedAt)}</p>
      </Card>
    </div>
  );
}

const PROVIDER_LABEL: Record<string, string> = {
  SLACK_WEBHOOK: 'Slack (incoming webhook)',
  MS_TEAMS_WEBHOOK: 'Microsoft Teams (webhook)',
  GOOGLE_CALENDAR: 'Google Calendar',
  CUSTOM_WEBHOOK: 'Custom webhook',
};

function IntegrationsTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: qk.integrations, queryFn: () => api.get<Integration[]>('/org/integrations') });
  const [editing, setEditing] = useState<Integration | null>(null);
  const [labelText, setLabel] = useState('');
  const [secret, setSecret] = useState('');
  const save = useMutation({
    mutationFn: () => api.put<Integration[]>(`/org/integrations/${editing.provider}`, { label: labelText, secret }),
    onSuccess: (res) => {
      qc.setQueryData(qk.integrations, res);
      toast.success('Integration saved — the secret is encrypted and never shown again');
      setEditing(null);
      setSecret('');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const toggle = useMutation({
    mutationFn: (i: Integration) => api.patch<Integration[]>(`/org/integrations/${i.provider}`, { enabled: !i.enabled }),
    onSuccess: (res) => qc.setQueryData(qk.integrations, res),
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (i: Integration) => api.del<Integration[]>(`/org/integrations/${i.provider}`),
    onSuccess: (res) => {
      qc.setQueryData(qk.integrations, res);
      toast.success('Integration removed');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (isLoading || !data) return <PageSkeleton />;
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {data.map((i) => (
          <Card key={i.provider} className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Plug className="h-4 w-4 text-indigo-500" />
                <p className="text-sm font-semibold text-slate-800">{PROVIDER_LABEL[i.provider]}</p>
              </div>
              {i.connected ? <Badge tone={i.enabled ? 'green' : 'gray'}>{i.enabled ? 'Enabled' : 'Paused'}</Badge> : <Badge>Not connected</Badge>}
            </div>
            {i.connected && (
              <p className="mt-2 text-xs text-slate-500">
                {i.label} · secret <span className="font-mono">{i.secret}</span> · updated {fmtRelative(i.updatedAt)}
              </p>
            )}
            <div className="mt-4 flex gap-2">
              <Button
                size="sm"
                variant={i.connected ? 'secondary' : 'primary'}
                icon={KeyRound}
                onClick={() => {
                  setEditing(i);
                  setLabel(i.label ?? PROVIDER_LABEL[i.provider]);
                  setSecret('');
                }}
              >
                {i.connected ? 'Replace secret' : 'Connect'}
              </Button>
              {i.connected && (
                <>
                  <Button size="sm" variant="ghost" onClick={() => toggle.mutate(i)}>
                    {i.enabled ? 'Pause' : 'Enable'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove.mutate(i)}>
                    Remove
                  </Button>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>
      <Sheet
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing ? PROVIDER_LABEL[editing.provider] : ''}
        footer={<Button disabled={!secret.trim() || !labelText.trim()} loading={save.isPending} onClick={() => save.mutate()}>Save</Button>}
      >
        <div className="space-y-4">
          <Field label="Label">
            <Input value={labelText} onChange={(e) => setLabel(e.target.value)} />
          </Field>
          <Field label="Secret / webhook URL" hint="Stored encrypted. Only the last 4 characters are ever shown.">
            <Input type="password" autoComplete="off" value={secret} onChange={(e) => setSecret(e.target.value)} />
          </Field>
        </div>
      </Sheet>
    </>
  );
}

// ---------------- own profile ----------------

export function ProfilePage() {
  const qc = useQueryClient();
  const { data: p, isLoading } = useQuery({
    queryKey: qk.profile,
    queryFn: () => api.get<{ email: string; firstName: string; lastName: string; role: string; title: string | null; timezone: string; joinedAt: string }>('/org/profile'),
  });
  const [form, setForm] = useState({ firstName: '', lastName: '', title: '', timezone: 'UTC' });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  useEffect(() => p && setForm({ firstName: p.firstName, lastName: p.lastName, title: p.title ?? '', timezone: p.timezone }), [p]);
  const zones = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.('timeZone') ?? ['UTC', 'Asia/Kolkata', 'Europe/London', 'America/New_York'];

  const save = useMutation({
    mutationFn: () => api.patch('/org/profile', { ...form, title: form.title || undefined }),
    onSuccess: () => {
      toast.success('Profile saved');
      qc.invalidateQueries({ queryKey: qk.profile });
      qc.invalidateQueries({ queryKey: qk.me });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const change = useMutation({
    mutationFn: () => api.post('/org/profile/password', pw),
    onSuccess: () => {
      toast.success('Password changed — other sessions were signed out');
      setPw({ currentPassword: '', newPassword: '' });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (isLoading || !p) return <PageSkeleton />;
  return (
    <>
      <PageHeader title="Profile & settings" subtitle={`${ROLE_LABEL[p.role]} · ${p.email} · joined ${fmtDate(p.joinedAt)}`} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-800">Personal details</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name">
              <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            </Field>
            <Field label="Last name">
              <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </Field>
            <Field label="Job title">
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </Field>
            <Field label="Timezone">
              <select className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })}>
                {zones.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="mt-5 flex justify-end">
            <Button loading={save.isPending} onClick={() => save.mutate()}>
              Save
            </Button>
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-800">Change password</h3>
          <div className="space-y-4">
            <Field label="Current password">
              <Input type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
            </Field>
            <Field label="New password" hint="10+ characters with letters and numbers">
              <Input type="password" autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} />
            </Field>
          </div>
          <div className="mt-5 flex justify-end">
            <Button disabled={!pw.currentPassword || pw.newPassword.length < 10} loading={change.isPending} onClick={() => change.mutate()}>
              Update password
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}
