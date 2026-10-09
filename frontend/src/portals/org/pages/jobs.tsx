// ============================================================
// Organisation portal — jobs: list, create/edit, detail with the
// lifecycle actions (token-aware publish), assignees and AI helpers.
// ============================================================

import { zodResolver } from '@hookform/resolvers/zod';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Briefcase, Copy, KanbanSquare, Pencil, Plus, Sparkles, Users } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { api, errorMessage, JobStatus } from '../lib/api';
import { fmtDate, fmtRelative, fmtSalary, label, splitList, useDebounced } from '../lib/format';
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

interface JobRow {
  id: string;
  title: string;
  status: JobStatus;
  department: string | null;
  location: string | null;
  workMode: string;
  employmentType: string;
  openings: number;
  applications: number;
  createdBy: string;
  publishedAt: string | null;
  updatedAt: string;
}

interface JobDetail {
  id: string;
  title: string;
  description: string;
  responsibilities: string | null;
  requiredSkills: string[];
  preferredSkills: string[];
  experienceMin: number | null;
  experienceMax: number | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  location: string | null;
  workMode: string;
  employmentType: string;
  education: string | null;
  industry: string | null;
  department: string | null;
  openings: number;
  deadline: string | null;
  screeningQuestions: string[];
  status: JobStatus;
  reviewNote: string | null;
  createdById: string;
  createdBy: { id: string; name: string } | null;
  approvedBy: { id: string; name: string } | null;
  assignees: { id: string; name: string }[];
  stageCounts: Record<string, number>;
  approvalRequired: boolean;
  publishCost: number;
  alreadyCharged: boolean;
  publishedAt: string | null;
  updatedAt: string;
}

// ---------------- list ----------------

export function JobsPage() {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const [params] = useSearchParams();
  const [status, setStatus] = useState(params.get('view') === 'approvals' ? 'IN_REVIEW' : params.get('status') ?? '');
  const [search, setSearch] = useState(params.get('search') ?? '');
  const [page, setPage] = useState(1);
  const q = useDebounced(search);
  const filters = { status, search: q, page };
  const { data, isFetching } = useQuery({
    queryKey: qk.jobs.list(filters),
    queryFn: () => api.page<JobRow>('/org/jobs', { ...filters, limit: 20 }),
    placeholderData: keepPreviousData,
    staleTime: STALE.list,
  });
  useEffect(() => setPage(1), [status, q]);

  return (
    <>
      <PageHeader
        title="Jobs"
        subtitle={can('jobs.read.all') ? 'Every job in your organisation.' : 'Jobs you created or were assigned to.'}
        actions={
          can('jobs.create') && (
            <Link to="/org/jobs/new">
              <Button icon={Plus}>New job</Button>
            </Link>
          )
        }
      />
      <DataTable
        loading={isFetching && !data}
        rows={data?.data}
        meta={data?.meta}
        onPage={setPage}
        onRowClick={(j) => navigate(`/org/jobs/${j.id}`)}
        toolbar={
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <FilterChips
              value={status}
              onChange={setStatus}
              options={[
                { value: '', label: 'All' },
                { value: 'PUBLISHED', label: 'Active' },
                { value: 'DRAFT', label: 'Drafts' },
                { value: 'IN_REVIEW', label: 'In review' },
                { value: 'PAUSED', label: 'Paused' },
                { value: 'CLOSED', label: 'Closed' },
                { value: 'ARCHIVED', label: 'Archived' },
              ]}
            />
            <Input placeholder="Search title, department, location" value={search} onChange={(e) => setSearch(e.target.value)} className="lg:w-72" />
          </div>
        }
        empty={
          <EmptyState
            icon={Briefcase}
            title="No jobs yet"
            text="Create a job, publish it, then add candidates to start your pipeline."
            action={can('jobs.create') && <Link to="/org/jobs/new"><Button icon={Plus}>Create a job</Button></Link>}
          />
        }
        columns={[
          {
            key: 'title',
            header: 'Job',
            cell: (j) => (
              <div>
                <p className="font-medium text-slate-800">{j.title}</p>
                <p className="text-xs text-slate-500">{[j.department, j.location, label(j.workMode)].filter(Boolean).join(' · ')}</p>
              </div>
            ),
          },
          { key: 'status', header: 'Status', cell: (j) => <StatusBadge status={j.status} /> },
          { key: 'apps', header: 'Applications', cell: (j) => j.applications },
          { key: 'owner', header: 'Owner', hideOnMobile: true, cell: (j) => j.createdBy },
          { key: 'updated', header: 'Updated', hideOnMobile: true, cell: (j) => fmtRelative(j.updatedAt) },
        ]}
      />
    </>
  );
}

