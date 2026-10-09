// ============================================================
// Organisation portal — messages, notifications (with preferences &
// announcements) and tasks (optimistic complete).
// ============================================================

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, ClipboardCheck, Megaphone, MessageSquare, Plus, Send, Trash2 } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, errorMessage, Page } from '../lib/api';
import { fmtDate, fmtDateTime, fmtRelative, label } from '../lib/format';
import { qk, STALE } from '../lib/queryKeys';
import { usePermissions } from '../lib/session';
import { toast } from '../ui/toast';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  FilterChips,
  Input,
  PageHeader,
  PageSkeleton,
  Pagination,
  Select,
  Sheet,
  Textarea,
  cn,
} from '../ui/ui';

// ---------------- messages ----------------

interface Conversation {
  candidate: { id: string; name: string; headline: string | null };
  lastMessage: string;
  lastAt: string;
  count: number;
}

interface Thread {
  candidate: { id: string; name: string; headline: string | null };
  messages: { id: string; subject: string | null; body: string; sender: string; mine: boolean; createdAt: string }[];
}

export function MessagesPage() {
  const qc = useQueryClient();
  const { can } = usePermissions();
  const [params, setParams] = useSearchParams();
  const active = params.get('candidate');
  const [body, setBody] = useState('');
  const bottom = useRef<HTMLDivElement>(null);
  const list = useQuery({ queryKey: qk.messages.all, queryFn: () => api.get<{ oversight: boolean; conversations: Conversation[] }>('/org/messages'), staleTime: STALE.list });
  const thread = useQuery({ queryKey: qk.messages.thread(active ?? ''), queryFn: () => api.get<Thread>(`/org/messages/${active}`), enabled: !!active });
  useEffect(() => bottom.current?.scrollIntoView({ behavior: 'smooth' }), [thread.data?.messages.length]);

  const send = useMutation({
    mutationFn: () => api.post(`/org/messages/${active}`, { body }),
    onMutate: async () => {
      const key = qk.messages.thread(active);
      const prev = qc.getQueryData<Thread>(key);
      if (prev) qc.setQueryData<Thread>(key, { ...prev, messages: [...prev.messages, { id: `tmp-${Date.now()}`, subject: null, body, sender: 'You', mine: true, createdAt: new Date().toISOString() }] });
      setBody('');
      return { prev, body };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.messages.thread(active), ctx.prev);
      setBody(ctx?.body ?? '');
      toast.error(errorMessage(e));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.messages.all }),
  });

  return (
    <>
      <PageHeader title="Messages" subtitle={list.data?.oversight ? 'Oversight is on — you can see all candidate conversations.' : 'Your conversations with candidates. Messages are emailed to the candidate.'} />
      <Card className="grid min-h-[60vh] overflow-hidden md:grid-cols-3">
        <aside className={cn('border-slate-100 md:border-r', active && 'hidden md:block')}>
          {list.isLoading ? (
            <PageSkeleton />
          ) : list.data?.conversations.length ? (
            <ul className="divide-y divide-slate-100">
              {list.data.conversations.map((c) => (
                <li key={c.candidate.id}>
                  <button onClick={() => setParams({ candidate: c.candidate.id })} className={cn('w-full px-4 py-3 text-left hover:bg-slate-50', active === c.candidate.id && 'bg-indigo-50')}>
                    <p className="flex justify-between text-sm font-medium text-slate-800">
                      {c.candidate.name}
                      <span className="text-xs font-normal text-slate-400">{fmtRelative(c.lastAt)}</span>
                    </p>
                    <p className="truncate text-xs text-slate-500">{c.lastMessage}</p>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={MessageSquare} title="No conversations yet" text="Start one from a candidate's profile." />
          )}
        </aside>
        <section className={cn('flex flex-col md:col-span-2', !active && 'hidden md:flex')}>
          {!active ? (
            <EmptyState icon={MessageSquare} title="Pick a conversation" />
          ) : thread.isLoading || !thread.data ? (
            <PageSkeleton />
          ) : (
            <>
              <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div>
                  <button className="mr-2 text-xs text-indigo-600 md:hidden" onClick={() => setParams({})}>
                    ← Back
                  </button>
                  <Link to={`/org/candidates/${thread.data.candidate.id}`} className="text-sm font-semibold text-slate-800 hover:text-indigo-600">
                    {thread.data.candidate.name}
                  </Link>
                  <p className="text-xs text-slate-500">{thread.data.candidate.headline}</p>
                </div>
              </header>
              <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/50 p-4">
                {thread.data.messages.map((m) => (
                  <div key={m.id} className={cn('max-w-[80%] rounded-xl px-3 py-2 text-sm', m.mine ? 'ml-auto bg-indigo-600 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200')}>
                    <p className="whitespace-pre-wrap">{m.body}</p>
                    <p className={cn('mt-1 text-[10px]', m.mine ? 'text-indigo-200' : 'text-slate-400')}>
                      {m.sender} · {fmtDateTime(m.createdAt)}
                    </p>
                  </div>
                ))}
                {!thread.data.messages.length && <p className="text-center text-sm text-slate-400">No messages yet — say hello.</p>}
                <div ref={bottom} />
              </div>
              {can('messages.use') && (
                <form
                  className="flex gap-2 border-t border-slate-100 p-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (body.trim()) send.mutate();
                  }}
                >
                  <Textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Write a message…"
                    className="min-h-[44px] flex-1"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (body.trim()) send.mutate();
                      }
                    }}
                  />
                  <Button type="submit" icon={Send} disabled={!body.trim()}>
                    Send
                  </Button>
                </form>
              )}
            </>
          )}
        </section>
      </Card>
    </>
  );
}

