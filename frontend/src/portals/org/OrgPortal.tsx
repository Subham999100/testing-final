// ============================================================
// Organisation portal — routes. Mounted at /org/* by the app router.
// Every section is lazy-loaded; each route is wrapped in a
// permission check (UI only — the API enforces the same rules).
// ============================================================

import { AlertTriangle, ShieldOff } from 'lucide-react';
import React, { Suspense, lazy } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import './org.css';
import { OrgShell } from './layout/OrgShell';
import { loaders } from './layout/nav';
import { OrgRole } from './lib/api';
import { usePermissions } from './lib/session';
import { AcceptInvitePage, ChangePasswordPage, LoginPage } from './pages/auth';
import { Button, EmptyState, PageSkeleton } from './ui/ui';

type Loader = () => Promise<Record<string, unknown>>;
const page = (loader: Loader, name: string) =>
  lazy(() => loader().then((m) => ({ default: m[name] as React.ComponentType })));

const Dashboard = page(loaders.dashboard, 'DashboardPage');
const RecruiterDashboard = page(loaders.recruiterDashboard, 'DashboardPage');
const RecruiterCandidates = page(loaders.recruiterCandidates, 'CandidatesPage');
const RecruiterCandidateDetail = page(loaders.recruiterCandidates, 'CandidateDetailPage');
const Folders = page(loaders.folders, 'FoldersPage');
const Reports = page(loaders.reports, 'ReportsPage');
const ScheduleInterview = page(loaders.recruitmentActions, 'ScheduleInterviewPage');
const NewOffer = page(loaders.recruitmentActions, 'NewOfferPage');
const Members = page(loaders.team, 'MembersPage');
const Recruiters = page(loaders.team, 'RecruitersPage');
const RolesPermissions = page(loaders.team, 'RolesPermissionsPage');
const MemberDetail = page(loaders.team, 'MemberDetailPage');
const Jobs = page(loaders.jobs, 'JobsPage');
const JobForm = page(loaders.jobs, 'JobFormPage');
const JobDetail = page(loaders.jobs, 'JobDetailPage');
const Pipeline = page(loaders.pipeline, 'PipelinePage');
const Candidates = page(loaders.candidates, 'CandidatesPage');
const CandidateDetail = page(loaders.candidates, 'CandidateDetailPage');
const Applications = page(loaders.applications, 'ApplicationsPage');
const ApplicationDetail = page(loaders.applications, 'ApplicationDetailPage');
const Interviews = page(loaders.interviews, 'InterviewsPage');
const InterviewDetail = page(loaders.interviews, 'InterviewDetailPage');
const Offers = page(loaders.offers, 'OffersPage');
const OfferDetail = page(loaders.offers, 'OfferDetailPage');
const Tokens = page(loaders.tokens, 'TokensPage');
const Billing = page(loaders.tokens, 'BillingPage');
const Invoice = page(loaders.tokens, 'InvoicePage');
const Analytics = page(loaders.insights, 'AnalyticsPage');
const Ai = page(loaders.insights, 'AiPage');
const Audit = page(loaders.insights, 'AuditPage');
const Security = page(loaders.insights, 'SecurityPage');
const Messages = page(loaders.engagement, 'MessagesPage');
const Notifications = page(loaders.engagement, 'NotificationsPage');
const Tasks = page(loaders.engagement, 'TasksPage');
const Organisation = page(loaders.settings, 'OrganisationPage');
const Profile = page(loaders.settings, 'ProfilePage');
const Support = page(loaders.support, 'SupportPage');

function Forbidden() {
  return (
    <EmptyState
      icon={ShieldOff}
      title="You don't have access to this page"
      text="Ask an administrator in your organisation if you need this permission."
      action={
        <Link to="/org">
          <Button variant="secondary">Back to dashboard</Button>
        </Link>
      }
    />
  );
}

// Keeps a crash inside one page instead of blanking the whole shell; resets on navigation (keyed by path).
class PageBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <EmptyState
        icon={AlertTriangle}
        title="This page failed to load"
        text="Try again. If it keeps happening, tell your administrator."
        action={<Button variant="secondary" onClick={() => this.setState({ failed: false })}>Try again</Button>}
      />
    );
  }
}

function Guard({
  perms,
  disallowedRoles,
  children,
}: {
  perms?: string[];
  disallowedRoles?: OrgRole[];
  children: React.ReactNode;
}) {
  const { me, can, role } = usePermissions();
  const { pathname } = useLocation();
  if (!me) return <PageSkeleton />;
  if (disallowedRoles && role && disallowedRoles.includes(role)) return <Forbidden />;
  if (perms && !can(...perms)) return <Forbidden />;
  return (
    <PageBoundary key={pathname}>
      <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
    </PageBoundary>
  );
}

function MembersRoute() {
  const { role } = usePermissions();
  if (role === 'ORGANISATION_SUPER_ADMIN') {
    return <Navigate to="/org/recruiters" replace />;
  }
  return <Members />;
}

function DashboardRoute() {
  const { role } = usePermissions();
  return role === 'RECRUITER' ? <RecruiterDashboard /> : <Dashboard />;
}

function CandidatesRoute() {
  const { role } = usePermissions();
  return role === 'RECRUITER' ? <RecruiterCandidates /> : <Candidates />;
}

function CandidateDetailRoute() {
  const { role } = usePermissions();
  return role === 'RECRUITER' ? <RecruiterCandidateDetail /> : <CandidateDetail />;
}

const P = {
  jobs: ['jobs.read.all', 'jobs.read.assigned'],
  apps: ['applications.read.all', 'applications.read.assigned'],
  cands: ['candidates.read', 'candidates.search'],
};

