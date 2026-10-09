// ============================================================
// Organisation portal — talent pool: search, add, profile, resume
// unlock (token-metered), notes, saving and adding to jobs.
// ============================================================

import { zodResolver } from '@hookform/resolvers/zod';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bookmark, BookmarkCheck, Lock, MessageSquare, Plus, Sparkles, UserPlus, UserSearch } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { api, errorMessage, Stage } from '../lib/api';
import { fmtDate, fmtRelative, splitList, useDebounced } from '../lib/format';
import { qk, STALE } from '../lib/queryKeys';
import { usePermissions } from '../lib/session';
import { DataTable } from '../ui/DataTable';
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
  Select,
  Sheet,
  Stat,
  StatusBadge,
  Textarea,
  TokenButton,
} from '../ui/ui';

interface CandidateRow {
  id: string;
  name: string;
  headline: string | null;
  location: string | null;
  experienceYears: number | null;
  skills: string[];
  applications: number;
  saved: boolean;
  unlocked: boolean;
  createdAt: string;
}

interface MatchExplanation {
  factors: { factor: string; weight: number; score: number; detail: string }[];
  method: string;
  advisory: string;
}

interface CandidateDetail {
  id: string;
  name: string;
  headline: string | null;
  location: string | null;
  experienceYears: number | null;
  currentCompany: string | null;
  skills: string[];
  source: string | null;
  createdAt: string;
  hasResume: boolean;
  unlocked: boolean;
  unlockCost: number;
  contact: { email: string; phone: string | null; resumeText: string | null; resumeUrl: string | null } | null;
  saved: boolean;
  messageCount: number;
  applications: {
    id: string;
    stage: Stage;
    matchScore: number | null;
    job: { id: string; title: string; status: string };
    createdAt: string;
    match: { score: number; explanation: MatchExplanation; at: string } | null;
  }[];
  notes: { id: string; body: string; author: string; createdAt: string }[];
}

// ---------------- list ----------------

export function CandidatesPage() {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('search') ?? '');
  const [saved, setSaved] = useState('false');
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(params.get('new') === '1');
  const q = useDebounced(search);
  const filters = { search: q, saved, page };
  useEffect(() => setSearch(params.get('search') ?? ''), [params]);
  useEffect(() => setPage(1), [q, saved]);
  const { data, isFetching } = useQuery({
    queryKey: qk.candidates.list(filters),
    queryFn: () => api.page<CandidateRow>('/org/candidates', { ...filters, limit: 20 }),
    placeholderData: keepPreviousData,
    staleTime: STALE.list,
  });

  return (
    <>
      <PageHeader
        title="Candidates"
        subtitle="Your organisation's talent pool. Contact details unlock per candidate."
        actions={
          can('candidates.save') && (
            <Button icon={Plus} onClick={() => setAdding(true)}>
              Add candidate
            </Button>
          )
        }
      />
      <DataTable
        loading={isFetching && !data}
        rows={data?.data}
        meta={data?.meta}
        onPage={setPage}
        onRowClick={(c) => can('candidates.read') && navigate(`/org/candidates/${c.id}`)}
        toolbar={
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <FilterChips value={saved} onChange={setSaved} options={[{ value: 'false', label: 'All candidates' }, { value: 'true', label: 'Saved by me' }]} />
            <Input placeholder="Search name, headline, skill, company, location" value={search} onChange={(e) => setSearch(e.target.value)} className="sm:w-80" />
          </div>
        }
        empty={<EmptyState icon={UserSearch} title="No candidates found" text="Add a candidate or adjust your search." />}
        columns={[
          {
            key: 'name',
            header: 'Candidate',
            cell: (c) => (
              <div>
                <p className="flex items-center gap-1.5 font-medium text-slate-800">
                  {c.name} {c.saved && <BookmarkCheck className="h-3.5 w-3.5 text-indigo-500" />}
                </p>
                <p className="text-xs text-slate-500">{c.headline ?? '—'}</p>
              </div>
            ),
          },
          {
            key: 'skills',
            header: 'Skills',
            hideOnMobile: true,
            cell: (c) => (
              <div className="flex flex-wrap gap-1">
                {c.skills.slice(0, 4).map((s) => (
                  <Badge key={s}>{s}</Badge>
                ))}
              </div>
            ),
          },
          { key: 'exp', header: 'Experience', cell: (c) => (c.experienceYears != null ? `${c.experienceYears} yrs` : '—') },
          { key: 'loc', header: 'Location', hideOnMobile: true, cell: (c) => c.location ?? '—' },
          { key: 'apps', header: 'Applications', hideOnMobile: true, cell: (c) => c.applications },
          { key: 'added', header: 'Added', hideOnMobile: true, cell: (c) => fmtRelative(c.createdAt) },
        ]}
      />
      <CandidateSheet open={adding} onClose={() => { setAdding(false); setParams({}); }} />
    </>
  );
}