// ---------------- notifications ----------------

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export function NotificationsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { can } = usePermissions();
  const [unread, setUnread] = useState('false');
  const [page, setPage] = useState(1);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [announcing, setAnnouncing] = useState(false);
  const key = qk.notifications.list({ unread, page });
  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: () => api.page<Notification>('/org/notifications', { unread, page, limit: 20 }),
    placeholderData: keepPreviousData,
  });

  const read = useMutation({
    mutationFn: (id: string) => api.post(`/org/notifications/${id}/read`),
    onMutate: (id) => {
      qc.setQueryData<Page<Notification>>(key, (prev) => prev && { ...prev, data: prev.data.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)) });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.me }),
  });
  const readAll = useMutation({
    mutationFn: () => api.post('/org/notifications/read-all'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.notifications.all });
      qc.invalidateQueries({ queryKey: qk.me });
    },
  });

  return (
    <>
      <PageHeader
        title="Notifications"
        actions={
          <>
            {can('notifications.announce') && (
              <Button variant="secondary" icon={Megaphone} onClick={() => setAnnouncing(true)}>
                Announce
              </Button>
            )}
            <Button variant="secondary" onClick={() => setPrefsOpen(true)}>
              Preferences
            </Button>
            <Button variant="secondary" icon={CheckCheck} loading={readAll.isPending} onClick={() => readAll.mutate()}>
              Mark all read
            </Button>
          </>
        }
      />
      <div className="mb-3">
        <FilterChips value={unread} onChange={(v) => { setUnread(v); setPage(1); }} options={[{ value: 'false', label: 'All' }, { value: 'true', label: 'Unread' }]} />
      </div>
      <Card>
        {isLoading ? (
          <PageSkeleton />
        ) : data?.data.length ? (
          <ul className="divide-y divide-slate-100">
            {data.data.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => {
                    if (!n.readAt) read.mutate(n.id);
                    if (n.link) navigate(n.link);
                  }}
                  className="flex w-full items-start gap-3 px-5 py-3 text-left hover:bg-slate-50"
                >
                  <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.readAt ? 'bg-transparent' : 'bg-indigo-500')} />
                  <span className="flex-1">
                    <span className={cn('block text-sm', n.readAt ? 'text-slate-600' : 'font-medium text-slate-800')}>{n.title}</span>
                    {n.body && <span className="block text-xs text-slate-500">{n.body}</span>}
                  </span>
                  <span className="text-xs text-slate-400">{fmtRelative(n.createdAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={Bell} title="You're all caught up" />
        )}
        <Pagination meta={data?.meta} onPage={setPage} />
      </Card>
      {prefsOpen && <PreferencesSheet onClose={() => setPrefsOpen(false)} />}
      {announcing && <AnnounceSheet onClose={() => setAnnouncing(false)} />}
    </>
  );
}

