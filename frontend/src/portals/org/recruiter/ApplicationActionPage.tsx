import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useDebounced } from "../lib/format";
import { Pagination } from "../ui/ui";
import { ScheduleInterviewSheet } from "../pages/interviews";
import { CreateOfferSheet } from "../pages/offers";
import { QueryError } from "./display";
import "./recruiter.css";
type App = {
  id: string;
  candidate: { name: string };
  job: { title: string };
  stage: string;
};
export function ScheduleInterviewPage() {
  return <ApplicationAction kind="interview" />;
}
export function NewOfferPage() {
  return <ApplicationAction kind="offer" />;
}
function ApplicationAction({ kind }: { kind: "interview" | "offer" }) {
  const [search, setSearch] = useState(""),
    [page, setPage] = useState(1),
    [stage, setStage] = useState(
      kind === "interview" ? "SHORTLISTED" : "INTERVIEW",
    ),
    [selected, setSelected] = useState<App | null>(null);
  const q = useDebounced(search);
  const result = useQuery({
    queryKey: ["org", "applications", "action-picker", kind, q, stage, page],
    queryFn: () =>
      api.page<App>("/org/applications", { search: q, stage, page, limit: 20 }),
  });
  return (
    <div className="recruiter-workspace">
      <header className="r-heading">
        <div>
          <h1>
            {kind === "interview" ? "Schedule interview" : "Create offer"}
          </h1>
          <p>Choose an eligible application to continue.</p>
        </div>
      </header>
      <section className="r-card">
        <div className="r-pair">
          <label className="r-field">
            Find candidate or job
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <label className="r-field">
            Application stage
            <select
              value={stage}
              onChange={(e) => {
                setStage(e.target.value);
                setPage(1);
              }}
            >
              {(kind === "interview"
                ? ["SHORTLISTED", "INTERVIEW"]
                : ["INTERVIEW", "OFFER"]
              ).map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>
        {result.isError ? (
          <QueryError
            error={result.error}
            retry={() => void result.refetch()}
          />
        ) : result.isPending ? (
          <p>Loading applications…</p>
        ) : result.data?.data.length ? (
          result.data.data.map((a) => (
            <div className="r-list-row" key={a.id}>
              <div>
                <strong>{a.candidate.name}</strong>
                <p>{a.job.title}</p>
              </div>
              <button className="r-button" onClick={() => setSelected(a)}>
                Select application
              </button>
            </div>
          ))
        ) : (
          <p>No eligible applications found.</p>
        )}
        <Pagination meta={result.data?.meta} onPage={setPage} />
      </section>
      {selected &&
        (kind === "interview" ? (
          <ScheduleInterviewSheet
            applicationId={selected.id}
            candidateName={selected.candidate.name}
            onClose={() => setSelected(null)}
          />
        ) : (
          <CreateOfferSheet
            applicationId={selected.id}
            defaultTitle={selected.job.title}
            onClose={() => setSelected(null)}
          />
        ))}
    </div>
  );
}