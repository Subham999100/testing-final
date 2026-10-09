// ============================================================
// Organisation portal — applications list (with bulk move/reject and
// 5-second undo) and application detail (stage moves, history,
// interviews, offers, notes, AI match).
// ============================================================

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarPlus, ClipboardList, FilePlus2, Sparkles } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, errorMessage, Stage } from '../lib/api';
import { fmtDateTime, fmtRelative, label, useDebounced } from '../lib/format';
import { qk, STALE } from '../lib/queryKeys';
import { usePermissions } from '../lib/session';
import { DataTable } from '../ui/DataTable';
import { toast } from '../ui/toast';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  Input,
  PageHeader,
  PageSkeleton,
  Select,
  StatusBadge,
  Textarea,
  TokenButton,
} from '../ui/ui';
import { MatchExplanationView } from './candidates';
import { ScheduleInterviewSheet } from './interviews';
import { CreateOfferSheet } from './offers';

const STAGES: Stage[] = ['APPLIED', 'SCREENING', 'SHORTLISTED', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED', 'WITHDRAWN'];

interface AppRow {
  id: string;
  stage: Stage;
  matchScore: number | null;
  candidate: { id: string; name: string; headline: string | null };
  job: { id: string; title: string };
  assignedTo: { id: string; name: string } | null;
  updatedAt: string;
}

export function ApplicationsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { can } = usePermissions();
  const [params] = useSearchParams();
  const [stage, setStage] = useState(params.get('stage') ?? '');
  const [mine, setMine] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkTo, setBulkTo] = useState<Stage | ''>('');
  const [reason, setReason] = useState('');
  const q = useDebounced(search);
  const filters = { stage, search: q, page, assignedToId: mine ? 'me' : undefined };
  useEffect(() => setPage(1), [stage, q, mine]);
  const { data, isFetching } = useQuery({
    queryKey: qk.applications.list(filters),
    queryFn: () => api.page<AppRow>('/org/applications', { ...filters, limit: 25 }),
    placeholderData: keepPreviousData,
    staleTime: STALE.list,
  });

  const bulk = useMutation({
    mutationFn: (v: { ids: string[]; toStage: Stage; reason?: string }) => api.post<{ moved: string[]; failed: { id: string; reason: string }[] }>('/org/applications/bulk-move', v),
    onSuccess: (res, v) => {
      const previous = new Map((data?.data ?? []).map((a) => [a.id, a.stage]));
      qc.invalidateQueries({ queryKey: qk.applications.all });
      qc.invalidateQueries({ queryKey: qk.pipeline.all });
      setSelected(new Set());
      setBulkTo('');
      setReason('');
      if (res.failed.length) toast.error(`${res.failed.length} could not be moved: ${res.failed[0].reason}`);
      if (res.moved.length) {
        toast.success(`Moved ${res.moved.length} to ${label(v.toStage)}`, {
          label: 'Undo',
          onClick: () => {
            // Undo = move each back to where it was (server re-validates every move).
            const groups = new Map<Stage, string[]>();
            res.moved.forEach((id) => {
              const from = previous.get(id);
              if (from) groups.set(from, [...(groups.get(from) ?? []), id]);
            });
            Promise.all([...groups.entries()].map(([toStage, ids]) => api.post('/org/applications/bulk-move', { ids, toStage, reason: 'Undo' })))
              .then(() => toast.info('Reverted'))
              .catch((e) => toast.error(errorMessage(e)))
              .finally(() => qc.invalidateQueries({ queryKey: qk.applications.all }));
          },
        });
      }
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <>
      <PageHeader title="Applications" subtitle={can('applications.read.all') ? 'All applications in your organisation.' : 'Applications on your jobs.'} />
      {selected.size > 0 && can('ats.bulk') && (
        <div className="sticky top-0 z-10 mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm">
          <span className="font-medium text-indigo-800">{selected.size} selected</span>
          <Select value={bulkTo} onChange={(e) => setBulkTo(e.target.value as Stage)} className="w-44">
            <option value="">Move to…</option>
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {label(s)}
              </option>
            ))}
          </Select>
          <Button size="sm" disabled={!bulkTo} loading={bulk.isPending} onClick={() => bulkTo !== 'REJECTED' && bulk.mutate({ ids: [...selected], toStage: bulkTo as Stage })}>
            Apply
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      )}
      <DataTable
        loading={isFetching && !data}
        rows={data?.data}
        meta={data?.meta}
        onPage={setPage}
        selectable={can('ats.bulk')}
        selected={selected}
        onSelectedChange={setSelected}
        onRowClick={(a) => navigate(`/org/applications/${a.id}`)}
        toolbar={
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              <Select value={stage} onChange={(e) => setStage(e.target.value)} className="w-40">
                <option value="">All stages</option>
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {label(s)}
                  </option>
                ))}
              </Select>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" className="rounded border-slate-300" checked={mine} onChange={(e) => setMine(e.target.checked)} />
                Assigned to me
              </label>
            </div>
            <Input placeholder="Search candidate or job" value={search} onChange={(e) => setSearch(e.target.value)} className="lg:w-72" />
          </div>
        }
        empty={<EmptyState icon={ClipboardList} title="No applications" text="Add candidates to a published job to start a pipeline." />}
        columns={[
          {
            key: 'cand',
            header: 'Candidate',
            cell: (a) => (
              <div>
                <p className="font-medium text-slate-800">{a.candidate.name}</p>
                <p className="text-xs text-slate-500">{a.candidate.headline ?? '—'}</p>
              </div>
            ),
          },
          { key: 'job', header: 'Job', cell: (a) => a.job.title },
          { key: 'stage', header: 'Stage', cell: (a) => <StatusBadge status={a.stage} /> },
          { key: 'match', header: 'Match', hideOnMobile: true, cell: (a) => (a.matchScore != null ? `${a.matchScore}%` : '—') },
          { key: 'owner', header: 'Assigned', hideOnMobile: true, cell: (a) => a.assignedTo?.name ?? '—' },
          { key: 'updated', header: 'Updated', hideOnMobile: true, cell: (a) => fmtRelative(a.updatedAt) },
        ]}
      />
      <ConfirmDialog
        open={bulkTo === 'REJECTED'}
        title={`Reject ${selected.size} applications?`}
        message="Add a reason — it is stored on each application."
        tone="danger"
        confirmLabel="Reject"
        loading={bulk.isPending}
        onClose={() => setBulkTo('')}
        onConfirm={() => bulk.mutate({ ids: [...selected], toStage: 'REJECTED', reason: reason.trim() || undefined })}
      >
        <Textarea className="mt-3" value={reason} onChange={(e) => setReason(e.target.value)} />
      </ConfirmDialog>
    </>
  );
}

