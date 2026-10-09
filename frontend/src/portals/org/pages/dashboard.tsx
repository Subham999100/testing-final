// ============================================================
// Organisation portal — role-aware dashboard.
// Organisation Super Admin: governance, recruiter oversight, credits,
// roles/permissions, analytics, audit, and settings.
// Recruiter / Org Admin: recruitment workflow and candidate pipeline.
// ============================================================

import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Briefcase,
  Building2,
  CalendarClock,
  ClipboardCheck,
  Coins,
  CreditCard,
  FileSignature,
  LifeBuoy,
  Plus,
  ShieldCheck,
  UserPlus,
  UserSearch,
  Users,
  Trophy,
} from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../lib/api';
import { fmtNum, fmtRelative, label } from '../lib/format';
import { qk, STALE } from '../lib/queryKeys';
import { usePermissions, useWallet } from '../lib/session';
import { Button, Card, CardHeader, EmptyState, KpiCard, PageHeader, PageSkeleton, Stat } from '../ui/ui';

interface Dashboard {
  jobs: Record<string, number>;
  funnel: { stage: string; count: number }[];
  applicationsTotal: number;
  interviews: { upcoming: number; feedbackDue: number };
  offers: Record<string, number>;
  hires: number;
  members: { orgAdmins: number; recruiters: number; suspended: number } | null;
  tokens: { balance: number; spendable: number; allocatedToMembers: number; myAllocation: { remaining: number } | null } | null;
  openTasks: number;
  alerts: { kind: string; count: number; label: string; link: string }[];
  recentActivity: { id: string; action: string; entityType: string; createdAt: string; actor: string }[];
}

interface TeamStats {
  range: { from: string | null; to: string | null };
  members: { userId: string; name: string; role: string; jobsCreated: number; stageMoves: number; interviewsScheduled: number; offersCreated: number; hires: number }[];
}

interface RecruiterUsage {
  limit: number;
  used: number;
  available: number;
}

const FUNNEL_COLORS = ['#6366f1', '#818cf8', '#8b5cf6', '#f59e0b', '#06b6d4', '#10b981', '#f43f5e'];

// ---------------- Organisation Super Admin Dashboard (Governance Focused) ----------------

