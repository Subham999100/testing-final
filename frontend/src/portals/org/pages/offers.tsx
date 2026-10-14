// ============================================================
// Organisation portal — offers: create, approval chain, send, record
// the candidate's response. Buttons reflect status + permissions; the
// API re-checks both (and blocks approving your own offer).
// ============================================================

import { zodResolver } from "@hookform/resolvers/zod";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { FileSignature } from "lucide-react";
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
import { fmtDate, fmtRelative, fmtSalary, label } from "../lib/format";
import { qk, STALE } from "../lib/queryKeys";
import { usePermissions } from "../lib/session";
import { DataTable } from "../ui/DataTable";
import { toast } from "../ui/toast";
import {
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
  Sheet,
  Stat,
  StatusBadge,
  Textarea,
} from "../ui/ui";

interface OfferRow {
  id: string;
  title: string;
  status: string;
  salary: number;
  currency: string;
  joiningDate: string | null;
  candidate: string;
  applicationId: string;
  job: { id: string; title: string };
  createdBy: string;
  updatedAt: string;
}

export function OffersPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [status, setStatus] = useState(params.get("status") ?? "");
  const [page, setPage] = useState(1);
  useEffect(() => {
    setStatus(params.get("status") ?? "");
    setPage(1);
  }, [params]);
  const { data, isFetching } = useQuery({
    queryKey: qk.offers.list({ status, page }),
    queryFn: () =>
      api.page<OfferRow>("/org/offers", { status, page, limit: 20 }),
    placeholderData: keepPreviousData,
    staleTime: STALE.list,
  });
  return (
    <>
      <PageHeader
        title="Offers"
        subtitle="Draft → approval → sent → accepted."
      />
      <DataTable
        loading={isFetching && !data}
        rows={data?.data}
        meta={data?.meta}
        onPage={setPage}
        onRowClick={(o) => navigate(`/org/offers/${o.id}`)}
        toolbar={
          <FilterChips
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
            options={[
              { value: "", label: "All" },
              { value: "DRAFT", label: "Draft" },
              { value: "PENDING_APPROVAL", label: "Awaiting approval" },
              { value: "APPROVED", label: "Approved" },
              { value: "SENT", label: "Sent" },
              { value: "ACCEPTED", label: "Accepted" },
              { value: "REJECTED", label: "Declined" },
            ]}
          />
        }
        empty={
          <EmptyState
            icon={FileSignature}
            title="No offers"
            text="Create an offer from an application in the Interview or Offer stage."
          />
        }
        columns={[
          {
            key: "cand",
            header: "Candidate",
            cell: (o) => (
              <div>
                <p className="font-medium text-slate-800">{o.candidate}</p>
                <p className="text-xs text-slate-500">{o.job.title}</p>
              </div>
            ),
          },
          {
            key: "salary",
            header: "Salary",
            cell: (o) => fmtSalary(o.salary, o.currency),
          },
          {
            key: "status",
            header: "Status",
            cell: (o) => <StatusBadge status={o.status} />,
          },
          {
            key: "by",
            header: "Created by",
            hideOnMobile: true,
            cell: (o) => o.createdBy,
          },
          {
            key: "updated",
            header: "Updated",
            hideOnMobile: true,
            cell: (o) => fmtRelative(o.updatedAt),
          },
        ]}
      />
    </>
  );
}

// ---------------- create / edit ----------------

const offerSchema = z.object({
  title: z.string().trim().min(2, "Required").max(150),
  salary: z.coerce.number().int().min(0, "Must be positive"),
  currency: z.string().length(3),
  joiningDate: z.string().optional(),
  expiresAt: z.string().optional(),
  notes: z.string().max(3000).optional(),
});