// ---------------- create / edit ----------------

const jobSchema = z
  .object({
    title: z.string().trim().min(3, 'At least 3 characters').max(150),
    description: z.string().trim().min(20, 'Describe the role in at least 20 characters'),
    responsibilities: z.string().optional(),
    requiredSkills: z.string().optional(),
    preferredSkills: z.string().optional(),
    experienceMin: z.coerce.number().int().min(0).max(60).optional().or(z.literal('')),
    experienceMax: z.coerce.number().int().min(0).max(60).optional().or(z.literal('')),
    salaryMin: z.coerce.number().int().min(0).optional().or(z.literal('')),
    salaryMax: z.coerce.number().int().min(0).optional().or(z.literal('')),
    currency: z.string().length(3).default('INR'),
    location: z.string().optional(),
    workMode: z.enum(['ONSITE', 'REMOTE', 'HYBRID']),
    employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP']),
    education: z.string().optional(),
    industry: z.string().optional(),
    department: z.string().optional(),
    openings: z.coerce.number().int().min(1).max(1000),
    deadline: z.string().optional(),
    screeningQuestions: z.string().optional(),
  })
  .refine((v) => v.experienceMin === '' || v.experienceMax === '' || v.experienceMin == null || v.experienceMax == null || v.experienceMin <= v.experienceMax, {
    path: ['experienceMax'],
    message: 'Must be ≥ minimum',
  })
  .refine((v) => v.salaryMin === '' || v.salaryMax === '' || v.salaryMin == null || v.salaryMax == null || v.salaryMin <= v.salaryMax, {
    path: ['salaryMax'],
    message: 'Must be ≥ minimum',
  });

type JobForm = z.infer<typeof jobSchema>;
const num = (v: unknown) => (v === '' || v == null || Number.isNaN(v) ? undefined : Number(v));

