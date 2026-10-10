import React, { useState } from "react";
import { Briefcase } from "lucide-react";
import { CareerEntry } from "./types";
import { careerSegments, employmentPeriod, monthLabel } from "./career";
export function CareerTimeline({ rows = [] }: { rows?: CareerEntry[] }) {
  const { dated, gaps } = careerSegments(rows);
  const [selected, setSelected] = useState<number | null>(null);
  const from = dated[0]?.dates.start ?? 0,
    to = Math.max(...dated.map((d) => d.dates.end), from + 1),
    span = to - from;
  const active =
    dated.find((d) => d.index === selected) || dated[dated.length - 1];
  return (
    <section className="r-career-timeline" aria-label="Employment timeline">
      <h2>Career timeline</h2>
      {!dated.length ? (
        <p className="r-muted">
          Add employment start and end months to display the timeline.
        </p>
      ) : (
        <>
          <div className="r-career-scroll">
            <div className="r-career-track">
              <div className="r-career-line" />
              {gaps.map((gap, i) => (
                <span
                  key={i}
                  className="r-career-gap"
                  style={{
                    left: `${((gap.start - from) / span) * 100}%`,
                    width: `${((gap.end - gap.start) / span) * 100}%`,
                  }}
                  title={`Gap between recorded roles: ${monthLabel(gap.start)} – ${monthLabel(gap.end)}`}
                />
              ))}
              {dated.map((d, i) => (
                <button
                  key={d.index}
                  type="button"
                  className={`r-career-point ${i % 2 ? "staggered" : ""} ${active?.index === d.index ? "active" : ""}`}
                  style={{
                    left: `${((d.dates.start - from) / span) * 100}%`,
                    top: 20,
                  }}
                  aria-label={`${d.row.organisation}, ${d.row.title}, ${employmentPeriod(d.row)}`}
                  aria-pressed={active?.index === d.index}
                  onMouseEnter={() => setSelected(d.index)}
                  onFocus={() => setSelected(d.index)}
                  onClick={() => setSelected(d.index)}
                >
                  <span className="r-career-dot" />
                  <small>{monthLabel(d.dates.start)}</small>
                </button>
              ))}
              <span className="r-career-end">{monthLabel(to)}</span>
            </div>
          </div>
          {active && (
            <div className="r-career-detail" role="status">
              <Briefcase size={18} />
              <div>
                <strong>
                  {active.row.organisation || "Company not specified"}
                </strong>
                <p>{active.row.title}</p>
                <small>{employmentPeriod(active.row)}</small>
              </div>
            </div>
          )}
          {!!gaps.length && (
            <details>
              <summary>Gaps between recorded roles ({gaps.length})</summary>
              {gaps.map((g, i) => (
                <p key={i}>
                  {monthLabel(g.start)} – {monthLabel(g.end)} ({g.end - g.start}{" "}
                  months between dates)
                </p>
              ))}
              <small>
                Based on recorded dates only; this does not confirm
                unemployment.
              </small>
            </details>
          )}
          {dated.length < rows.length && (
            <p className="r-help">
              Some roles have missing or unrecognised dates and are not plotted.
              No gap is inferred for an incomplete history.
            </p>
          )}
        </>
      )}
    </section>
  );
}