// ============================================================
// Organisation portal — interviews: schedule (UTC stored, local shown),
// reschedule, complete/cancel/no-show, structured scorecards.
// ============================================================

import { zodResolver } from "@hookform/resolvers/zod";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { CalendarClock, Star } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { z } from "zod";
import { api, errorMessage } from "../lib/api";
import { fmtDateTime, label, toLocalInput } from "../lib/format";
import { qk, STALE } from "../lib/queryKeys";
import { usePermissions } from "../lib/session";
import { DataTable } from "../ui/DataTable";
import { toast } from "../ui/toast";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  Field,
  Input,
  PageHeader,
  PageSkeleton,
  Select,
  Sheet,
  Stat,
  StatusBadge,
  Tabs,
  Textarea,
} from "../ui/ui";

interface InterviewRow {
  id: string;
  title: string;
  scheduledAt: string;
  durationMinutes: number;
  mode: string;
  status: string;
  candidate: string;
  job: { id: string; title: string };
  applicationId: string;
  interviewers: { id: string; name: string }[];
  feedbackCount: number;
  myFeedbackDue: boolean;
}

type View = "upcoming" | "feedback" | "past" | "all";

export function InterviewsPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [view, setView] = useState<View>(
    params.get("mine") === "true" ? "feedback" : "upcoming",
  );
  const [page, setPage] = useState(1);
  useEffect(() => {
    setView(params.get("mine") === "true" ? "feedback" : "upcoming");
    setPage(1);
  }, [params]);
  const now = new Date().toISOString();
  const filters =
    view === "upcoming"
      ? { from: now, status: "SCHEDULED" }
      : view === "feedback"
        ? { mine: "true", to: now }
        : view === "past"
          ? { to: now }
          : {};
  const { data, isFetching } = useQuery({
    queryKey: qk.interviews.list({ view, page }),
    queryFn: () =>
      api.page<InterviewRow>("/org/interviews", {
        ...filters,
        page,
        limit: 20,
      }),
    placeholderData: keepPreviousData,
    staleTime: STALE.list,
  });
  const rows =
    view === "feedback"
      ? data?.data.filter((r) => r.myFeedbackDue)
      : data?.data;

  return (
    <>
      <PageHeader
        title="Interviews"
        subtitle="Times are shown in your local timezone."
      />
      <Tabs
        value={view}
        onChange={(v) => {
          setView(v);
          setPage(1);
        }}
        tabs={[
          { key: "upcoming", label: "Upcoming" },
          { key: "feedback", label: "Awaiting my feedback" },
          { key: "past", label: "Past" },
          { key: "all", label: "All" },
        ]}
      />
      <DataTable
        loading={isFetching && !data}
        rows={rows}
        meta={view === "feedback" ? undefined : data?.meta}
        onPage={setPage}
        onRowClick={(r) => navigate(`/org/interviews/${r.id}`)}
        empty={
          <EmptyState
            icon={CalendarClock}
            title="No interviews here"
            text="Schedule interviews from an application in the Shortlisted or Interview stage."
          />
        }
        columns={[
          {
            key: "when",
            header: "When",
            cell: (r) => (
              <div>
                <p className="font-medium text-slate-800">
                  {fmtDateTime(r.scheduledAt)}
                </p>
                <p className="text-xs text-slate-500">
                  {r.durationMinutes} min · {label(r.mode)}
                </p>
              </div>
            ),
          },
          {
            key: "cand",
            header: "Candidate",
            cell: (r) => (
              <div>
                <p className="text-slate-800">{r.candidate}</p>
                <p className="text-xs text-slate-500">{r.job.title}</p>
              </div>
            ),
          },
          {
            key: "title",
            header: "Interview",
            hideOnMobile: true,
            cell: (r) => r.title,
          },
          {
            key: "panel",
            header: "Panel",
            hideOnMobile: true,
            cell: (r) => r.interviewers.map((i) => i.name).join(", "),
          },
          {
            key: "status",
            header: "Status",
            cell: (r) => (
              <span className="flex items-center gap-1.5">
                <StatusBadge status={r.status} />
                {r.myFeedbackDue && <Badge tone="amber">Feedback due</Badge>}
              </span>
            ),
          },
        ]}
      />
    </>
  );
}