export function JobFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const editing = !!id;
  const { data: job } = useQuery({ queryKey: qk.jobs.detail(id ?? 'new'), queryFn: () => api.get<JobDetail>(`/org/jobs/${id}`), enabled: editing });
  const { register, handleSubmit, reset, formState } = useForm<JobForm>({
    resolver: zodResolver(jobSchema),
    defaultValues: { workMode: 'ONSITE', employmentType: 'FULL_TIME', openings: 1, currency: 'INR' },
  });

  useEffect(() => {
    if (job)
      reset({
        ...job,
        responsibilities: job.responsibilities ?? '',
        requiredSkills: job.requiredSkills.join(', '),
        preferredSkills: job.preferredSkills.join(', '),
        screeningQuestions: job.screeningQuestions.join('\n'),
        experienceMin: job.experienceMin ?? '',
        experienceMax: job.experienceMax ?? '',
        salaryMin: job.salaryMin ?? '',
        salaryMax: job.salaryMax ?? '',
        location: job.location ?? '',
        education: job.education ?? '',
        industry: job.industry ?? '',
        department: job.department ?? '',
        deadline: job.deadline ? job.deadline.slice(0, 10) : '',
      } as JobForm);
  }, [job, reset]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (formState.isDirty) e.preventDefault();
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [formState.isDirty]);

  const save = useMutation({
    mutationFn: (v: JobForm) => {
      const body = {
        ...v,
        requiredSkills: splitList(v.requiredSkills ?? ''),
        preferredSkills: splitList(v.preferredSkills ?? ''),
        screeningQuestions: (v.screeningQuestions ?? '').split('\n').map((s) => s.trim()).filter(Boolean),
        experienceMin: num(v.experienceMin),
        experienceMax: num(v.experienceMax),
        salaryMin: num(v.salaryMin),
        salaryMax: num(v.salaryMax),
        deadline: v.deadline ? new Date(v.deadline).toISOString() : undefined,
        location: v.location || undefined,
        education: v.education || undefined,
        industry: v.industry || undefined,
        department: v.department || undefined,
        responsibilities: v.responsibilities || undefined,
      };
      return editing ? api.patch<{ id: string }>(`/org/jobs/${id}`, body) : api.post<{ id: string }>('/org/jobs', body);
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: qk.jobs.all });
      toast.success(editing ? 'Job updated' : 'Draft job created');
      reset(undefined, { keepValues: true });
      navigate(`/org/jobs/${res.id}`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (editing && !job) return <PageSkeleton />;
  const err = formState.errors;

  return (
    <form onSubmit={handleSubmit((v) => save.mutate(v))} noValidate>
      <PageHeader
        back={{ to: editing ? `/org/jobs/${id}` : '/org/jobs', label: editing ? 'Job' : 'Jobs' }}
        title={editing ? `Edit ${job.title}` : 'New job'}
        subtitle={editing ? undefined : 'Saved as a draft. Publishing happens from the job page.'}
        actions={
          <>
            <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button type="submit" loading={save.isPending}>
              {editing ? 'Save changes' : 'Create draft'}
            </Button>
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="space-y-4 p-5 lg:col-span-2">
          <Field label="Job title" error={err.title?.message}>
            <Input {...register('title')} placeholder="e.g. Senior React Developer" />
          </Field>
          <Field label="Description" error={err.description?.message}>
            <Textarea rows={8} {...register('description')} />
          </Field>
          <Field label="Responsibilities">
            <Textarea rows={4} {...register('responsibilities')} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Required skills" hint="Comma separated">
              <Input {...register('requiredSkills')} placeholder="React, TypeScript" />
            </Field>
            <Field label="Preferred skills" hint="Comma separated">
              <Input {...register('preferredSkills')} placeholder="GraphQL" />
            </Field>
          </div>
          <Field label="Screening questions" hint="One per line">
            <Textarea rows={3} {...register('screeningQuestions')} />
          </Field>
        </Card>
        <Card className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Work mode">
              <Select {...register('workMode')}>
                <option value="ONSITE">On-site</option>
                <option value="HYBRID">Hybrid</option>
                <option value="REMOTE">Remote</option>
              </Select>
            </Field>
            <Field label="Type">
              <Select {...register('employmentType')}>
                <option value="FULL_TIME">Full time</option>
                <option value="PART_TIME">Part time</option>
                <option value="CONTRACT">Contract</option>
                <option value="INTERNSHIP">Internship</option>
              </Select>
            </Field>
          </div>
          <Field label="Location">
            <Input {...register('location')} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Min experience (yrs)" error={err.experienceMin?.message}>
              <Input type="number" min={0} {...register('experienceMin')} />
            </Field>
            <Field label="Max experience (yrs)" error={err.experienceMax?.message}>
              <Input type="number" min={0} {...register('experienceMax')} />
            </Field>
            <Field label="Min salary" error={err.salaryMin?.message}>
              <Input type="number" min={0} {...register('salaryMin')} />
            </Field>
            <Field label="Max salary" error={err.salaryMax?.message}>
              <Input type="number" min={0} {...register('salaryMax')} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Currency">
              <Input maxLength={3} {...register('currency')} />
            </Field>
            <Field label="Openings" error={err.openings?.message}>
              <Input type="number" min={1} {...register('openings')} />
            </Field>
          </div>
          <Field label="Department">
            <Input {...register('department')} />
          </Field>
          <Field label="Industry">
            <Input {...register('industry')} />
          </Field>
          <Field label="Education">
            <Input {...register('education')} />
          </Field>
          <Field label="Application deadline">
            <Input type="date" {...register('deadline')} />
          </Field>
        </Card>
      </div>
    </form>
  );
}

// ---------------- detail ----------------

const ACTION_LABEL: Record<string, string> = {
  submit: 'Submit for approval',
  publish: 'Publish',
  approve: 'Approve & publish',
  reject: 'Send back',
  pause: 'Pause',
  resume: 'Resume',
  close: 'Close',
  reopen: 'Reopen',
  archive: 'Archive',
};

function availableActions(job: JobDetail, can: (...k: string[]) => boolean): string[] {
  const a: string[] = [];
  const s = job.status;
  if (s === 'DRAFT') {
    if (job.approvalRequired && can('jobs.update')) a.push('submit');
    if (can('jobs.publish') && (!job.approvalRequired || can('jobs.approve'))) a.push('publish');
    if (can('jobs.archive')) a.push('archive');
  }
  if (s === 'IN_REVIEW' && can('jobs.approve')) a.push('approve', 'reject');
  if (s === 'PUBLISHED' && can('jobs.update')) a.push('pause', 'close');
  if (s === 'PAUSED') {
    if (can('jobs.publish')) a.push('resume');
    if (can('jobs.update')) a.push('close');
  }
  if (s === 'CLOSED') {
    if (can('jobs.publish')) a.push('reopen');
    if (can('jobs.archive')) a.push('archive');
  }
  return [...new Set(a)];
}

export function JobDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { can } = usePermissions();
  const { data: job, isLoading } = useQuery({ queryKey: qk.jobs.detail(id), queryFn: () => api.get<JobDetail>(`/org/jobs/${id}`), staleTime: STALE.detail });
  const [pending, setPending] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [aiResult, setAiResult] = useState<{ title: string; text: string } | null>(null);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: qk.jobs.all });
    qc.invalidateQueries({ queryKey: qk.tokens.all });
    qc.invalidateQueries({ queryKey: qk.me });
  };

  const act = useMutation({
    mutationFn: ({ action, note }: { action: string; note?: string }) => api.post(`/org/jobs/${id}/actions/${action}`, { note }),
    onSuccess: (_r, v) => {
      toast.success(`${ACTION_LABEL[v.action]} — done`);
      setPending(null);
      setNote('');
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const duplicate = useMutation({
    mutationFn: () => api.post<{ id: string }>(`/org/jobs/${id}/duplicate`),
    onSuccess: (r) => {
      toast.success('Draft copy created');
      qc.invalidateQueries({ queryKey: qk.jobs.all });
      navigate(`/org/jobs/${r.id}`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const ai = useMutation({
    mutationFn: (kind: 'improve-jd' | 'interview-questions') =>
      api.post<{ suggestion?: string; questions?: string }>(`/org/ai/${kind}/${id}`).then((r) => ({ kind, r })),
    onSuccess: ({ kind, r }) => {
      setAiResult({ title: kind === 'improve-jd' ? 'Suggested description' : 'Suggested interview questions', text: r.suggestion ?? r.questions ?? '' });
      qc.invalidateQueries({ queryKey: qk.tokens.all });
      qc.invalidateQueries({ queryKey: qk.me });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (isLoading || !job) return <PageSkeleton />;
  const actions = availableActions(job, can);
  const isPublish = (a: string) => ['publish', 'approve'].includes(a);

  return (
    <>
      <PageHeader
        back={{ to: '/org/jobs', label: 'Jobs' }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {job.title} <StatusBadge status={job.status} />
          </span>
        }
        subtitle={[job.department, job.location, label(job.workMode), label(job.employmentType)].filter(Boolean).join(' · ')}
        actions={
          <>
            {actions.map((a) =>
              isPublish(a) ? (
                <TokenButton key={a} cost={job.publishCost} alreadyPaid={job.alreadyCharged} loading={act.isPending && act.variables?.action === a} onConfirm={() => act.mutate({ action: a })}>
                  {ACTION_LABEL[a]}
                </TokenButton>
              ) : (
                <Button
                  key={a}
                  variant={a === 'archive' || a === 'close' ? 'secondary' : a === 'reject' ? 'secondary' : 'primary'}
                  loading={act.isPending && act.variables?.action === a}
                  onClick={() => (a === 'reject' || a === 'close' || a === 'archive' ? setPending(a) : act.mutate({ action: a }))}
                >
                  {ACTION_LABEL[a]}
                </Button>
              ),
            )}
            {can('jobs.update') && ['DRAFT', 'IN_REVIEW', 'PUBLISHED', 'PAUSED'].includes(job.status) && (
              <Link to={`/org/jobs/${id}/edit`}>
                <Button variant="secondary" icon={Pencil}>
                  Edit
                </Button>
              </Link>
            )}
            {can('jobs.create') && (
              <Button variant="ghost" icon={Copy} onClick={() => duplicate.mutate()} loading={duplicate.isPending}>
                Duplicate
              </Button>
            )}
          </>
        }
      />

      {job.reviewNote && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <b>Reviewer note:</b> {job.reviewNote}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader
              title="Pipeline"
              action={
                can('applications.read.all', 'applications.read.assigned') && (
                  <Link to={`/org/jobs/${id}/pipeline`}>
                    <Button size="sm" icon={KanbanSquare}>
                      Open pipeline
                    </Button>
                  </Link>
                )
              }
            />
            <div className="grid grid-cols-3 gap-3 p-5 sm:grid-cols-4 lg:grid-cols-8">
              {Object.entries(job.stageCounts).map(([stage, count]) => (
                <div key={stage} className="rounded-lg bg-slate-50 px-2 py-2 text-center">
                  <p className="text-lg font-semibold text-slate-800">{count}</p>
                  <p className="text-[11px] text-slate-500">{label(stage)}</p>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <h3 className="mb-2 text-sm font-semibold text-slate-800">Description</h3>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{job.description}</p>
            {job.responsibilities && (
              <>
                <h3 className="mb-2 mt-5 text-sm font-semibold text-slate-800">Responsibilities</h3>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{job.responsibilities}</p>
              </>
            )}
            {job.screeningQuestions.length > 0 && (
              <>
                <h3 className="mb-2 mt-5 text-sm font-semibold text-slate-800">Screening questions</h3>
                <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-600">
                  {job.screeningQuestions.map((q) => (
                    <li key={q}>{q}</li>
                  ))}
                </ol>
              </>
            )}
          </Card>
        </div>
        <div className="space-y-6">
          <Card className="p-5">
            <dl className="grid grid-cols-2 gap-4">
              <Stat label="Experience" value={job.experienceMin != null || job.experienceMax != null ? `${job.experienceMin ?? 0}–${job.experienceMax ?? '∞'} yrs` : '—'} />
              <Stat label="Salary" value={job.salaryMin || job.salaryMax ? `${fmtSalary(job.salaryMin, job.currency)} – ${fmtSalary(job.salaryMax, job.currency)}` : '—'} />
              <Stat label="Openings" value={job.openings} />
              <Stat label="Deadline" value={fmtDate(job.deadline)} />
              <Stat label="Created by" value={job.createdBy?.name} />
              <Stat label="Published" value={fmtDate(job.publishedAt)} />
            </dl>
            <div className="mt-4 space-y-2">
              <p className="text-xs text-slate-500">Required skills</p>
              <div className="flex flex-wrap gap-1.5">{job.requiredSkills.map((s) => <Badge key={s} tone="indigo">{s}</Badge>)}</div>
              {job.preferredSkills.length > 0 && (
                <>
                  <p className="pt-2 text-xs text-slate-500">Preferred skills</p>
                  <div className="flex flex-wrap gap-1.5">{job.preferredSkills.map((s) => <Badge key={s}>{s}</Badge>)}</div>
                </>
              )}
            </div>
          </Card>
          <Card>
            <CardHeader
              title="Assigned recruiters"
              action={
                can('jobs.assign') && (
                  <Button size="sm" variant="secondary" icon={Users} onClick={() => setAssigning(true)}>
                    Manage
                  </Button>
                )
              }
            />
            <ul className="divide-y divide-slate-100">
              {job.assignees.length ? job.assignees.map((a) => <li key={a.id} className="px-5 py-2.5 text-sm text-slate-700">{a.name}</li>) : <li className="px-5 py-4 text-sm text-slate-500">Nobody assigned yet.</li>}
            </ul>
          </Card>
          {can('ai.use') && (
            <Card className="p-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Sparkles className="h-4 w-4 text-indigo-500" /> AI assistant
              </h3>
              <div className="flex flex-col gap-2">
                <TokenButton variant="secondary" cost={10} loading={ai.isPending && ai.variables === 'improve-jd'} onConfirm={() => ai.mutate('improve-jd')}>
                  Improve description
                </TokenButton>
                <TokenButton variant="secondary" cost={10} loading={ai.isPending && ai.variables === 'interview-questions'} onConfirm={() => ai.mutate('interview-questions')}>
                  Suggest interview questions
                </TokenButton>
              </div>
              <p className="mt-2 text-xs text-slate-400">Suggestions only — nothing changes until you edit the job.</p>
            </Card>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!pending}
        title={`${ACTION_LABEL[pending ?? 'close']}?`}
        message={
          pending === 'reject'
            ? 'Tell the author what needs to change.'
            : pending === 'archive'
              ? 'Archived jobs are hidden from lists but kept for reporting.'
              : 'Closed jobs stop accepting new candidates. You can reopen later.'
        }
        tone={pending === 'reject' ? 'primary' : 'danger'}
        confirmLabel={ACTION_LABEL[pending ?? 'close']}
        loading={act.isPending}
        onClose={() => setPending(null)}
        onConfirm={() => act.mutate({ action: pending, note: note || undefined })}
      >
        {pending === 'reject' && <Textarea className="mt-3" value={note} onChange={(e) => setNote(e.target.value)} placeholder="What should change?" />}
      </ConfirmDialog>

      {assigning && <AssignSheet job={job} onClose={() => setAssigning(false)} />}

      <Sheet open={!!aiResult} onClose={() => setAiResult(null)} title={aiResult?.title ?? ''} wide>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{aiResult?.text}</p>
        <Button className="mt-4" variant="secondary" icon={Copy} onClick={() => navigator.clipboard.writeText(aiResult?.text ?? '').then(() => toast.success('Copied'))}>
          Copy
        </Button>
      </Sheet>
    </>
  );
}

function AssignSheet({ job, onClose }: { job: JobDetail; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: members } = useQuery({
    queryKey: qk.members.options,
    queryFn: () => api.get<{ id: string; name: string; role: string }[]>('/org/members/options'),
    staleTime: STALE.reference,
  });
  const [selected, setSelected] = useState(new Set(job.assignees.map((a) => a.id)));
  const save = useMutation({
    mutationFn: () => api.put(`/org/jobs/${job.id}/assignees`, { userIds: [...selected] }),
    onSuccess: () => {
      toast.success('Assignees updated');
      qc.invalidateQueries({ queryKey: qk.jobs.all });
      onClose();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const eligible = (members ?? []).filter((m) => m.role !== 'ORGANISATION_SUPER_ADMIN');
  return (
    <Sheet
      open
      onClose={onClose}
      title="Assign recruiters"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={save.isPending} onClick={() => save.mutate()}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-1.5">
        {eligible.map((m) => (
          <label key={m.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
            <input
              type="checkbox"
              className="rounded border-slate-300"
              checked={selected.has(m.id)}
              onChange={() => {
                const next = new Set(selected);
                next.has(m.id) ? next.delete(m.id) : next.add(m.id);
                setSelected(next);
              }}
            />
            <span className="flex-1 text-slate-700">{m.name}</span>
            <span className="text-xs text-slate-400">{label(m.role)}</span>
          </label>
        ))}
      </div>
    </Sheet>
  );
}
