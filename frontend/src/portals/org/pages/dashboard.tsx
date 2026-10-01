// ============================================================
// Organisation portal — role-aware dashboard. The API scopes every
// number to what the viewer may see, so one page serves all roles.
// ============================================================

import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  Briefcase,
  CalendarClock,
  ClipboardCheck,
  Coins,
  FileSignature,
  Plus,
  UserPlus,
  UserSearch,
  Users,
  Trophy,
} from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../lib/api';
import { fmtNum, fmtRelative, label } from '../lib/format';
import { qk, STALE } from '../lib/queryKeys';
import { usePermissions } from '../lib/session';
import { Button, Card, CardHeader, EmptyState, KpiCard, PageHeader, PageSkeleton } from '../ui/ui';

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

const FUNNEL_COLORS = ['#6366f1', '#818cf8', '#8b5cf6', '#f59e0b', '#06b6d4', '#10b981', '#f43f5e'];

export function DashboardPage() {
  const { me, can, role } = usePermissions();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: qk.dashboard, queryFn: () => api.get<Dashboard>('/org/dashboard'), staleTime: STALE.list });

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
            {can('invitations.manage') && (
              <Link to="/org/invitations?new=1">
                <Button variant="secondary" icon={UserPlus}>
                  Invite
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
        {(can('jobs.read.all', 'jobs.read.assigned')) && (
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
