// Server-paginated pipeline: complete stage counts and a compact numbered list.
import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { api, errorMessage, Stage, PageMeta } from "../lib/api";
import { label } from "../lib/format";
import { qk } from "../lib/queryKeys";
import { usePermissions } from "../lib/session";
import { toast } from "../ui/toast";
import { ConfirmDialog, Pagination, Textarea } from "../ui/ui";
import { QueryError } from "../recruiter/display";
import "../recruiter/recruiter.css";

interface PipelineRow {
  id: string;
  stage: Stage;
  matchScore: number | null;
  candidate: { id: string; name: string; headline: string | null };
  assignedTo: { id: string; name: string } | null;
}
interface Pipeline {
  job: { id: string; title: string; status: string };
  stages: Stage[];
  transitions: Record<Stage, Stage[]>;
  rejectReasonRequired: boolean;
  counts: Record<Stage, number>;
  pagination: PageMeta;
  applications: PipelineRow[];
}
export function PipelinePage() {
  const { id = "" } = useParams();
  return <PipelineContent key={id} id={id} />;
}
function PipelineContent({ id }: { id: string }) {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("search") ?? "");
  const filters = {
    page: Math.max(1, Number(params.get("page")) || 1),
    limit: [20, 50, 100].includes(Number(params.get("limit")))
      ? Number(params.get("limit"))
      : 20,
    stage: params.get("stage") || undefined,
    search: params.get("search") || undefined,
  };
  const qc = useQueryClient();
  const { can } = usePermissions();
  const key = qk.pipeline.job(id);
  const result = useQuery({
    queryKey: [...key, filters],
    queryFn: () => api.get<Pipeline>(`/org/jobs/${id}/pipeline`, filters),
    staleTime: 15000,
  });
  const [rejecting, setRejecting] = useState<PipelineRow | null>(null);
  const [reason, setReason] = useState("");
  const canMove = can("ats.move");
  const move = useMutation({
    mutationFn: ({
      row,
      to,
      reason,
    }: {
      row: PipelineRow;
      to: Stage;
      reason?: string;
    }) => api.post(`/org/applications/${row.id}/move`, { toStage: to, reason }),
    onError: (e) =>
      toast.error(errorMessage(e, "Could not move the candidate")),
    onSuccess: (_result, v) => {
      toast.success(`${v.row.candidate.name} → ${label(v.to)}`);
      setRejecting(null);
      setReason("");
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: key });
      void qc.invalidateQueries({ queryKey: qk.applications.all });
      void qc.invalidateQueries({ queryKey: qk.dashboard });
    },
  });
  const update = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params);
    next.set("page", "1");
    Object.entries(changes).forEach(([key, value]) =>
      value ? next.set(key, value) : next.delete(key),
    );
    setParams(next);
  };
  const data = result.data;
  const requestMove = (row: PipelineRow, to: Stage) => {
    if (move.isPending || !data?.transitions[row.stage]?.includes(to)) return;
    if (to === "REJECTED" && data.rejectReasonRequired) {
      setRejecting(row);
      setReason("");
    } else move.mutate({ row, to });
  };
  return (
    <div className="recruiter-workspace r-pipeline">
      <Link className="r-link r-back" to={`/org/jobs/${id}`}>
        ← {data?.job.title ?? "Back to job"}
      </Link>
      <header className="r-heading">
        <div>
          <h1>Pipeline</h1>
          <p>
            Choose a stage to view candidates. Search by name and browse one
            page at a time.
          </p>
        </div>
      </header>
      <form
        className="r-pipeline-filters"
        onSubmit={(e) => {
          e.preventDefault();
          update({ search: search.trim() });
        }}
      >
        <label className="r-field r-grow">
          Candidate name
          <input
            maxLength={150}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search candidates in this job"
          />
        </label>
        <button className="r-button r-primary" type="submit">
          Search
        </button>
        <button
          className="r-button"
          type="button"
          onClick={() => {
            setSearch("");
            setParams({});
          }}
        >
          Reset
        </button>
        <label className="r-field">
          Rows per page
          <select
            value={filters.limit}
            onChange={(e) => update({ limit: e.target.value })}
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </label>
      </form>
      {result.isError ? (
        <QueryError error={result.error} retry={() => void result.refetch()} />
      ) : !data ? (
        <p role="status">Loading pipeline…</p>
      ) : (
        <>
          <div className="r-stage-counts" aria-label="Filter pipeline by stage">
            <button
              className={`r-stage-count ${!filters.stage ? "active" : ""}`}
              aria-pressed={!filters.stage}
              onClick={() => update({ stage: "" })}
            >
              <span>All candidates</span>
              <strong>
                {Object.values(data.counts)
                  .reduce((sum, count) => sum + count, 0)
                  .toLocaleString()}
              </strong>
            </button>
            {data.stages.map((stage) => (
              <button
                key={stage}
                className={`r-stage-count ${filters.stage === stage ? "active" : ""}`}
                aria-pressed={filters.stage === stage}
                onClick={() => update({ stage })}
              >
                <span>{label(stage)}</span>
                <strong>{(data.counts[stage] ?? 0).toLocaleString()}</strong>
              </button>
            ))}
          </div>
          <section className="r-card" aria-busy={result.isFetching}>
            <div className="r-row">
              <h2>
                {filters.stage ? label(filters.stage) : "All candidates"} ·{" "}
                {data.pagination.total.toLocaleString()}
              </h2>
              <span className="r-muted">
                {filters.search
                  ? "Counts match your search"
                  : "All visible applications for this job"}
              </span>
            </div>
            {data.applications.length ? (
              <div className="r-table-scroll">
                <table className="r-pipeline-table">
                  <caption className="sr-only">
                    Candidate pipeline, page {data.pagination.page}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">No.</th>
                      <th scope="col">Candidate name</th>
                      <th scope="col">Stage</th>
                      <th scope="col">Assigned to</th>
                      {canMove && <th scope="col">Move to</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {data.applications.map((row, index) => (
                      <tr key={row.id}>
                        <td>
                          {(data.pagination.page - 1) * data.pagination.limit +
                            index +
                            1}
                        </td>
                        <td>
                          <Link
                            className="r-link"
                            to={`/org/applications/${row.id}`}
                          >
                            {row.candidate.name}
                          </Link>
                          <small className="r-pipeline-headline">
                            {row.candidate.headline || "—"}
                          </small>
                        </td>
                        <td>{label(row.stage)}</td>
                        <td>{row.assignedTo?.name ?? "Unassigned"}</td>
                        {canMove && (
                          <td>
                            {data.transitions[row.stage]?.length ? (
                              <select
                                aria-label={`Move ${row.candidate.name}`}
                                disabled={move.isPending || result.isFetching}
                                value=""
                                onChange={(e) => {
                                  if (e.target.value)
                                    requestMove(row, e.target.value as Stage);
                                }}
                              >
                                <option value="">Move to…</option>
                                {data.transitions[row.stage].map((to) => (
                                  <option key={to} value={to}>
                                    {label(to)}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="r-muted">—</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="r-muted">
                No candidates match this stage and search.
              </p>
            )}
            <Pagination
              meta={data.pagination}
              onPage={(page) => update({ page: String(page) })}
            />
          </section>
        </>
      )}
      <ConfirmDialog
        open={!!rejecting}
        title={`Reject ${rejecting?.candidate.name}?`}
        message="Add the rejection reason required by your organisation."
        confirmLabel="Reject"
        tone="danger"
        loading={move.isPending}
        onClose={() => {
          if (!move.isPending) {
            setRejecting(null);
            setReason("");
          }
        }}
        onConfirm={() => {
          if (!rejecting || move.isPending) return;
          if (!reason.trim()) return toast.error("Please add a reason");
          move.mutate({
            row: rejecting,
            to: "REJECTED",
            reason: reason.trim(),
          });
        }}
      >
        <Textarea
          aria-label="Rejection reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={2000}
          placeholder="Reason for rejection"
        />
      </ConfirmDialog>
    </div>
  );
}