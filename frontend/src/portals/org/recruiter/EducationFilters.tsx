import React from "react";
import { UG_COURSES, PG_COURSES, PHD_COURSES, PASSING_YEARS } from "./search-tools";
import { ChevronDown, X } from "lucide-react";

interface EducationFiltersProps {
  values: Record<string, string>;
  set: (key: string, value: string) => void;
  showPhd: boolean;
  setShowPhd: (show: boolean) => void;
}

export function EducationFilters({
  values,
  set,
  showPhd,
  setShowPhd,
}: EducationFiltersProps) {
  const handleUgSelect = (mode: string) => {
    if (values.ug === mode) {
      set("ug", "");
      set("ugCourse", "");
      set("ugInstitute", "");
      set("ugYearFrom", "");
      set("ugYearTo", "");
    } else {
      set("ug", mode);
      if (mode === "none") {
        set("ugCourse", "");
        set("ugInstitute", "");
        set("ugYearFrom", "");
        set("ugYearTo", "");
      } else if (mode === "any") {
        set("ugCourse", "");
        set("ugInstitute", "");
      }
    }
  };

  const handlePgSelect = (mode: string) => {
    if (values.pg === mode) {
      set("pg", "");
      set("pgCourse", "");
      set("pgInstitute", "");
      set("pgYearFrom", "");
      set("pgYearTo", "");
    } else {
      set("pg", mode);
      if (mode === "none") {
        set("pgCourse", "");
        set("pgInstitute", "");
        set("pgYearFrom", "");
        set("pgYearTo", "");
      } else if (mode === "any") {
        set("pgCourse", "");
        set("pgInstitute", "");
      }
    }
  };

  const handlePhdSelect = (mode: string) => {
    if (values.phd === mode) {
      set("phd", "");
      set("phdCourse", "");
      set("phdInstitute", "");
      set("phdYearFrom", "");
      set("phdYearTo", "");
    } else {
      set("phd", mode);
      if (mode === "none") {
        set("phdCourse", "");
        set("phdInstitute", "");
        set("phdYearFrom", "");
        set("phdYearTo", "");
      } else if (mode === "any") {
        set("phdCourse", "");
        set("phdInstitute", "");
      }
    }
  };

  const renderPassingYear = (prefix: string, label: string) => (
    <div style={{ marginTop: "12px" }}>
      <small
        style={{
          fontWeight: 600,
          display: "block",
          marginBottom: "6px",
          color: "var(--r-muted)",
        }}
      >
        Passing Year ({label})
      </small>
      <div className="r-pair" style={{ gap: "12px" }}>
        <div className="r-field" style={{ margin: 0 }}>
          <span className="r-select-wrap">
            <select
              aria-label={`${label} passing year from`}
              value={values[`${prefix}YearFrom`] || ""}
              onChange={(e) => set(`${prefix}YearFrom`, e.target.value)}
            >
              <option value="">From</option>
              {PASSING_YEARS.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
            <ChevronDown size={16} />
          </span>
        </div>
        <div className="r-field" style={{ margin: 0 }}>
          <span className="r-select-wrap">
            <select
              aria-label={`${label} passing year to`}
              value={values[`${prefix}YearTo`] || ""}
              onChange={(e) => set(`${prefix}YearTo`, e.target.value)}
            >
              <option value="">To</option>
              {PASSING_YEARS.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
            <ChevronDown size={16} />
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* UG Section */}
      <div>
        <h3
          style={{
            fontSize: "0.9rem",
            color: "var(--r-muted)",
            marginBottom: "8px",
          }}
        >
          Under graduation qualification
        </h3>
        <div
          className="r-chip-options"
          style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}
        >
          <button
            type="button"
            className={`r-chip ${values.ug === "any" ? "active" : ""}`}
            onClick={() => handleUgSelect("any")}
          >
            Any UG {values.ug === "any" && "x"}
          </button>
          <button
            type="button"
            className={`r-chip ${values.ug === "specific" ? "active" : ""}`}
            onClick={() => handleUgSelect("specific")}
          >
            Specific UG {values.ug === "specific" && "x"}
          </button>
          <button
            type="button"
            className={`r-chip ${values.ug === "none" ? "active" : ""}`}
            onClick={() => handleUgSelect("none")}
          >
            No UG {values.ug === "none" && "x"}
          </button>
        </div>

        {values.ug === "any" && renderPassingYear("ug", "Under graduation")}

        {values.ug === "specific" && (
          <div
            style={{
              marginTop: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              paddingLeft: "4px",
            }}
          >
            <label className="r-field" style={{ margin: 0 }}>
              Course
              <input
                type="text"
                list="ug-courses-list"
                placeholder="Enter or select course"
                value={values.ugCourse || values.ugText || ""}
                onChange={(e) => {
                  set("ugCourse", e.target.value);
                  set("ugText", e.target.value);
                }}
              />
              <datalist id="ug-courses-list">
                {UG_COURSES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </label>

            <label className="r-field" style={{ margin: 0 }}>
              Institute
              <input
                type="text"
                placeholder="Enter institute"
                value={values.ugInstitute || ""}
                onChange={(e) => set("ugInstitute", e.target.value)}
              />
            </label>

            {renderPassingYear("ug", "Under graduation")}
          </div>
        )}
      </div>

      {/* PG Section */}
      <div>
        <h3
          style={{
            fontSize: "0.9rem",
            color: "var(--r-muted)",
            marginBottom: "8px",
          }}
        >
          Post graduation qualification
        </h3>
        <div
          className="r-chip-options"
          style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}
        >
          <button
            type="button"
            className={`r-chip ${values.pg === "any" ? "active" : ""}`}
            onClick={() => handlePgSelect("any")}
          >
            Any PG {values.pg === "any" && "x"}
          </button>
          <button
            type="button"
            className={`r-chip ${values.pg === "specific" ? "active" : ""}`}
            onClick={() => handlePgSelect("specific")}
          >
            Specific PG {values.pg === "specific" && "x"}
          </button>
          <button
            type="button"
            className={`r-chip ${values.pg === "none" ? "active" : ""}`}
            onClick={() => handlePgSelect("none")}
          >
            No PG {values.pg === "none" && "x"}
          </button>
        </div>

        {values.pg === "any" && renderPassingYear("pg", "Post graduation")}

        {values.pg === "specific" && (
          <div
            style={{
              marginTop: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              paddingLeft: "4px",
            }}
          >
            <label className="r-field" style={{ margin: 0 }}>
              Course
              <input
                type="text"
                list="pg-courses-list"
                placeholder="Enter or select course"
                value={values.pgCourse || values.pgText || ""}
                onChange={(e) => {
                  set("pgCourse", e.target.value);
                  set("pgText", e.target.value);
                }}
              />
              <datalist id="pg-courses-list">
                {PG_COURSES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </label>

            <label className="r-field" style={{ margin: 0 }}>
              Institute
              <input
                type="text"
                placeholder="Enter institute"
                value={values.pgInstitute || ""}
                onChange={(e) => set("pgInstitute", e.target.value)}
              />
            </label>

            {renderPassingYear("pg", "Post graduation")}
          </div>
        )}
      </div>

      {/* Doctorate Section */}
      <div>
        {!showPhd ? (
          <button
            type="button"
            className="r-link"
            style={{ alignSelf: "flex-start", fontWeight: 500 }}
            onClick={() => setShowPhd(true)}
          >
            + Add Doctorate qualification
          </button>
        ) : (
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "8px",
              }}
            >
              <h3
                style={{
                  fontSize: "0.9rem",
                  color: "var(--r-muted)",
                  margin: 0,
                }}
              >
                Doctorate qualification
              </h3>
              <button
                type="button"
                className="r-link"
                style={{ fontSize: "12px", color: "var(--r-muted)" }}
                onClick={() => {
                  setShowPhd(false);
                  set("phd", "");
                  set("phdCourse", "");
                  set("phdInstitute", "");
                  set("phdYearFrom", "");
                  set("phdYearTo", "");
                }}
              >
                - Remove Doctorate qualification
              </button>
            </div>
            <div
              className="r-chip-options"
              style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}
            >
              <button
                type="button"
                className={`r-chip ${values.phd === "any" ? "active" : ""}`}
                onClick={() => handlePhdSelect("any")}
              >
                Any PhD {values.phd === "any" && "x"}
              </button>
              <button
                type="button"
                className={`r-chip ${values.phd === "specific" ? "active" : ""}`}
                onClick={() => handlePhdSelect("specific")}
              >
                Specific PhD {values.phd === "specific" && "x"}
              </button>
              <button
                type="button"
                className={`r-chip ${values.phd === "none" ? "active" : ""}`}
                onClick={() => handlePhdSelect("none")}
              >
                No PhD {values.phd === "none" && "x"}
              </button>
            </div>

            {values.phd === "any" && renderPassingYear("phd", "Doctorate")}

            {values.phd === "specific" && (
              <div
                style={{
                  marginTop: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  paddingLeft: "4px",
                }}
              >
                <label className="r-field" style={{ margin: 0 }}>
                  Course / Specialisation
                  <input
                    type="text"
                    list="phd-courses-list"
                    placeholder="Enter or select specialisation"
                    value={values.phdCourse || values.phdText || ""}
                    onChange={(e) => {
                      set("phdCourse", e.target.value);
                      set("phdText", e.target.value);
                    }}
                  />
                  <datalist id="phd-courses-list">
                    {PHD_COURSES.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </label>

                <label className="r-field" style={{ margin: 0 }}>
                  Institute
                  <input
                    type="text"
                    placeholder="Enter institute"
                    value={values.phdInstitute || ""}
                    onChange={(e) => set("phdInstitute", e.target.value)}
                  />
                </label>

                {renderPassingYear("phd", "Doctorate")}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