export function CreateOfferSheet({
  applicationId,
  defaultTitle,
  offer,
  onClose,
}: {
  applicationId?: string;
  defaultTitle?: string;
  offer?: {
    id: string;
    title: string;
    salary: number;
    currency: string;
    joiningDate: string | null;
    expiresAt: string | null;
    notes: string | null;
  };
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { register, handleSubmit, formState } = useForm<
    z.infer<typeof offerSchema>
  >({
    resolver: zodResolver(offerSchema),
    defaultValues: offer
      ? {
          ...offer,
          joiningDate: offer.joiningDate?.slice(0, 10) ?? "",
          expiresAt: offer.expiresAt?.slice(0, 10) ?? "",
          notes: offer.notes ?? "",
        }
      : { title: defaultTitle ?? "", currency: "INR" },
  });
  const save = useMutation({
    mutationFn: (v: z.infer<typeof offerSchema>) => {
      const body = {
        ...v,
        joiningDate: v.joiningDate
          ? new Date(v.joiningDate).toISOString()
          : undefined,
        expiresAt: v.expiresAt
          ? new Date(v.expiresAt).toISOString()
          : undefined,
      };
      return offer
        ? api.patch<{ id: string }>(`/org/offers/${offer.id}`, body)
        : api.post<{ id: string }>("/org/offers", { ...body, applicationId });
    },
    onSuccess: (r) => {
      toast.success(offer ? "Offer updated" : "Draft offer created");
      qc.invalidateQueries({ queryKey: qk.offers.all });
      qc.invalidateQueries({ queryKey: qk.applications.all });
      qc.invalidateQueries({ queryKey: qk.pipeline.all });
      onClose();
      if (!offer) navigate(`/org/offers/${r.id}`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const err = formState.errors;
  return (
    <Sheet
      open
      onClose={onClose}
      title={offer ? "Edit offer" : "Create offer"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={save.isPending}
            onClick={handleSubmit((v) => save.mutate(v))}
          >
            {offer ? "Save" : "Create draft"}
          </Button>
        </>
      }
    >
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <Field label="Position title" error={err.title?.message}>
          <Input {...register("title")} />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field
            label="Annual salary"
            error={err.salary?.message}
            className="col-span-2"
          >
            <Input type="number" min={0} {...register("salary")} />
          </Field>
          <Field label="Currency">
            <Input maxLength={3} {...register("currency")} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Joining date">
            <Input type="date" {...register("joiningDate")} />
          </Field>
          <Field label="Offer expires">
            <Input type="date" {...register("expiresAt")} />
          </Field>
        </div>
        <Field label="Notes">
          <Textarea rows={4} {...register("notes")} />
        </Field>
      </form>
    </Sheet>
  );
}

// ---------------- detail ----------------

interface OfferDetail {
  id: string;
  title: string;
  status: string;
  salary: number;
  currency: string;
  joiningDate: string | null;
  expiresAt: string | null;
  notes: string | null;
  candidateName: string;
  application: {
    id: string;
    stage: string;
    job: { id: string; title: string };
  };
  createdBy: string;
  approvedBy: string | null;
  sentAt: string | null;
  respondedAt: string | null;
  history: {
    id: string;
    fromStatus: string | null;
    toStatus: string;
    actor: string;
    note: string | null;
    createdAt: string;
  }[];
  approvalRequired: boolean;
  isCreator: boolean;
}

const ACTIONS: Record<
  string,
  {
    label: string;
    perm: string;
    tone?: "primary" | "secondary" | "danger" | "success";
    note?: boolean;
    confirm?: string;
  }
> = {
  submit: { label: "Submit", perm: "offers.create" },
  approve: { label: "Approve", perm: "offers.approve", tone: "success" },
  reject: {
    label: "Send back",
    perm: "offers.approve",
    tone: "secondary",
    note: true,
  },
  send: {
    label: "Send to candidate",
    perm: "offers.send",
    confirm: "The candidate will be emailed that an offer is on its way.",
  },
  accept: {
    label: "Candidate accepted",
    perm: "offers.send",
    tone: "success",
    confirm: "This marks the candidate as hired.",
  },
  decline: {
    label: "Candidate declined",
    perm: "offers.send",
    tone: "secondary",
  },
  expire: { label: "Mark expired", perm: "offers.send", tone: "secondary" },
  withdraw: {
    label: "Withdraw",
    perm: "offers.create",
    tone: "danger",
    confirm: "Withdrawn offers cannot be reopened.",
  },
};

const BY_STATUS: Record<string, string[]> = {
  DRAFT: ["submit", "withdraw"],
  PENDING_APPROVAL: ["approve", "reject", "withdraw"],
  APPROVED: ["send", "withdraw"],
  SENT: ["accept", "decline", "expire", "withdraw"],
};

export function OfferDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const { can } = usePermissions();
  const { data: o, isLoading } = useQuery({
    queryKey: qk.offers.detail(id),
    queryFn: () => api.get<OfferDetail>(`/org/offers/${id}`),
  });
  const [pending, setPending] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState(false);

  const act = useMutation({
    mutationFn: ({ action, note }: { action: string; note?: string }) =>
      api.post<OfferDetail>(`/org/offers/${id}/actions/${action}`, { note }),
    onSuccess: (res) => {
      qc.setQueryData(qk.offers.detail(id), res);
      qc.invalidateQueries({ queryKey: qk.offers.all });
      qc.invalidateQueries({ queryKey: qk.applications.all });
      qc.invalidateQueries({ queryKey: qk.dashboard });
      toast.success(`Offer ${label(res.status).toLowerCase()}`);
      setPending(null);
      setNote("");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (isLoading || !o) return <PageSkeleton />;
  const actions = (BY_STATUS[o.status] ?? []).filter(
    (a) =>
      can(ACTIONS[a].perm) &&
      !((a === "approve" || a === "reject") && o.isCreator),
  );
  const run = (a: string) =>
    ACTIONS[a].note || ACTIONS[a].confirm
      ? setPending(a)
      : act.mutate({ action: a });

  return (
    <>
      <PageHeader
        back={{ to: "/org/offers", label: "Offers" }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {o.candidateName} <StatusBadge status={o.status} />
          </span>
        }
        subtitle={
          <Link
            to={`/org/applications/${o.application.id}`}
            className="text-indigo-600 hover:underline"
          >
            {o.application.job.title}
          </Link>
        }
        actions={
          <>
            {o.status === "DRAFT" && can("offers.create") && (
              <Button variant="secondary" onClick={() => setEditing(true)}>
                Edit
              </Button>
            )}
            {actions.map((a) => (
              <Button
                key={a}
                variant={ACTIONS[a].tone ?? "primary"}
                loading={act.isPending && act.variables?.action === a}
                onClick={() => run(a)}
              >
                {a === "submit" && !o.approvalRequired
                  ? "Finalise"
                  : ACTIONS[a].label}
              </Button>
            ))}
          </>
        }
      />
      {o.status === "PENDING_APPROVAL" && o.isCreator && (
        <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Waiting for another approver — you cannot approve your own offer.
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5">
          <dl className="grid grid-cols-2 gap-4">
            <Stat label="Position" value={o.title} />
            <Stat label="Salary" value={fmtSalary(o.salary, o.currency)} />
            <Stat label="Joining" value={fmtDate(o.joiningDate)} />
            <Stat label="Expires" value={fmtDate(o.expiresAt)} />
            <Stat label="Created by" value={o.createdBy} />
            <Stat label="Approved by" value={o.approvedBy} />
            <Stat label="Sent" value={fmtDate(o.sentAt)} />
            <Stat label="Responded" value={fmtDate(o.respondedAt)} />
          </dl>
          {o.notes && (
            <p className="mt-4 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
              {o.notes}
            </p>
          )}
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="History" />
          <ol className="space-y-3 px-5 py-4">
            {o.history
              .slice()
              .reverse()
              .map((h) => (
                <li key={h.id} className="flex gap-3 text-sm">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-400" />
                  <div>
                    <p className="text-slate-700">
                      {h.fromStatus ? `${label(h.fromStatus)} → ` : ""}
                      <b>{label(h.toStatus)}</b>{" "}
                      <span className="text-slate-400">by {h.actor}</span>
                    </p>
                    {h.note && (
                      <p className="text-xs text-slate-500">“{h.note}”</p>
                    )}
                    <p className="text-xs text-slate-400">
                      {fmtRelative(h.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
          </ol>
        </Card>
      </div>
      <ConfirmDialog
        open={!!pending}
        title={`${ACTIONS[pending ?? "submit"].label}?`}
        message={
          ACTIONS[pending ?? "submit"].confirm ??
          "Add a note for the offer creator."
        }
        tone={pending === "withdraw" ? "danger" : "primary"}
        confirmLabel={ACTIONS[pending ?? "submit"].label}
        loading={act.isPending}
        onClose={() => setPending(null)}
        onConfirm={() =>
          act.mutate({ action: pending, note: note.trim() || undefined })
        }
      >
        {ACTIONS[pending ?? "submit"].note && (
          <Textarea
            className="mt-3"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        )}
      </ConfirmDialog>
      {editing && (
        <CreateOfferSheet offer={o} onClose={() => setEditing(false)} />
      )}
    </>
  );
}
