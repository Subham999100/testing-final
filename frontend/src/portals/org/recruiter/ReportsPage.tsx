import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { api, errorMessage, PageMeta } from "../lib/api";
import { usePermissions } from "../lib/session";
import { Pagination } from "../ui/ui";
import { toast } from "../ui/toast";
import { QueryError } from "./display";
import { root, talentKeys } from "./types";
import "./recruiter.css";
type Metrics = {
  debited: number;
  refunded: number;
  net: number;
  resumeUnlocks: number;
};
type Report = {
  rows: Record<string, unknown>[];
  columns: string[];
  summary: { period: Metrics; daily: Metrics; monthly: Metrics } | null;
  pagination: PageMeta;
  scope: string;
  from: string;
  to: string;
  timeZone: string;
  canExport: boolean;
};
export function ReportsPage() {
  const [params, setParams] = useSearchParams();
  const { can, me } = usePermissions();
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [from, setFrom] = useState(
      params.get("from") || today.slice(0, 7) + "-01",
    ),
    [to, setTo] = useState(params.get("to") || today),
    [feature, setFeature] = useState(params.get("feature") || ""),
    [downloading, setDownloading] = useState(false);
  const tabs = [
    ...(can("tokens.read")
      ? [
          ["usage", "Usage summary report"],
          ["inventory", "Inventory consumption report"],
        ]
      : []),
    ...(can("jobs.read.all", "jobs.read.assigned")
      ? [["jobs", "Job posting detailed report"]]
      : []),
    ...(can("interviews.read") ? [["interviews", "Interview report"]] : []),
    ...(can("offers.read") ? [["offers", "Offer report"]] : []),
  ];
  const type = params.get("type") || tabs[0]?.[0] || "usage";
  const filters = {
    type,
    from: params.get("from") || today.slice(0, 7) + "-01",
    to: params.get("to") || today,
    feature:
      type === "inventory" ? params.get("feature") || undefined : undefined,
    page: Number(params.get("page")) || 1,
    limit: 20,
  };
  const report = useQuery({
    queryKey: [...talentKeys, "reports", filters],
    queryFn: () => api.get<Report>(`${root}/reports`, filters),
    enabled: tabs.length > 0,
  });
  const [format, setFormat] = useState("pdf");
  const exportReport = async () => {
    setDownloading(true);
    try {
      await api.download(
        `${root}/reports/export?${new URLSearchParams(
          Object.fromEntries(
            Object.entries({ ...filters, format })
              .filter(([, v]) => v != null)
              .map(([k, v]) => [k, String(v)]),
          ),
        )}`,
        `clyptus-${type}-${filters.from}-${filters.to}.${format}`,
      );
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setDownloading(false);
    }
  };
  if (!tabs.length)
    return (
      <div className="recruiter-workspace">
        <h1>Reports</h1>
        <p>No report categories are available with your current permissions.</p>
      </div>
    );
  return (
    <div className="recruiter-workspace">
      <header className="r-heading">
        <div>
          <span className="eyebrow">ACTIVITY & USAGE</span>
          <h1>Reports</h1>
          <p>
            {can("analytics.org")
              ? `Organisation reports · ${me?.organisation.name || ""}`
              : "Your recruitment activity and token usage"}
          </p>
        </div>
      </header>
      <div className="r-tabs r-report-tabs">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            className={type === key ? "active" : ""}
            onClick={() =>
              setParams({ type: key, from: filters.from, to: filters.to })
            }
          >
            {label}
          </button>
        ))}
      </div>
      <section className="r-card">
        <form
          className="r-report-filters"
          onSubmit={(e) => {
            e.preventDefault();
            setParams({
              type,
              from,
              to,
              ...(type === "inventory" && feature ? { feature } : {}),
            });
          }}
        >
          <label className="r-field">
            From
            <input
              type="date"
              required
              value={from}
              max={to}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label className="r-field">
            To
            <input
              type="date"
              required
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          {type === "inventory" && (
            <label className="r-field">
              Product / feature
              <select
                value={feature}
                onChange={(e) => setFeature(e.target.value)}
              >
                <option value="">All features</option>
                {[
                  "RESUME_VIEW",
                  "JOB_PUBLISH",
                  "AI_MATCH",
                  "AI_RESUME_PARSE",
                  "AI_JD_IMPROVE",
                  "AI_INTERVIEW_QUESTIONS",
                ].map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </label>
          )}
          <button className="r-button r-primary">Apply filters</button>
          <label className="r-field">
            Download format
            <select value={format} onChange={(e) => setFormat(e.target.value)}>
              <option value="pdf">PDF document</option>
              <option value="xlsx">Excel workbook (.xlsx)</option>
              <option value="csv">CSV</option>
            </select>
          </label>
          {
            <button
              type="button"
              className="r-button"
              disabled={
                !can("exports.run", "reports.export.self") ||
                downloading ||
                report.isPending ||
                report.isError
              }
              onClick={() => void exportReport()}
            >
              <Download size={16} />
              {downloading ? "Downloading…" : "Download report"}
            </button>
          }
        </form>
        {!can("exports.run", "reports.export.self") && (
          <p className="r-help">
            Report downloads require “Download own recruiter reports” permission
            from your organisation administrator.
          </p>
        )}
        <p className="r-help">
          Dates use India Standard Time. Exports include all matching rows, up
          to 10,000; use a smaller date range for larger reports.
        </p>
        {report.isError ? (
          <QueryError
            error={report.error}
            retry={() => void report.refetch()}
          />
        ) : report.isPending ? (
          <p role="status">Loading report…</p>
        ) : (
          report.data && (
            <>
              {report.data.summary && (
                <div className="r-inventory-grid">
                  {(
                    [
                      ["period", "Total inventory · selected dates"],
                      ["daily", `Daily inventory · ${report.data.to}`],
                      [
                        "monthly",
                        `Monthly inventory · ${report.data.to.slice(0, 7)} to selected day`,
                      ],
                    ] as const
                  ).map(([key, title]) => {
                    const metric = report.data!.summary![key];
                    return (
                      <section className="r-inventory-card" key={key}>
                        <h2>{title}</h2>
                        <dl>
                          <dt>Resume unlocks</dt>
                          <dd>{metric.resumeUnlocks}</dd>
                          <dt>Tokens debited</dt>
                          <dd>{metric.debited}</dd>
                          <dt>Tokens refunded</dt>
                          <dd>{metric.refunded}</dd>
                          <dt>Net tokens used</dt>
                          <dd>{metric.net}</dd>
                        </dl>
                      </section>
                    );
                  })}
                </div>
              )}
              <p className="r-help">
                {report.data.scope} · {report.data.pagination.total} rows.{" "}
                {type === "usage" || type === "inventory"
                  ? "Debits include reserved AI tokens; refunds are shown separately. Search counts cover searches made since tracking was enabled."
                  : type === "jobs"
                    ? "Jobs are filtered by publication date."
                    : type === "interviews"
                      ? "Interviews are filtered by scheduled date."
                      : "Offers are filtered by creation date."}
              </p>
              <div className="r-table-scroll">
                <table className="r-report-table">
                  <thead>
                    <tr>
                      {report.data.columns.map((c) => (
                        <th scope="col" key={c}>
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.data.rows.map((row, i) => (
                      <tr key={i}>
                        {report.data!.columns.map((c) => (
                          <td key={c}>{String(row[c] ?? "—")}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!report.data.rows.length && (
                <p>No activity recorded for these dates.</p>
              )}
              <Pagination
                meta={report.data.pagination}
                onPage={(page) =>
                  setParams({
                    ...Object.fromEntries(params),
                    type,
                    page: String(page),
                  })
                }
              />
            </>
          )
        )}
      </section>
    </div>
  );
}
