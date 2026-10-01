// ============================================================
// Organisation portal — ATS Kanban for one job.
// Drag & drop (or the keyboard "Move to" menu) updates the board
// optimistically; the server validates the transition and we roll back
// with a toast if it refuses. Other browsers update via WebSocket.
// ============================================================

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GripVertical, UserPlus } from 'lucide-react';
import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, errorMessage, Stage } from '../lib/api';
import { label } from '../lib/format';
import { qk } from '../lib/queryKeys';
import { usePermissions } from '../lib/session';
import { toast } from '../ui/toast';
import { Badge, Button, ConfirmDialog, PageHeader, PageSkeleton, Textarea, cn } from '../ui/ui';
import { AddToJobSheet } from './candidates';

interface Card {
  id: string;
  stage: Stage;
  matchScore: number | null;
  updatedAt: string;
  candidate: { id: string; name: string; headline: string | null; skills: string[]; experienceYears: number | null };
  assignedTo: { id: string; name: string } | null;
}

interface Pipeline {
  job: { id: string; title: string; status: string };
  stages: Stage[];
  transitions: Record<Stage, Stage[]>;
  rejectReasonRequired: boolean;
  applications: Card[];
}

const COLUMN_TONE: Record<string, string> = {
  APPLIED: 'border-t-sky-400',
  SCREENING: 'border-t-indigo-400',
  SHORTLISTED: 'border-t-violet-400',
  INTERVIEW: 'border-t-amber-400',
  OFFER: 'border-t-cyan-400',
  HIRED: 'border-t-emerald-500',
  REJECTED: 'border-t-rose-400',
};

export function PipelinePage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const { can } = usePermissions();
  const key = qk.pipeline.job(id);
  const { data, isLoading } = useQuery({ queryKey: key, queryFn: () => api.get<Pipeline>(`/org/jobs/${id}/pipeline`), staleTime: 15_000 });
  const [dragging, setDragging] = useState<Card | null>(null);
  const [rejecting, setRejecting] = useState<Card | null>(null);
  const [reason, setReason] = useState('');
  const [adding, setAdding] = useState(false);
  const canMove = can('ats.move');

  const move = useMutation({
    mutationFn: ({ card, to, reason }: { card: Card; to: Stage; reason?: string }) => api.post(`/org/applications/${card.id}/move`, { toStage: to, reason }),
    onMutate: async ({ card, to }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Pipeline>(key);
      if (prev) qc.setQueryData<Pipeline>(key, { ...prev, applications: prev.applications.map((a) => (a.id === card.id ? { ...a, stage: to } : a)) });
      return { prev };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      toast.error(errorMessage(e, 'Could not move the candidate'));
    },
    onSuccess: (_r, v) => toast.success(`${v.card.candidate.name} → ${label(v.to)}`),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: qk.applications.all });
      qc.invalidateQueries({ queryKey: qk.dashboard });
    },
  });

  if (isLoading || !data) return <PageSkeleton />;

  const request = (card: Card, to: Stage) => {
    if (card.stage === to) return;
    if (!data.transitions[card.stage]?.includes(to)) {
      toast.error(`Can't move from ${label(card.stage)} to ${label(to)}`);
      return;
    }
    if (to === 'REJECTED' && data.rejectReasonRequired) {
      setRejecting(card);
      return;
    }
    move.mutate({ card, to });
  };

  const columns = data.stages.filter((s) => s !== 'WITHDRAWN');

  return (
    <>
      <PageHeader
        back={{ to: `/org/jobs/${id}`, label: data.job.title }}
        title="Pipeline"
        subtitle={canMove ? 'Drag cards between stages, or use the “Move to” menu on each card.' : 'Read-only view.'}
        actions={
          can('applications.transition') &&
          data.job.status === 'PUBLISHED' && (
            <Button icon={UserPlus} onClick={() => setAdding(true)}>
              Add candidate
            </Button>
          )
        }
      />
      <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6">
        <div className="flex min-w-max gap-3">
          {columns.map((stage) => {
            const cards = data.applications.filter((a) => a.stage === stage);
            const allowed = dragging ? data.transitions[dragging.stage]?.includes(stage) : false;
            return (
              <section
                key={stage}
                aria-label={label(stage)}
                onDragOver={(e) => {
                  if (allowed) e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragging && allowed) request(dragging, stage);
                  setDragging(null);
                }}
                className={cn(
                  'flex w-64 shrink-0 flex-col rounded-xl border border-t-4 border-slate-200 bg-slate-100/60 transition-colors',
                  COLUMN_TONE[stage],
                  dragging && allowed && 'bg-indigo-50 ring-2 ring-indigo-200',
                  dragging && !allowed && dragging.stage !== stage && 'opacity-60',
                )}
              >
                <header className="flex items-center justify-between px-3 py-2.5">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">{label(stage)}</h3>
                  <span className="rounded-full bg-white px-2 text-xs font-medium text-slate-500">{cards.length}</span>
                </header>
                <div className="flex min-h-[120px] flex-1 flex-col gap-2 px-2 pb-2">
                  {cards.map((card) => (
                    <article
                      key={card.id}
                      draggable={canMove}
                      onDragStart={() => setDragging(card)}
                      onDragEnd={() => setDragging(null)}
                      className={cn('rounded-lg border border-slate-200 bg-white p-3 shadow-sm', canMove && 'cursor-grab active:cursor-grabbing')}
                    >
                      <div className="flex items-start gap-2">
                        {canMove && <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />}
                        <div className="min-w-0 flex-1">
                          <Link to={`/org/applications/${card.id}`} className="block truncate text-sm font-medium text-slate-800 hover:text-indigo-600">
                            {card.candidate.name}
                          </Link>
                          <p className="truncate text-xs text-slate-500">{card.candidate.headline ?? '—'}</p>
                        </div>
                        {card.matchScore != null && (
                          <Badge tone={card.matchScore >= 70 ? 'green' : card.matchScore >= 40 ? 'amber' : 'gray'}>{card.matchScore}%</Badge>
                        )}
                      </div>
                      {card.candidate.skills.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {card.candidate.skills.slice(0, 3).map((s) => (
                            <span key={s} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                      {canMove && data.transitions[card.stage]?.length > 0 && (
                        <select
                          aria-label={`Move ${card.candidate.name}`}
                          value=""
                          onChange={(e) => e.target.value && request(card, e.target.value as Stage)}
                          className="mt-2 w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600 focus:border-indigo-400 focus:outline-none"
                        >
                          <option value="">Move to…</option>
                          {data.transitions[card.stage].map((t) => (
                            <option key={t} value={t}>
                              {label(t)}
                            </option>
                          ))}
                        </select>
                      )}
                    </article>
                  ))}
                  {!cards.length && <p className="px-2 py-6 text-center text-xs text-slate-400">No candidates</p>}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <ConfirmDialog
        open={!!rejecting}
        title={`Reject ${rejecting?.candidate.name}?`}
        message="A reason is required by your organisation's policy. It is stored with the application history."
        tone="danger"
        confirmLabel="Reject"
        onClose={() => {
          setRejecting(null);
          setReason('');
        }}
        onConfirm={() => {
          if (!reason.trim()) return toast.error('Please add a reason');
          move.mutate({ card: rejecting, to: 'REJECTED', reason: reason.trim() });
          setRejecting(null);
          setReason('');
        }}
      >
        <Textarea className="mt-3" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Missing required skills" />
      </ConfirmDialog>

      {adding && <AddToJobSheet jobId={data.job.id} onClose={() => setAdding(false)} />}
    </>
  );
}