function OrgSuperAdminDashboard({ data }: { data: Dashboard }) {
  const { me } = usePermissions();
  const { data: wallet } = useWallet();

  const { data: usage } = useQuery<RecruiterUsage>({
    queryKey: ['org', 'recruiters', 'usage'],
    queryFn: () => api.get<RecruiterUsage>('/org/recruiters/usage'),
    staleTime: STALE.list,
  });

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const teamAnalytics = useQuery({
    queryKey: qk.analytics.team({ days: '30' }),
    queryFn: () => api.get<TeamStats>('/org/analytics/team', { from: thirtyDaysAgo }),
    staleTime: STALE.list,
  });

  const recruiterLimit = usage?.limit ?? 25;
  const recruitersUsed = usage?.used ?? data.members?.recruiters ?? 0;
  const recruitersAvailable = usage?.available ?? Math.max(0, recruiterLimit - recruitersUsed);
  const isLimitReached = recruitersAvailable <= 0;

  const totalCredits = wallet?.balance ?? data.tokens?.balance ?? 0;
  const unallocatedCredits = wallet?.unallocated ?? 0;
  const allocatedCredits = wallet?.allocatedToMembers ?? data.tokens?.allocatedToMembers ?? 0;
  const consumedCredits = wallet?.consumed ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${me?.user.firstName}`}
        subtitle={`Governance, resource allocation, and recruiter oversight for ${me?.organisation.name}.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/org/recruiters">
              <Button icon={Users}>Manage Recruiters</Button>
            </Link>
            <Link to="/org/credits-allocation">
              <Button variant="secondary" icon={Coins}>
                Credits Allocation
              </Button>
            </Link>
            <Link to="/org/roles-permissions">
              <Button variant="secondary" icon={ShieldCheck}>
                Roles & Permissions
              </Button>
            </Link>
          </div>
        }
      />

      {data.alerts.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {data.alerts.map((a) => (
            <Link key={a.kind} to={a.link} className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 hover:bg-amber-100">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                <b>{a.count}</b> {a.label}
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* Primary Governance KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Active Recruiters"
          value={fmtNum(recruitersUsed)}
          hint={`${recruitersAvailable} seats available · limit ${recruiterLimit}`}
          icon={Users}
          tone="sky"
          to="/org/recruiters"
        />
        <KpiCard
          label="Available Organisation Credits"
          value={fmtNum(totalCredits)}
          hint={`${fmtNum(unallocatedCredits)} unallocated · ${fmtNum(allocatedCredits)} allocated`}
          icon={Coins}
          tone="amber"
          to="/org/credits-allocation"
        />
        <KpiCard
          label="Total Credits Consumed"
          value={fmtNum(consumedCredits)}
          hint={wallet ? `Lifetime received: ${fmtNum(wallet.lifetimeReceived)}` : undefined}
          icon={CreditCard}
          tone="violet"
          to="/org/credits-allocation"
        />
        <KpiCard
          label="Audit Log Entries"
          value={fmtNum(data.recentActivity.length)}
          hint="Recent privileged events"
          icon={Activity}
          tone="emerald"
          to="/org/audit"
        />
      </div>

      {/* Recruiter Management & Credit Breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-semibold text-slate-800">Recruiter Capacity & Governance</h3>
              <p className="text-xs text-slate-500">Seat limits, provisioning, and access controls</p>
            </div>
            <Link to="/org/recruiters" className="text-xs font-medium text-indigo-600 hover:underline">
              Manage Recruiters
            </Link>
          </div>
          <div className="mt-4 space-y-4">
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs text-slate-600">
                <span>
                  Recruiter Seats: <b>{recruitersUsed}</b> of <b>{recruiterLimit}</b>
                </span>
                <span className="font-mono font-semibold">
                  {Math.round((recruitersUsed / recruiterLimit) * 100)}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    isLimitReached ? 'bg-rose-500' : recruitersUsed / recruiterLimit > 0.8 ? 'bg-amber-500' : 'bg-blue-600'
                  }`}
                  style={{ width: `${Math.min(100, Math.round((recruitersUsed / recruiterLimit) * 100))}%` }}
                />
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-xs sm:grid-cols-4">
              <Stat label="Recruiters Used" value={recruitersUsed} />
              <Stat label="Available Seats" value={recruitersAvailable} />
              <Stat label="Organisation Admins" value={data.members?.orgAdmins ?? 0} />
              <Stat label="Suspended Members" value={data.members?.suspended ?? 0} />
            </dl>
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <Link to="/org/recruiters">
                <Button size="sm" variant="secondary" icon={UserPlus}>
                  Recruiter Accounts
                </Button>
              </Link>
              <Link to="/org/roles-permissions">
                <Button size="sm" variant="secondary" icon={ShieldCheck}>
                  Role Boundaries
                </Button>
              </Link>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-semibold text-slate-800">Credit Allocation & Ledger</h3>
              <p className="text-xs text-slate-500">Organisation balance, team allocations, and consumption</p>
            </div>
            <Link to="/org/credits-allocation" className="text-xs font-medium text-indigo-600 hover:underline">
              Adjust Allocations
            </Link>
          </div>
          <div className="mt-4 space-y-4">
            <dl className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
              <Stat label="Total Pool" value={fmtNum(totalCredits)} />
              <Stat label="Unallocated" value={fmtNum(unallocatedCredits)} />
              <Stat label="Allocated to Members" value={fmtNum(allocatedCredits)} />
              <Stat label="Consumed" value={fmtNum(consumedCredits)} />
            </dl>
            <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
              <p className="font-medium text-slate-800 mb-1">Resource Governance Notice</p>
              <p>
                Credits pay for publishing jobs, unlocking resumes, and candidate verification. Unallocated credits can be distributed to active recruiters.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <Link to="/org/credits-allocation">
                <Button size="sm" variant="secondary" icon={Coins}>
                  Credits Allocation
                </Button>
              </Link>
              <Link to="/org/billing">
                <Button size="sm" variant="secondary" icon={CreditCard}>
                  Billing & Token Purchases
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>

      {/* Recruitment Analytics & Recent Audit Activity */}
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader
            title="Recruitment Analytics"
            subtitle="Organisation-level hiring metrics across recruiters (last 30 days)"
            action={
              <Link to="/org/analytics" className="text-xs font-medium text-indigo-600 hover:underline">
                View Full Analytics
              </Link>
            }
          />
          <div className="h-72 p-4">
            {teamAnalytics.isLoading ? (
              <PageSkeleton />
            ) : !teamAnalytics.data?.members.length ? (
              <EmptyState
                icon={BarChart3}
                title="No recruitment activity recorded"
                text="Activity will appear here once recruiters move candidates or schedule interviews."
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={teamAnalytics.data.members}>
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

        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent Audit Activity"
            subtitle="Privileged operations"
            action={
              <Link to="/org/audit" className="text-xs font-medium text-indigo-600 hover:underline">
                View all
              </Link>
            }
          />
          {data.recentActivity.length ? (
            <ul className="divide-y divide-slate-100">
              {data.recentActivity.map((a) => (
                <li key={a.id} className="px-5 py-3 text-sm">
                  <p className="text-slate-700">
                    <span className="font-medium text-slate-900">{a.actor}</span> · {label(a.action)}
                  </p>
                  <p className="text-xs text-slate-400">{fmtRelative(a.createdAt)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No recent activity logged" />
          )}
        </Card>
      </div>

      {/* Governance & Administration Shortcuts */}
      <Card className="p-5">
        <h3 className="font-semibold text-slate-800 mb-1">Administration & Support Shortcuts</h3>
        <p className="text-xs text-slate-500 mb-4">Quick access to organisation governance and communication</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            to="/org/organisation"
            className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 hover:border-slate-300 hover:bg-slate-50 transition-colors"
          >
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800">Organisation Settings</p>
              <p className="text-[11px] text-slate-500 truncate">Profile & workflow rules</p>
            </div>
          </Link>
          <Link
            to="/org/roles-permissions"
            className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 hover:border-slate-300 hover:bg-slate-50 transition-colors"
          >
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800">Roles & Permissions</p>
              <p className="text-[11px] text-slate-500 truncate">Role boundaries & privileges</p>
            </div>
          </Link>
          <Link
            to="/org/billing"
            className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 hover:border-slate-300 hover:bg-slate-50 transition-colors"
          >
            <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
              <CreditCard className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800">Billing & Purchases</p>
              <p className="text-[11px] text-slate-500 truncate">Credit top-ups & invoices</p>
            </div>
          </Link>
          <Link
            to="/org/support"
            className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 hover:border-slate-300 hover:bg-slate-50 transition-colors"
          >
            <div className="rounded-lg bg-sky-50 p-2 text-sky-600">
              <LifeBuoy className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800">Support</p>
              <p className="text-[11px] text-slate-500 truncate">Platform support tickets</p>
            </div>
          </Link>
        </div>
      </Card>
    </div>
  );
}

// ---------------- Recruiter & Team Member Dashboard ----------------

function RecruiterDashboard({ data }: { data: Dashboard }) {
  const { me, can, role } = usePermissions();
  const activeJobs = (data.jobs.PUBLISHED ?? 0) + (data.jobs.PAUSED ?? 0);
  const openOffers = (data.offers.PENDING_APPROVAL ?? 0) + (data.offers.APPROVED ?? 0) + (data.offers.SENT ?? 0);
  const shortlisted = data.funnel.find((f) => f.stage === 'SHORTLISTED')?.count ?? 0;
  const isRecruiter = role === 'RECRUITER';

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${me?.user.firstName}`}
        subtitle={isRecruiter ? 'Here is what needs your attention today.' : `Overview of hiring at ${me?.organisation.name}.`}
        actions={
          <>
            {can('jobs.create') && (
              <Link to="/org/jobs/new">
                <Button icon={Plus}>New job</Button>
              </Link>
            )}
            {can('candidates.save') && (
              <Link to="/org/candidates?new=1">
                <Button variant="secondary" icon={UserSearch}>
                  Add candidate
                </Button>
              </Link>
            )}
            {can('members.read') && (
              <Link to="/org/members">
                <Button variant="secondary" icon={UserPlus}>
                  Team
                </Button>
              </Link>
            )}
          </>
        }
      />

      {data.alerts.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {data.alerts.map((a) => (
            <Link key={a.kind} to={a.link} className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 hover:bg-amber-100">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                <b>{a.count}</b> {a.label}
              </span>
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {can('jobs.read.all', 'jobs.read.assigned') && (
          <KpiCard label={isRecruiter ? 'My active jobs' : 'Active jobs'} value={fmtNum(activeJobs)} hint={`${data.jobs.DRAFT ?? 0} drafts · ${data.jobs.IN_REVIEW ?? 0} in review`} icon={Briefcase} to="/org/jobs" />
        )}
        {can('applications.read.all', 'applications.read.assigned') && (
          <KpiCard label="Applications" value={fmtNum(data.applicationsTotal)} hint={`${shortlisted} shortlisted`} icon={ClipboardCheck} tone="violet" to="/org/applications" />
        )}
        {can('interviews.read') && (
          <KpiCard label="Interviews (7 days)" value={fmtNum(data.interviews.upcoming)} hint={`${data.interviews.feedbackDue} scorecards due from you`} icon={CalendarClock} tone="amber" to="/org/interviews" />
        )}
        {can('offers.read') && (
          <KpiCard label="Hires" value={fmtNum(data.hires)} hint={`${openOffers} open offers`} icon={Trophy} tone="emerald" to="/org/offers" />
        )}
        {data.members && (
          <KpiCard label="Team" value={fmtNum(data.members.recruiters + data.members.orgAdmins)} hint={`${data.members.orgAdmins} admins · ${data.members.recruiters} recruiters`} icon={Users} tone="sky" to="/org/members" />
        )}
        {data.tokens && (
          <KpiCard
            label={data.tokens.myAllocation ? 'My tokens' : 'Token balance'}
            value={fmtNum(data.tokens.myAllocation ? data.tokens.myAllocation.remaining : data.tokens.balance)}
            hint={data.tokens.myAllocation ? `Org balance ${fmtNum(data.tokens.balance)}` : `${fmtNum(data.tokens.allocatedToMembers)} allocated to members`}
            icon={Coins}
            tone="amber"
            to="/org/tokens"
          />
        )}
        {can('offers.read') && (
          <KpiCard label="Offers in progress" value={fmtNum(openOffers)} hint={`${data.offers.PENDING_APPROVAL ?? 0} awaiting approval`} icon={FileSignature} tone="rose" to="/org/offers" />
        )}
        {can('tasks.use') && <KpiCard label="Open tasks" value={fmtNum(data.openTasks)} icon={ClipboardCheck} tone="indigo" to="/org/tasks" />}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Hiring funnel" subtitle={isRecruiter ? 'Applications on your jobs' : 'All applications'} />
          <div className="h-72 p-4">
            {data.applicationsTotal === 0 ? (
              <EmptyState title="No applications yet" text="Add candidates to a published job to see the funnel." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.funnel.map((f) => ({ ...f, name: label(f.stage) }))} layout="vertical" margin={{ left: 20 }}>
                  <XAxis type="number" allowDecimals={false} stroke="#94a3b8" fontSize={11} />
                  <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={12} width={90} />
                  <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0', fontSize: 12 }} />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {data.funnel.map((_, i) => (
                      <Cell key={i} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent activity"
            action={
              can('audit.read.org', 'audit.read.self') && (
                <Link to="/org/audit" className="text-xs font-medium text-indigo-600 hover:underline">
                  View all
                </Link>
              )
            }
          />
          {data.recentActivity.length ? (
            <ul className="divide-y divide-slate-100">
              {data.recentActivity.map((a) => (
                <li key={a.id} className="px-5 py-2.5 text-sm">
                  <p className="text-slate-700">
                    <span className="font-medium">{a.actor}</span> · {label(a.action)}
                  </p>
                  <p className="text-xs text-slate-400">{fmtRelative(a.createdAt)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No activity yet" />
          )}
        </Card>
      </div>
    </div>
  );
}

// ---------------- Main Export ----------------

export function DashboardPage() {
  const { role } = usePermissions();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: qk.dashboard,
    queryFn: () => api.get<Dashboard>('/org/dashboard'),
    staleTime: STALE.list,
  });

  if (isError) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="The dashboard could not load"
        text="Check your connection and try again."
        action={<Button variant="secondary" onClick={() => refetch()}>Retry</Button>}
      />
    );
  }
  if (isLoading || !data) return <PageSkeleton />;

  if (role === 'ORGANISATION_SUPER_ADMIN') {
    return <OrgSuperAdminDashboard data={data} />;
  }

  return <RecruiterDashboard data={data} />;
}