// ---------------- schedule / reschedule ----------------

const scheduleSchema = z.object({
  title: z.string().trim().min(2, "Required").max(150),
  scheduledAt: z
    .string()
    .min(1, "Pick a date and time")
    .refine(
      (v) => new Date(v).getTime() > Date.now() - 60_000,
      "Must be in the future",
    ),
  durationMinutes: z.coerce.number().int().min(15).max(480),
  mode: z.enum(["VIDEO", "PHONE", "ONSITE"]),
  location: z.string().max(300).optional(),
  notes: z.string().max(2000).optional(),
});

export function ScheduleInterviewSheet({
  applicationId,
  candidateName,
  interview,
  onClose,
}: {
  applicationId?: string;
  candidateName?: string;
  interview?: {
    id: string;
    title: string;
    scheduledAt: string;
    durationMinutes: number;
    mode: string;
    location: string | null;
    notes: string | null;
    interviewers: { id: string }[];
  };
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { me, can } = usePermissions();
  const { data: members } = useQuery({
    queryKey: qk.members.options,
    queryFn: () =>
      api.get<{ id: string; name: string }[]>("/org/members/options"),
    staleTime: STALE.reference,
  });
  const [panel, setPanel] = useState<Set<string>>(
    new Set(
      interview
        ? interview.interviewers.map((i) => i.id)
        : me
          ? [me.user.id]
          : [],
    ),
  );
  const { register, handleSubmit, formState } = useForm<
    z.infer<typeof scheduleSchema>
  >({
    resolver: zodResolver(scheduleSchema),
    defaultValues: interview
      ? {
          ...interview,
          scheduledAt: toLocalInput(interview.scheduledAt),
          mode: interview.mode as "VIDEO",
          location: interview.location ?? "",
          notes: interview.notes ?? "",
        }
      : { title: "Interview", durationMinutes: 45, mode: "VIDEO" },
  });
  const canAssign = can("interviews.assign_interviewer");
  const save = useMutation({
    mutationFn: (v: z.infer<typeof scheduleSchema>) => {
      const body = {
        ...v,
        scheduledAt: new Date(v.scheduledAt).toISOString(),
        interviewerIds: [...panel],
      };
      return interview
        ? api.patch(`/org/interviews/${interview.id}`, body)
        : api.post("/org/interviews", { ...body, applicationId });
    },
    onSuccess: () => {
      toast.success(interview ? "Interview updated" : "Interview scheduled");
      qc.invalidateQueries({ queryKey: qk.interviews.all });
      qc.invalidateQueries({ queryKey: qk.applications.all });
      qc.invalidateQueries({ queryKey: qk.pipeline.all });
      onClose();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const err = formState.errors;
  return (
    <Sheet
      open
      onClose={onClose}
      title={
        interview
          ? "Reschedule interview"
          : `Schedule interview${candidateName ? ` · ${candidateName}` : ""}`
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!panel.size}
            loading={save.isPending}
            onClick={handleSubmit((v) => save.mutate(v))}
          >
            {interview ? "Save" : "Schedule"}
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <Field label="Title" error={err.title?.message}>
          <Input {...register("title")} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date & time" error={err.scheduledAt?.message}>
            <Input type="datetime-local" {...register("scheduledAt")} />
          </Field>
          <Field label="Duration (min)" error={err.durationMinutes?.message}>
            <Input
              type="number"
              min={15}
              step={15}
              {...register("durationMinutes")}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Mode">
            <Select {...register("mode")}>
              <option value="VIDEO">Video</option>
              <option value="PHONE">Phone</option>
              <option value="ONSITE">On-site</option>
            </Select>
          </Field>
          <Field label="Link or location">
            <Input {...register("location")} />
          </Field>
        </div>
        <Field label="Notes for the panel">
          <Textarea rows={3} {...register("notes")} />
        </Field>
        <div>
          <p className="mb-1.5 text-xs font-medium text-slate-600">
            Interview panel{" "}
            {!canAssign && (
              <span className="text-slate-400">
                (you can only add yourself)
              </span>
            )}
          </p>
          <div className="max-h-56 space-y-1.5 overflow-y-auto">
            {(members ?? []).map((m) => {
              const disabled = !canAssign && m.id !== me?.user.id;
              return (
                <label
                  key={m.id}
                  className={`flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm ${disabled ? "opacity-50" : "cursor-pointer hover:bg-slate-50"}`}
                >
                  <input
                    type="checkbox"
                    disabled={disabled}
                    className="rounded border-slate-300"
                    checked={panel.has(m.id)}
                    onChange={() => {
                      const next = new Set(panel);
                      next.has(m.id) ? next.delete(m.id) : next.add(m.id);
                      setPanel(next);
                    }}
                  />
                  {m.name}
                </label>
              );
            })}
          </div>
        </div>
      </form>
    </Sheet>
  );
}

// ---------------- detail ----------------

interface InterviewDetail {
  id: string;
  title: string;
  scheduledAt: string;
  durationMinutes: number;
  mode: string;
  location: string | null;
  status: string;
  notes: string | null;
  application: {
    id: string;
    stage: string;
    candidateName: string;
    job: { id: string; title: string };
  };
  interviewers: { id: string; name: string }[];
  feedback: {
    id: string;
    author: string;
    rating: number;
    recommendation: string;
    strengths: string | null;
    concerns: string | null;
    notes: string | null;
    createdAt: string;
  }[];
  createdBy: string;
  canGiveFeedback: boolean;
}

const feedbackSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  recommendation: z.enum(["STRONG_YES", "YES", "NO", "STRONG_NO"]),
  strengths: z.string().max(3000).optional(),
  concerns: z.string().max(3000).optional(),
  notes: z.string().max(3000).optional(),
});

export function InterviewDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const { can } = usePermissions();
  const key = qk.interviews.detail(id);
  const { data: i, isLoading } = useQuery({
    queryKey: key,
    queryFn: () => api.get<InterviewDetail>(`/org/interviews/${id}`),
  });
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState<"cancel" | "no_show" | null>(null);
  const { register, handleSubmit, reset } = useForm<
    z.infer<typeof feedbackSchema>
  >({
    resolver: zodResolver(feedbackSchema),
    defaultValues: { rating: 3, recommendation: "YES" },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: qk.interviews.all });
    qc.invalidateQueries({ queryKey: qk.dashboard });
  };
  const act = useMutation({
    mutationFn: (action: string) =>
      api.post(`/org/interviews/${id}/actions/${action}`),
    onSuccess: () => {
      toast.success("Interview updated");
      setConfirm(null);
      invalidate();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const feedback = useMutation({
    mutationFn: (v: z.infer<typeof feedbackSchema>) =>
      api.post(`/org/interviews/${id}/feedback`, v),
    onSuccess: () => {
      toast.success("Feedback submitted");
      reset();
      invalidate();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (isLoading || !i) return <PageSkeleton />;
  const canManage = can("interviews.schedule") && i.status === "SCHEDULED";

  return (
    <>
      <PageHeader
        back={{ to: "/org/interviews", label: "Interviews" }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {i.title} <StatusBadge status={i.status} />
          </span>
        }
        subtitle={
          <>
            <Link
              to={`/org/applications/${i.application.id}`}
              className="text-indigo-600 hover:underline"
            >
              {i.application.candidateName}
            </Link>{" "}
            · {i.application.job.title}
          </>
        }
        actions={
          canManage && (
            <>
              <Button
                onClick={() => act.mutate("complete")}
                loading={act.isPending && act.variables === "complete"}
              >
                Mark as done
              </Button>
              <Button variant="secondary" onClick={() => setEditing(true)}>
                Reschedule
              </Button>
              <Button variant="secondary" onClick={() => setConfirm("no_show")}>
                No-show
              </Button>
              <Button variant="danger" onClick={() => setConfirm("cancel")}>
                Cancel
              </Button>
            </>
          )
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5">
          <dl className="grid grid-cols-2 gap-4">
            <Stat label="When" value={fmtDateTime(i.scheduledAt)} />
            <Stat label="Duration" value={`${i.durationMinutes} min`} />
            <Stat label="Mode" value={label(i.mode)} />
            <Stat label="Scheduled by" value={i.createdBy} />
          </dl>
          {i.location && (
            <p className="mt-4 break-all text-sm">
              {/^https:\/\//.test(i.location) ? (
                <a
                  href={i.location}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-indigo-600 hover:underline"
                >
                  {i.location}
                </a>
              ) : (
                i.location
              )}
            </p>
          )}
          <p className="mb-1 mt-4 text-xs text-slate-500">Panel</p>
          <ul className="space-y-1 text-sm text-slate-700">
            {i.interviewers.map((p) => (
              <li key={p.id}>{p.name}</li>
            ))}
          </ul>
          {i.notes && (
            <p className="mt-4 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
              {i.notes}
            </p>
          )}
        </Card>
        <div className="space-y-6 lg:col-span-2">
          {i.canGiveFeedback && (
            <Card>
              <CardHeader
                title="Your scorecard"
                subtitle="Focus on job-relevant evidence."
              />
              <form
                className="space-y-4 p-5"
                onSubmit={handleSubmit((v) => feedback.mutate(v))}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Overall rating (1–5)">
                    <Select {...register("rating")}>
                      {[5, 4, 3, 2, 1].map((n) => (
                        <option key={n} value={n}>
                          {n} {"★".repeat(n)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Recommendation">
                    <Select {...register("recommendation")}>
                      <option value="STRONG_YES">Strong yes</option>
                      <option value="YES">Yes</option>
                      <option value="NO">No</option>
                      <option value="STRONG_NO">Strong no</option>
                    </Select>
                  </Field>
                </div>
                <Field label="Strengths">
                  <Textarea rows={2} {...register("strengths")} />
                </Field>
                <Field label="Concerns">
                  <Textarea rows={2} {...register("concerns")} />
                </Field>
                <Field label="Other notes">
                  <Textarea rows={2} {...register("notes")} />
                </Field>
                <div className="flex justify-end">
                  <Button type="submit" loading={feedback.isPending}>
                    Submit feedback
                  </Button>
                </div>
              </form>
            </Card>
          )}
          <Card>
            <CardHeader
              title={`Feedback (${i.feedback.length}/${i.interviewers.length})`}
            />
            {i.feedback.length ? (
              <ul className="divide-y divide-slate-100">
                {i.feedback.map((f) => (
                  <li key={f.id} className="space-y-1.5 px-5 py-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-800">
                        {f.author}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="flex text-amber-400">
                          {Array.from({ length: f.rating }).map((_, k) => (
                            <Star
                              key={k}
                              className="h-3.5 w-3.5 fill-current"
                            />
                          ))}
                        </span>
                        <Badge
                          tone={
                            f.recommendation.includes("YES") ? "green" : "red"
                          }
                        >
                          {label(f.recommendation)}
                        </Badge>
                      </span>
                    </div>
                    {f.strengths && (
                      <p className="text-slate-600">
                        <b className="text-slate-700">Strengths:</b>{" "}
                        {f.strengths}
                      </p>
                    )}
                    {f.concerns && (
                      <p className="text-slate-600">
                        <b className="text-slate-700">Concerns:</b> {f.concerns}
                      </p>
                    )}
                    {f.notes && <p className="text-slate-600">{f.notes}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-4 text-sm text-slate-400">
                No feedback yet.
              </p>
            )}
          </Card>
        </div>
      </div>
      {editing && (
        <ScheduleInterviewSheet
          interview={i}
          onClose={() => setEditing(false)}
        />
      )}
      <ConfirmDialog
        open={!!confirm}
        title={
          confirm === "cancel" ? "Cancel this interview?" : "Mark as no-show?"
        }
        tone="danger"
        confirmLabel={
          confirm === "cancel" ? "Cancel interview" : "Mark no-show"
        }
        loading={act.isPending}
        onClose={() => setConfirm(null)}
        onConfirm={() => act.mutate(confirm)}
      />
    </>
  );
}
