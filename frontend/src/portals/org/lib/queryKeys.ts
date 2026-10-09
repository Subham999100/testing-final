// ============================================================
// Organisation portal — the single queryKey factory. Prefix keys
// (e.g. qk.jobs.all) invalidate every list/detail beneath them.
// ============================================================

type P = Record<string, unknown> | undefined;

const k = (...parts: unknown[]) => ['org', ...parts] as const;

export const qk = {
  me: k('me'),
  dashboard: k('dashboard'),
  catalog: k('catalog'),
  members: {
    all: k('members'),
    list: (p?: P) => k('members', 'list', p),
    detail: (id: string) => k('members', 'detail', id),
    options: k('members', 'options'),
  },
  invitations: { all: k('invitations'), list: (p?: P) => k('invitations', 'list', p) },
  jobs: { all: k('jobs'), list: (p?: P) => k('jobs', 'list', p), detail: (id: string) => k('jobs', 'detail', id) },
  pipeline: { all: k('pipeline'), job: (id: string) => k('pipeline', id) },
  candidates: {
    all: k('candidates'),
    list: (p?: P) => k('candidates', 'list', p),
    detail: (id: string) => k('candidates', 'detail', id),
  },
  applications: {
    all: k('applications'),
    list: (p?: P) => k('applications', 'list', p),
    detail: (id: string) => k('applications', 'detail', id),
  },
  interviews: {
    all: k('interviews'),
    list: (p?: P) => k('interviews', 'list', p),
    detail: (id: string) => k('interviews', 'detail', id),
  },
  offers: { all: k('offers'), list: (p?: P) => k('offers', 'list', p), detail: (id: string) => k('offers', 'detail', id) },
  tokens: {
    all: k('tokens'),
    wallet: k('tokens', 'wallet'),
    allocations: k('tokens', 'allocations'),
    ledger: (p?: P) => k('tokens', 'ledger', p),
    myLedger: (p?: P) => k('tokens', 'my-ledger', p),
    usage: k('tokens', 'usage'),
  },
  billing: {
    all: k('billing'),
    plans: k('billing', 'plans'),
    payments: (p?: P) => k('billing', 'payments', p),
    payment: (id: string) => k('billing', 'payment', id),
  },
  ai: { all: k('ai'), runs: (p?: P) => k('ai', 'runs', p) },
  analytics: { all: k('analytics'), team: (p?: P) => k('analytics', 'team', p), jobs: k('analytics', 'jobs') },
  audit: { all: k('audit'), list: (p?: P) => k('audit', 'list', p) },
  security: k('security'),
  notifications: { all: k('notifications'), list: (p?: P) => k('notifications', 'list', p), prefs: k('notifications', 'prefs') },
  tasks: { all: k('tasks'), list: (p?: P) => k('tasks', 'list', p) },
  messages: { all: k('messages'), thread: (id: string) => k('messages', 'thread', id) },
  organisation: k('organisation'),
  settings: k('settings'),
  integrations: k('integrations'),
  profile: k('profile'),
};

/** Stale times: lists 30s, reference data 5–10 min. */
export const STALE = { list: 30_000, detail: 30_000, reference: 5 * 60_000, static: 10 * 60_000 };