function PreferencesSheet({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: qk.notifications.prefs, queryFn: () => api.get<{ types: string[]; muted: string[] }>('/org/notifications/preferences') });
  const [muted, setMuted] = useState<Set<string>>(new Set());
  useEffect(() => data && setMuted(new Set(data.muted)), [data]);
  const save = useMutation({
    mutationFn: () => api.put('/org/notifications/preferences', { mutedTypes: [...muted] }),
    onSuccess: () => {
      toast.success('Preferences saved');
      qc.invalidateQueries({ queryKey: qk.notifications.prefs });
      onClose();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <Sheet open onClose={onClose} title="Notification preferences" footer={<Button loading={save.isPending} onClick={() => save.mutate()}>Save</Button>}>
      <p className="mb-3 text-sm text-slate-500">Choose which in-app notifications you receive.</p>
      <div className="space-y-1.5">
        {data?.types.map((t) => (
          <label key={t} className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
            {label(t.replace('.', ' '))}
            <input
              type="checkbox"
              className="rounded border-slate-300"
              checked={!muted.has(t)}
              onChange={() => {
                const next = new Set(muted);
                next.has(t) ? next.delete(t) : next.add(t);
                setMuted(next);
              }}
            />
          </label>
        ))}
      </div>
    </Sheet>
  );
}

function AnnounceSheet({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const send = useMutation({
    mutationFn: () => api.post<{ recipients: number }>('/org/notifications/announce', { title, body: body || undefined }),
    onSuccess: (r) => {
      toast.success(`Sent to ${r.recipients} members`);
      onClose();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <Sheet open onClose={onClose} title="Send announcement" footer={<Button disabled={!title.trim()} loading={send.isPending} onClick={() => send.mutate()}>Send to everyone</Button>}>
      <div className="space-y-4">
        <Field label="Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} autoFocus />
        </Field>
        <Field label="Message">
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} />
        </Field>
      </div>
    </Sheet>
  );
}

// ---------------- tasks ----------------

interface Task {
  id: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  status: 'OPEN' | 'DONE';
  assignee: string;
  assigneeId: string;
  createdBy: string;
  createdById: string;
  overdue: boolean;
}

export function TasksPage() {
  const qc = useQueryClient();
  const { me } = usePermissions();
  const [scope, setScope] = useState<'mine' | 'created'>('mine');
  const [status, setStatus] = useState<'OPEN' | 'DONE'>('OPEN');
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const key = qk.tasks.list({ scope, status, page });
  const { data, isLoading } = useQuery({ queryKey: key, queryFn: () => api.page<Task>('/org/tasks', { scope, status, page, limit: 30 }), placeholderData: keepPreviousData });

  const toggle = useMutation({
    mutationFn: (t: Task) => api.post(`/org/tasks/${t.id}/toggle`),
    onMutate: async (t) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Page<Task>>(key);
      if (prev) qc.setQueryData(key, { ...prev, data: prev.data.filter((x) => x.id !== t.id) });
      return { prev };
    },
    onError: (e, _t, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      toast.error(errorMessage(e));
    },
    onSuccess: (_r, t) => toast.success(t.status === 'OPEN' ? 'Task completed' : 'Task reopened', { label: 'Undo', onClick: () => api.post(`/org/tasks/${t.id}/toggle`).then(() => qc.invalidateQueries({ queryKey: qk.tasks.all })) }),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.tasks.all });
      qc.invalidateQueries({ queryKey: qk.dashboard });
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/org/tasks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.tasks.all }),
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <>
      <PageHeader title="Tasks" subtitle="Follow-ups for you and your team." actions={<Button icon={Plus} onClick={() => setAdding(true)}>New task</Button>} />
      <div className="mb-3 flex flex-wrap gap-3">
        <FilterChips value={scope} onChange={(v) => { setScope(v); setPage(1); }} options={[{ value: 'mine', label: 'Assigned to me' }, { value: 'created', label: 'Created by me' }]} />
        <FilterChips value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={[{ value: 'OPEN', label: 'Open' }, { value: 'DONE', label: 'Done' }]} />
      </div>
      <Card>
        {isLoading ? (
          <PageSkeleton />
        ) : data?.data.length ? (
          <ul className="divide-y divide-slate-100">
            {data.data.map((t) => (
              <li key={t.id} className="flex items-start gap-3 px-5 py-3">
                <input type="checkbox" aria-label={`Complete ${t.title}`} className="mt-1 rounded border-slate-300" checked={t.status === 'DONE'} onChange={() => toggle.mutate(t)} />
                <div className="flex-1">
                  <p className={cn('text-sm', t.status === 'DONE' ? 'text-slate-400 line-through' : 'text-slate-800')}>{t.title}</p>
                  {t.description && <p className="text-xs text-slate-500">{t.description}</p>}
                  <p className="mt-0.5 text-xs text-slate-400">
                    {scope === 'mine' ? `From ${t.createdBy}` : `For ${t.assignee}`}
                    {t.dueAt && (
                      <>
                        {' · '}
                        <span className={t.overdue ? 'font-medium text-rose-600' : ''}>Due {fmtDate(t.dueAt)}</span>
                      </>
                    )}
                  </p>
                </div>
                {t.overdue && <Badge tone="red">Overdue</Badge>}
                {t.createdById === me?.user.id && (
                  <button aria-label="Delete task" className="rounded p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-500" onClick={() => remove.mutate(t.id)}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={ClipboardCheck} title={status === 'OPEN' ? 'Nothing to do' : 'No completed tasks'} />
        )}
        <Pagination meta={data?.meta} onPage={setPage} />
      </Card>
      {adding && <TaskSheet onClose={() => setAdding(false)} />}
    </>
  );
}

function TaskSheet({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { me } = usePermissions();
  const { data: members } = useQuery({ queryKey: qk.members.options, queryFn: () => api.get<{ id: string; name: string }[]>('/org/members/options'), staleTime: STALE.reference });
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [assigneeId, setAssigneeId] = useState(me?.user.id ?? '');
  const create = useMutation({
    mutationFn: () => api.post('/org/tasks', { title, description: description || undefined, dueAt: dueAt ? new Date(dueAt).toISOString() : undefined, assigneeId }),
    onSuccess: () => {
      toast.success('Task created');
      qc.invalidateQueries({ queryKey: qk.tasks.all });
      onClose();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <Sheet open onClose={onClose} title="New task" footer={<Button disabled={!title.trim()} loading={create.isPending} onClick={() => create.mutate()}>Create</Button>}>
      <div className="space-y-4">
        <Field label="Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus maxLength={200} />
        </Field>
        <Field label="Details">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Due">
            <Input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
          </Field>
          <Field label="Assign to">
            <Select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
              {(members ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id === me?.user.id ? 'Me' : m.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </div>
    </Sheet>
  );
}