// ---------------- detail ----------------

interface AppDetail {
  id: string;
  stage: Stage;
  rejectReason: string | null;
  matchScore: number | null;
  match: { score: number; explanation: any; at: string } | null;
  candidate: { id: string; name: string; headline: string | null; skills: string[]; experienceYears: number | null; location: string | null };
  job: { id: string; title: string; status: string; requiredSkills: string[] };
  assignedTo: { id: string; name: string } | null;
  allowedMoves: Stage[];
  rejectReasonRequired: boolean;
  history: { id: string; fromStage: Stage | null; toStage: Stage; actor: string; reason: string | null; createdAt: string }[];
  interviews: { id: string; title: string; scheduledAt: string; status: string; mode: string }[];
  offers: { id: string; title: string; status: string; salary: number; currency: string }[];
  notes: { id: string; body: string; author: string; createdAt: string }[];
}

export function ApplicationDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const { can } = usePermissions();
  const key = qk.applications.detail(id);
  const { data: a, isLoading } = useQuery({ queryKey: key, queryFn: () => api.get<AppDetail>(`/org/applications/${id}`), staleTime: STALE.detail });
  const [to, setTo] = useState<Stage | null>(null);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [scheduling, setScheduling] = useState(false);
  const [offering, setOffering] = useState(false);
  const { data: members } = useQuery({
    queryKey: qk.members.options,
    queryFn: () => api.get<{ id: string; name: string }[]>('/org/members/options'),
    enabled: can('applications.assign'),
    staleTime: STALE.reference,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: key });
    qc.invalidateQueries({ queryKey: qk.applications.all });
    qc.invalidateQueries({ queryKey: qk.pipeline.all });
  };

  const move = useMutation({
    mutationFn: (v: { toStage: Stage; reason?: string }) => api.post(`/org/applications/${id}/move`, v),
    onMutate: async (v) => {
      const prev = qc.getQueryData<AppDetail>(key);
      if (prev) qc.setQueryData(key, { ...prev, stage: v.toStage, allowedMoves: [] });
      return { prev };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      toast.error(errorMessage(e));
    },
    onSuccess: (_r, v) => toast.success(`Moved to ${label(v.toStage)}`),
    onSettled: () => {
      setTo(null);
      setReason('');
      invalidate();
    },
  });

  const assign = useMutation({
    mutationFn: (userId: string) => api.patch(`/org/applications/${id}/assign`, { userId }),
    onSuccess: () => {
      toast.success('Assigned');
      invalidate();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const match = useMutation({
    mutationFn: () => api.post(`/org/ai/match/${id}`),
    onSuccess: () => {
      toast.success('Match score updated');
      invalidate();
      qc.invalidateQueries({ queryKey: qk.tokens.all });
      qc.invalidateQueries({ queryKey: qk.me });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const addNote = useMutation({
    mutationFn: () => api.post(`/org/candidates/${a.candidate.id}/notes`, { body: note, applicationId: id }),
    onSuccess: () => {
      setNote('');
      invalidate();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (isLoading || !a) return <PageSkeleton />;

  const needsReason = (s: Stage) => s === 'REJECTED' && a.rejectReasonRequired;

  return (
    <>
      <PageHeader
        back={{ to: `/org/jobs/${a.job.id}/pipeline`, label: `${a.job.title} pipeline` }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <Link to={`/org/candidates/${a.candidate.id}`} className="hover:text-indigo-600">
              {a.candidate.name}
            </Link>
            <StatusBadge status={a.stage} />
          </span>
        }
        subtitle={`${a.job.title}${a.candidate.headline ? ` · ${a.candidate.headline}` : ''}`}
        actions={
          <>
            {can('interviews.schedule') && ['SHORTLISTED', 'INTERVIEW'].includes(a.stage) && (
              <Button variant="secondary" icon={CalendarPlus} onClick={() => setScheduling(true)}>
                Schedule interview
              </Button>
            )}
            {can('offers.create') && ['INTERVIEW', 'OFFER'].includes(a.stage) && (
              <Button variant="secondary" icon={FilePlus2} onClick={() => setOffering(true)}>
                Create offer
              </Button>
            )}
          </>
        }
      />
      {a.rejectReason && <div className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">Rejected: {a.rejectReason}</div>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          {can('ats.move') && a.allowedMoves.length > 0 && (
            <Card className="p-5">
              <p className="mb-2 text-xs font-medium text-slate-500">Move to</p>
              <div className="flex flex-wrap gap-2">
                {a.allowedMoves.map((s) => (
                  <Button key={s} size="sm" variant={s === 'REJECTED' ? 'secondary' : 'primary'} onClick={() => (needsReason(s) ? setTo(s) : move.mutate({ toStage: s }))}>
                    {label(s)}
                  </Button>
                ))}
              </div>
            </Card>
          )}
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-800">Match</p>
              {a.matchScore != null && <Badge tone={a.matchScore >= 70 ? 'green' : a.matchScore >= 40 ? 'amber' : 'gray'}>{a.matchScore}%</Badge>}
            </div>
            {a.match ? <div className="mt-3"><MatchExplanationView match={a.match} /></div> : <p className="mt-2 text-sm text-slate-500">No AI match run yet.</p>}
            {can('ai.use') && (
              <TokenButton size="sm" variant="secondary" icon={Sparkles} className="mt-3" cost={5} loading={match.isPending} onConfirm={() => match.mutate()}>
                {a.match ? 'Re-run match' : 'Run AI match'}
              </TokenButton>
            )}
          </Card>
          {can('applications.assign') && (
            <Card className="p-5">
              <p className="mb-2 text-xs font-medium text-slate-500">Assigned recruiter</p>
              <Select value={a.assignedTo?.id ?? ''} onChange={(e) => e.target.value && assign.mutate(e.target.value)}>
                <option value="">Unassigned</option>
                {members?.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>
            </Card>
          )}
        </div>

        <div className="space-y-6 lg:col-span-2">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader title="Interviews" />
              {a.interviews.length ? (
                <ul className="divide-y divide-slate-100">
                  {a.interviews.map((i) => (
                    <li key={i.id} className="flex items-center justify-between px-5 py-2.5 text-sm">
                      <Link to={`/org/interviews/${i.id}`} className="text-slate-700 hover:text-indigo-600">
                        {i.title}
                        <span className="block text-xs text-slate-400">{fmtDateTime(i.scheduledAt)}</span>
                      </Link>
                      <StatusBadge status={i.status} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-5 py-4 text-sm text-slate-400">None scheduled.</p>
              )}
            </Card>
            <Card>
              <CardHeader title="Offers" />
              {a.offers.length ? (
                <ul className="divide-y divide-slate-100">
                  {a.offers.map((o) => (
                    <li key={o.id} className="flex items-center justify-between px-5 py-2.5 text-sm">
                      <Link to={`/org/offers/${o.id}`} className="text-slate-700 hover:text-indigo-600">
                        {o.title}
                      </Link>
                      <StatusBadge status={o.status} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-5 py-4 text-sm text-slate-400">No offers yet.</p>
              )}
            </Card>
          </div>
          <Card>
            <CardHeader title="History" />
            <ol className="space-y-3 px-5 py-4">
              {a.history
                .slice()
                .reverse()
                .map((h) => (
                  <li key={h.id} className="flex gap-3 text-sm">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-400" />
                    <div>
                      <p className="text-slate-700">
                        {h.fromStage ? (
                          <>
                            {label(h.fromStage)} → <b>{label(h.toStage)}</b>
                          </>
                        ) : (
                          <>Added as <b>{label(h.toStage)}</b></>
                        )}{' '}
                        <span className="text-slate-400">by {h.actor}</span>
                      </p>
                      {h.reason && <p className="text-xs text-slate-500">“{h.reason}”</p>}
                      <p className="text-xs text-slate-400">{fmtRelative(h.createdAt)}</p>
                    </div>
                  </li>
                ))}
            </ol>
          </Card>
          <Card>
            <CardHeader title="Notes on this application" />
            <div className="p-5">
              {can('candidates.notes.write') && (
                <div className="mb-4 flex gap-2">
                  <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note…" />
                  <Button disabled={!note.trim()} loading={addNote.isPending} onClick={() => addNote.mutate()}>
                    Add
                  </Button>
                </div>
              )}
              {a.notes.length ? (
                <ul className="space-y-2">
                  {a.notes.map((n) => (
                    <li key={n.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      {n.body}
                      <span className="block text-xs text-slate-400">
                        {n.author} · {fmtRelative(n.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-400">No notes yet.</p>
              )}
            </div>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={!!to}
        title="Reject this application?"
        message="A reason is required and stays in the history."
        tone="danger"
        confirmLabel="Reject"
        loading={move.isPending}
        onClose={() => setTo(null)}
        onConfirm={() => (reason.trim() ? move.mutate({ toStage: to, reason: reason.trim() }) : toast.error('Please add a reason'))}
      >
        <Textarea className="mt-3" value={reason} onChange={(e) => setReason(e.target.value)} />
      </ConfirmDialog>
      {scheduling && <ScheduleInterviewSheet applicationId={a.id} candidateName={a.candidate.name} onClose={() => setScheduling(false)} />}
      {offering && <CreateOfferSheet applicationId={a.id} defaultTitle={a.job.title} onClose={() => setOffering(false)} />}
    </>
  );
}