// ---------------- add candidate ----------------

const candidateSchema = z.object({
  firstName: z.string().trim().min(1, 'Required').max(80),
  lastName: z.string().trim().min(1, 'Required').max(80),
  email: z.string().email('Enter a valid email'),
  phone: z.string().max(30).optional(),
  headline: z.string().max(150).optional(),
  location: z.string().max(120).optional(),
  experienceYears: z.coerce.number().int().min(0).max(60).optional().or(z.literal('')),
  currentCompany: z.string().max(120).optional(),
  skills: z.string().optional(),
  resumeText: z.string().max(50000).optional(),
  resumeUrl: z.string().url('Must be an https:// link').startsWith('https://', 'Must be an https:// link').optional().or(z.literal('')),
  source: z.string().max(60).optional(),
});

function CandidateSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { register, handleSubmit, reset, formState } = useForm<z.infer<typeof candidateSchema>>({ resolver: zodResolver(candidateSchema) });
  const create = useMutation({
    mutationFn: (v: z.infer<typeof candidateSchema>) =>
      api.post<{ id: string }>('/org/candidates', {
        ...v,
        skills: splitList(v.skills ?? ''),
        experienceYears: v.experienceYears === '' ? undefined : v.experienceYears,
        resumeUrl: v.resumeUrl || undefined,
        phone: v.phone || undefined,
      }),
    onSuccess: (c) => {
      toast.success('Candidate added');
      qc.invalidateQueries({ queryKey: qk.candidates.all });
      reset();
      onClose();
      navigate(`/org/candidates/${c.id}`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const err = formState.errors;
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Add candidate"
      wide
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={create.isPending} onClick={handleSubmit((v) => create.mutate(v))}>
            Add candidate
          </Button>
        </>
      }
    >
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => e.preventDefault()}>
        <Field label="First name" error={err.firstName?.message}>
          <Input autoFocus {...register('firstName')} />
        </Field>
        <Field label="Last name" error={err.lastName?.message}>
          <Input {...register('lastName')} />
        </Field>
        <Field label="Email" error={err.email?.message}>
          <Input type="email" {...register('email')} />
        </Field>
        <Field label="Phone">
          <Input {...register('phone')} />
        </Field>
        <Field label="Headline" className="sm:col-span-2">
          <Input {...register('headline')} placeholder="e.g. Senior Backend Engineer" />
        </Field>
        <Field label="Location">
          <Input {...register('location')} />
        </Field>
        <Field label="Experience (years)" error={err.experienceYears?.message}>
          <Input type="number" min={0} {...register('experienceYears')} />
        </Field>
        <Field label="Current company">
          <Input {...register('currentCompany')} />
        </Field>
        <Field label="Source">
          <Input {...register('source')} placeholder="Referral, LinkedIn…" />
        </Field>
        <Field label="Skills" hint="Comma separated" className="sm:col-span-2">
          <Input {...register('skills')} />
        </Field>
        <Field label="Resume link" error={err.resumeUrl?.message} className="sm:col-span-2">
          <Input {...register('resumeUrl')} placeholder="https://…" />
        </Field>
        <Field label="Resume text" hint="Paste the resume to enable AI skill extraction" className="sm:col-span-2">
          <Textarea rows={6} {...register('resumeText')} />
        </Field>
      </form>
    </Sheet>
  );
}

// ---------------- add to job (shared with the pipeline) ----------------