const NO_OSA: OrgRole[] = ['ORGANISATION_SUPER_ADMIN'];

export default function OrgPortal() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route path="accept-invite" element={<AcceptInvitePage />} />
      <Route path="change-password" element={<ChangePasswordPage />} />
      <Route element={<OrgShell />}>
        <Route index element={<Guard><DashboardRoute /></Guard>} />

        {/* Governance & People */}
        <Route path="recruiters" element={<Guard perms={['members.read', 'recruiters.manage']}><Recruiters /></Guard>} />
        <Route path="recruiters/:id" element={<Guard perms={['members.read']}><MemberDetail /></Guard>} />
        <Route path="roles-permissions" element={<Guard perms={['members.read', 'recruiters.permissions.manage']}><RolesPermissions /></Guard>} />
        <Route path="members" element={<Guard perms={['members.read']}><MembersRoute /></Guard>} />
        <Route path="members/:id" element={<Guard perms={['members.read']}><MemberDetail /></Guard>} />

        {/* Tokens & Billing */}
        <Route path="credits-allocation" element={<Guard perms={['tokens.read']}><Tokens /></Guard>} />
        <Route path="tokens" element={<Guard perms={['tokens.read']}><Tokens /></Guard>} />
        <Route path="billing" element={<Guard perms={['billing.read', 'tokens.purchase']}><Billing /></Guard>} />
        <Route path="billing/:id" element={<Guard perms={['billing.read', 'tokens.purchase']}><Invoice /></Guard>} />
        <Route path="analytics" element={<Guard perms={['analytics.org', 'analytics.recruiter', 'analytics.self']}><Analytics /></Guard>} />

        {/* Audit */}
        <Route path="audit" element={<Guard perms={['audit.read.org', 'audit.read.self']}><Audit /></Guard>} />

        {/* Administration */}
        <Route path="organisation" element={<Guard perms={['org.profile.read']}><Organisation /></Guard>} />
        <Route path="settings" element={<Navigate to="/org/organisation" replace />} />

        {/* Help & Profile */}
        <Route path="support" element={<Guard perms={['support.read']}><Support /></Guard>} />
        <Route path="notifications" element={<Guard><Notifications /></Guard>} />
        <Route path="profile" element={<Guard><Profile /></Guard>} />

        {/* Recruiter Workspace routes; prevent the Super Admin entering the recruiter UI. */}
        <Route path="folders" element={<Guard perms={['candidates.save']} disallowedRoles={NO_OSA}><Folders /></Guard>} />
        <Route path="reports" element={<Guard perms={['analytics.self', 'analytics.recruiter', 'analytics.org']} disallowedRoles={NO_OSA}><Reports /></Guard>} />
        <Route path="interviews/new" element={<Guard perms={['interviews.schedule']} disallowedRoles={NO_OSA}><Guard perms={P.apps}><ScheduleInterview /></Guard></Guard>} />
        <Route path="offers/new" element={<Guard perms={['offers.create']} disallowedRoles={NO_OSA}><Guard perms={P.apps}><NewOffer /></Guard></Guard>} />

        {/* Recruiter Workflow Routes (Disallowed for Organisation Super Admin) */}
        <Route path="jobs" element={<Guard perms={P.jobs} disallowedRoles={NO_OSA}><Jobs /></Guard>} />
        <Route path="jobs/new" element={<Guard perms={['jobs.create']} disallowedRoles={NO_OSA}><JobForm /></Guard>} />
        <Route path="jobs/:id" element={<Guard perms={P.jobs} disallowedRoles={NO_OSA}><JobDetail /></Guard>} />
        <Route path="jobs/:id/edit" element={<Guard perms={['jobs.update']} disallowedRoles={NO_OSA}><JobForm /></Guard>} />
        <Route path="jobs/:id/pipeline" element={<Guard perms={P.apps} disallowedRoles={NO_OSA}><Pipeline /></Guard>} />
        <Route path="candidates" element={<Guard perms={P.cands} disallowedRoles={NO_OSA}><CandidatesRoute /></Guard>} />
        <Route path="candidates/:id" element={<Guard perms={['candidates.read']} disallowedRoles={NO_OSA}><CandidateDetailRoute /></Guard>} />
        <Route path="applications" element={<Guard perms={P.apps} disallowedRoles={NO_OSA}><Applications /></Guard>} />
        <Route path="applications/:id" element={<Guard perms={P.apps} disallowedRoles={NO_OSA}><ApplicationDetail /></Guard>} />
        <Route path="interviews" element={<Guard perms={['interviews.read']} disallowedRoles={NO_OSA}><Interviews /></Guard>} />
        <Route path="interviews/:id" element={<Guard perms={['interviews.read']} disallowedRoles={NO_OSA}><InterviewDetail /></Guard>} />
        <Route path="offers" element={<Guard perms={['offers.read']} disallowedRoles={NO_OSA}><Offers /></Guard>} />
        <Route path="offers/:id" element={<Guard perms={['offers.read']} disallowedRoles={NO_OSA}><OfferDetail /></Guard>} />
        <Route path="messages" element={<Guard perms={['messages.use', 'messages.oversee']} disallowedRoles={NO_OSA}><Messages /></Guard>} />
        <Route path="tasks" element={<Guard perms={['tasks.use']} disallowedRoles={NO_OSA}><Tasks /></Guard>} />
        <Route path="ai" element={<Guard perms={['ai.use', 'ai.govern']} disallowedRoles={NO_OSA}><Ai /></Guard>} />
        <Route path="security" element={<Guard perms={['org.security.manage']} disallowedRoles={NO_OSA}><Security /></Guard>} />

        <Route path="*" element={<Navigate to="/org" replace />} />
      </Route>
    </Routes>
  );
}
