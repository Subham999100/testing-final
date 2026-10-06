// ============================================================
// Organisation portal — single navigation source. The sidebar and
// the route guards are both derived from this config, filtered by
// the permissions returned from /org/auth/me.
// ============================================================

import {
  Activity,
  BarChart3,
  Briefcase,
  Building2,
  CalendarClock,
  ClipboardCheck,
  Coins,
  CreditCard,
  FileSignature,
  KanbanSquare,
  LayoutDashboard,
  Mail,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Users,
  UserSearch,
  LifeBuoy,
} from 'lucide-react';

/** Lazy page chunks — shared by React.lazy and sidebar hover prefetch. */
export const loaders = {
  dashboard: () => import('../pages/dashboard'),
  team: () => import('../pages/team'),
  jobs: () => import('../pages/jobs'),
  pipeline: () => import('../pages/pipeline'),
  candidates: () => import('../pages/candidates'),
  applications: () => import('../pages/applications'),
  interviews: () => import('../pages/interviews'),
  offers: () => import('../pages/offers'),
  tokens: () => import('../pages/tokens'),
  insights: () => import('../pages/insights'),
  engagement: () => import('../pages/engagement'),
  settings: () => import('../pages/settings'),
  support: () => import('../pages/support'),
};

export type Chunk = keyof typeof loaders;

export interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  perms?: string[]; // visible when the member holds ANY of these
  chunk: Chunk;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const ORG_SUPER_ADMIN_NAV: NavSection[] = [
  {
    title: 'Governance & People',
    items: [
      { label: 'Dashboard', path: '/org', icon: LayoutDashboard, chunk: 'dashboard' },
      { label: 'Recruiters', path: '/org/recruiters', icon: Users, perms: ['members.read', 'recruiters.manage'], chunk: 'team' },
      { label: 'Roles & Permissions', path: '/org/roles-permissions', icon: ShieldCheck, perms: ['members.read', 'recruiters.permissions.manage'], chunk: 'team' },
    ],
  },
  {
    title: 'Tokens & Billing',
    items: [
      { label: 'Credits Allocation', path: '/org/credits-allocation', icon: Coins, perms: ['tokens.read', 'tokens.allocate'], chunk: 'tokens' },
      { label: 'Billing & Token Purchases', path: '/org/billing', icon: CreditCard, perms: ['billing.read', 'tokens.purchase'], chunk: 'tokens' },
      { label: 'Recruitment Analytics', path: '/org/analytics', icon: BarChart3, perms: ['analytics.org', 'analytics.recruiter'], chunk: 'insights' },
    ],
  },
  {
    title: 'Audit',
    items: [
      { label: 'Audit Logs', path: '/org/audit', icon: Activity, perms: ['audit.read.org', 'audit.read.self'], chunk: 'insights' },
    ],
  },
  {
    title: 'Administration',
    items: [
      { label: 'Organisation Settings', path: '/org/organisation', icon: Building2, perms: ['org.profile.read'], chunk: 'settings' },
    ],
  },
  {
    title: 'Help',
    items: [
      { label: 'Support', path: '/org/support', icon: LifeBuoy, perms: ['support.read'], chunk: 'support' },
    ],
  },
];

export function getNav(role?: string): NavSection[] {
  if (role === 'ORGANISATION_SUPER_ADMIN') {
    return ORG_SUPER_ADMIN_NAV;
  }
  return NAV;
}

export const NAV: NavSection[] = [
  {
    title: 'Hiring',
    items: [
      { label: 'Dashboard', path: '/org', icon: LayoutDashboard, chunk: 'dashboard' },
      { label: 'Jobs', path: '/org/jobs', icon: Briefcase, perms: ['jobs.read.all', 'jobs.read.assigned'], chunk: 'jobs' },
      { label: 'Candidates', path: '/org/candidates', icon: UserSearch, perms: ['candidates.read', 'candidates.search'], chunk: 'candidates' },
      { label: 'Applications', path: '/org/applications', icon: KanbanSquare, perms: ['applications.read.all', 'applications.read.assigned'], chunk: 'applications' },
      { label: 'Interviews', path: '/org/interviews', icon: CalendarClock, perms: ['interviews.read'], chunk: 'interviews' },
      { label: 'Offers', path: '/org/offers', icon: FileSignature, perms: ['offers.read'], chunk: 'offers' },
      { label: 'Messages', path: '/org/messages', icon: MessageSquare, perms: ['messages.use', 'messages.oversee'], chunk: 'engagement' },
      { label: 'Tasks', path: '/org/tasks', icon: ClipboardCheck, perms: ['tasks.use'], chunk: 'engagement' },
    ],
  },
  {
    title: 'Team',
    items: [
      { label: 'Members', path: '/org/members', icon: Users, perms: ['members.read'], chunk: 'team' },
    ],
  },
  {
    title: 'Tokens & billing',
    items: [
      { label: 'Tokens', path: '/org/tokens', icon: Coins, perms: ['tokens.read'], chunk: 'tokens' },
      { label: 'Billing', path: '/org/billing', icon: CreditCard, perms: ['billing.read', 'tokens.purchase'], chunk: 'tokens' },
    ],
  },
  {
    title: 'Insights',
    items: [
      { label: 'Analytics', path: '/org/analytics', icon: BarChart3, perms: ['analytics.org', 'analytics.recruiter', 'analytics.self'], chunk: 'insights' },
      { label: 'AI tools', path: '/org/ai', icon: Sparkles, perms: ['ai.use', 'ai.govern'], chunk: 'insights' },
      { label: 'Audit log', path: '/org/audit', icon: Activity, perms: ['audit.read.org', 'audit.read.self'], chunk: 'insights' },
    ],
  },
  {
    title: 'Administration',
    items: [
      { label: 'Security', path: '/org/security', icon: ShieldCheck, perms: ['org.security.manage'], chunk: 'insights' },
      { label: 'Organisation', path: '/org/organisation', icon: Building2, perms: ['org.profile.read'], chunk: 'settings' },
    ],
  },
  {
    title: 'Help',
    items: [
      { label: 'Support', path: '/org/support', icon: LifeBuoy, perms: ['support.read'], chunk: 'support' },
    ],
  },
];