export function AddToJobSheet({ jobId, candidateId, onClose }: { jobId?: string; candidateId?: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const q = useDebounced(search);
  const [pick, setPick] = useState<string>('');
  const jobs = useQuery({
    queryKey: qk.jobs.list({ status: 'PUBLISHED', picker: true }),
    queryFn: () => api.page<{ id: string; title: string }>('/org/jobs', { status: 'PUBLISHED', limit: 100 }),
    enabled: !jobId,
  });
  const candidates = useQuery({
    queryKey: qk.candidates.list({ search: q, picker: true }),
    queryFn: () => api.page<CandidateRow>('/org/candidates', { search: q, limit: 20 }),
    enabled: !candidateId,
  });
  const add = useMutation({
    mutationFn: () => api.post('/org/applications', { jobId: jobId ?? pick, candidateId: candidateId ?? pick }),
    onSuccess: () => {
      toast.success('Candidate added to the pipeline');
      qc.invalidateQueries({ queryKey: qk.pipeline.all });
      qc.invalidateQueries({ queryKey: qk.applications.all });
      qc.invalidateQueries({ queryKey: qk.candidates.all });
      onClose();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <Sheet
      open
      onClose={onClose}
      title={jobId ? 'Add a candidate to this job' : 'Add to a job'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!pick} loading={add.isPending} onClick={() => add.mutate()}>
            Add
          </Button>
        </>
      }
    >
      {jobId ? (
        <div className="space-y-3">
          <Input autoFocus placeholder="Search candidates" value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="space-y-1.5">
            {candidates.data?.data.map((c) => (
              <label key={c.id} className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm ${pick === c.id ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                <input type="radio" name="candidate" checked={pick === c.id} onChange={() => setPick(c.id)} />
                <span className="flex-1">
                  <span className="block font-medium text-slate-800">{c.name}</span>
                  <span className="text-xs text-slate-500">{c.headline ?? '—'}</span>
                </span>
              </label>
            ))}
            {candidates.data && !candidates.data.data.length && <p className="text-sm text-slate-500">No candidates match.</p>}
          </div>
        </div>
      ) : (
        <Field label="Published job">
          <Select value={pick} onChange={(e) => setPick(e.target.value)}>
            <option value="">Choose a job…</option>
            {jobs.data?.data.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
          </Select>
        </Field>
      )}
    </Sheet>
  );
}

// ---------------- detail ----------------

export function MatchExplanationView({ match }: { match: { score: number; explanation: MatchExplanation } }) {
  return (
    <div className="space-y-2">
      {match.explanation.factors.map((f) => (
        <div key={f.factor}>
          <div className="flex justify-between text-xs">
            <span className="font-medium text-slate-700">
              {f.factor} <span className="text-slate-400">({f.weight}%)</span>
            </span>
            <span className="text-slate-500">{Math.round(f.score * 100)}%</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-slate-100">
            <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${Math.round(f.score * 100)}%` }} />
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">{f.detail}</p>
        </div>
      ))}
      <p className="pt-1 text-[11px] text-slate-400">{match.explanation.advisory}</p>
    </div>
  );
}

export function CandidateDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const { can } = usePermissions();
  const key = qk.candidates.detail(id);
  const { data: c, isLoading } = useQuery({ queryKey: key, queryFn: () => api.get<CandidateDetail>(`/org/candidates/${id}`), staleTime: STALE.detail });
  const [note, setNote] = useState('');
  const [addingToJob, setAddingToJob] = useState(false);

  const refreshTokens = () => {
    qc.invalidateQueries({ queryKey: qk.tokens.all });
    qc.invalidateQueries({ queryKey: qk.me });
  };

  const unlock = useMutation({
    mutationFn: () => api.post(`/org/candidates/${id}/unlock`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      refreshTokens();
      toast.success('Contact details unlocked');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const save = useMutation({
    mutationFn: (saved: boolean) => (saved ? api.post(`/org/candidates/${id}/save`) : api.del(`/org/candidates/${id}/save`)),
    onMutate: async (saved) => {
      const prev = qc.getQueryData<CandidateDetail>(key);
      if (prev) qc.setQueryData(key, { ...prev, saved });
      return { prev };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      toast.error(errorMessage(e));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.candidates.all }),
  });

  const addNote = useMutation({
    mutationFn: () => api.post(`/org/candidates/${id}/notes`, { body: note }),
    onSuccess: () => {
      setNote('');
      qc.invalidateQueries({ queryKey: key });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const parse = useMutation({
    mutationFn: () => api.post<{ extractedSkills: string[] }>(`/org/ai/parse-resume/${id}`),
    onSuccess: (r) => {
      toast.success(r.extractedSkills.length ? `Found ${r.extractedSkills.length} skills` : 'No new skills found');
      qc.invalidateQueries({ queryKey: key });
      refreshTokens();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (isLoading || !c) return <PageSkeleton />;

  return (
    <>
      <PageHeader
        back={{ to: '/org/candidates', label: 'Candidates' }}
        title={c.name}
        subtitle={[c.headline, c.currentCompany, c.location].filter(Boolean).join(' · ')}
        actions={
          <>
            {can('candidates.save') && (
              <Button variant="secondary" icon={c.saved ? BookmarkCheck : Bookmark} onClick={() => save.mutate(!c.saved)}>
                {c.saved ? 'Saved' : 'Save'}
              </Button>
            )}
            {can('messages.use') && (
              <Link to={`/org/messages?candidate=${c.id}`}>
                <Button variant="secondary" icon={MessageSquare}>
                  Message
                </Button>
              </Link>
            )}
            {can('applications.transition') && (
              <Button icon={UserPlus} onClick={() => setAddingToJob(true)}>
                Add to job
              </Button>
            )}
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <Card className="p-5">
            <dl className="grid grid-cols-2 gap-4">
              <Stat label="Experience" value={c.experienceYears != null ? `${c.experienceYears} years` : null} />
              <Stat label="Source" value={c.source} />
              <Stat label="Added" value={fmtDate(c.createdAt)} />
              <Stat label="Messages" value={c.messageCount} />
            </dl>
            <p className="mb-1.5 mt-4 text-xs text-slate-500">Skills</p>
            <div className="flex flex-wrap gap-1.5">
              {c.skills.length ? c.skills.map((s) => <Badge key={s} tone="indigo">{s}</Badge>) : <span className="text-sm text-slate-400">None yet</span>}
            </div>
          </Card>
          <Card>
            <CardHeader title="Contact & resume" />
            <div className="p-5">
              {c.contact ? (
                <dl className="space-y-3">
                  <Stat label="Email" value={<a className="text-indigo-600 hover:underline" href={`mailto:${c.contact.email}`}>{c.contact.email}</a>} />
                  <Stat label="Phone" value={c.contact.phone} />
                  {c.contact.resumeUrl && (
                    <Stat label="Resume" value={<a className="text-indigo-600 hover:underline" href={c.contact.resumeUrl} target="_blank" rel="noreferrer noopener">Open resume</a>} />
                  )}
                </dl>
              ) : (
                <div className="text-center">
                  <Lock className="mx-auto h-6 w-6 text-slate-300" />
                  <p className="mt-2 text-sm text-slate-500">Contact details and resume are locked.</p>
                  {can('candidates.resume.view') && (
                    <TokenButton className="mt-3" cost={c.unlockCost} loading={unlock.isPending} onConfirm={() => unlock.mutate()}>
                      Unlock
                    </TokenButton>
                  )}
                </div>
              )}
              {c.contact?.resumeText && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-500">Resume text</p>
                    {can('ai.use') && can('candidates.save') && (
                      <TokenButton size="sm" variant="secondary" icon={Sparkles} cost={5} loading={parse.isPending} onConfirm={() => parse.mutate()}>
                        Extract skills
                      </TokenButton>
                    )}
                  </div>
                  <p className="max-h-64 overflow-y-auto whitespace-pre-wrap text-sm text-slate-600">{c.contact.resumeText}</p>
                </div>
              )}
            </div>
          </Card>
        </div>
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Applications" />
            {c.applications.length ? (
              <ul className="divide-y divide-slate-100">
                {c.applications.map((a) => (
                  <li key={a.id} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <Link to={`/org/applications/${a.id}`} className="text-sm font-medium text-slate-800 hover:text-indigo-600">
                        {a.job.title}
                      </Link>
                      <div className="flex items-center gap-2">
                        {a.matchScore != null && <Badge tone="violet">{a.matchScore}% match</Badge>}
                        <StatusBadge status={a.stage} />
                      </div>
                    </div>
                    {a.match && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-indigo-600">Why this match score?</summary>
                        <div className="mt-2">
                          <MatchExplanationView match={a.match} />
                        </div>
                      </details>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="Not in any pipeline yet" text="Add this candidate to a published job." />
            )}
          </Card>
          <Card>
            <CardHeader title="Notes" />
            <div className="p-5">
              {can('candidates.notes.write') && (
                <div className="mb-4 flex flex-col gap-2">
                  <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a private note for your team…" />
                  <div className="flex justify-end">
                    <Button size="sm" disabled={!note.trim()} loading={addNote.isPending} onClick={() => addNote.mutate()}>
                      Add note
                    </Button>
                  </div>
                </div>
              )}
              {c.notes.length ? (
                <ul className="space-y-3">
                  {c.notes.map((n) => (
                    <li key={n.id} className="rounded-lg bg-slate-50 px-3 py-2.5">
                      <p className="whitespace-pre-wrap text-sm text-slate-700">{n.body}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {n.author} · {fmtRelative(n.createdAt)}
                      </p>
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
      {addingToJob && <AddToJobSheet candidateId={c.id} onClose={() => setAddingToJob(false)} />}
    </>
  );
}
