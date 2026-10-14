import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, errorMessage } from "../lib/api";
import { Sheet } from "../ui/ui";
import { toast } from "../ui/toast";
import {
  CareerEntry,
  ProfessionalProfile,
  TalentDetail,
  root,
  talentKeys,
} from "./types";
const empty: ProfessionalProfile = {
  summary: "",
  designation: "",
  industry: "",
  experienceMonths: 0,
  currentSalary: null,
  expectedSalary: null,
  noticePeriodDays: null,
  preferredLocations: [],
  employmentPreference: "",
  workPreference: "",
  employment: [],
  education: [],
  certifications: [],
  itSkills: [],
};
export function ProfileEditor({
  candidate,
  close,
}: {
  candidate: TalentDetail;
  close: () => void;
}) {
  const qc = useQueryClient();
  const [value, setValue] = useState<ProfessionalProfile>(() => ({
    ...empty,
    ...candidate.professional,
  }));
  const [locations, setLocations] = useState(
    value.preferredLocations.join(", "),
  );
  const save = useMutation({
    mutationFn: () => {
      // Explicit writable fields: candidate activity, identity and contact data cannot be overwritten here.
      const {
        summary,
        designation,
        industry,
        experienceMonths,
        currentSalary,
        expectedSalary,
        noticePeriodDays,
        employmentPreference,
        workPreference,
        employment,
        education,
        certifications,
        itSkills,
        searchDetails,
      } = value;
      return api.patch(`${root}/candidates/${candidate.id}/profile`, {
        searchDetails,
        summary,
        designation,
        industry,
        experienceMonths,
        currentSalary,
        expectedSalary,
        noticePeriodDays,
        preferredLocations: locations
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        employmentPreference,
        workPreference,
        employment: employment.map((row) => ({
          ...row,
          startMonth: row.startMonth || undefined,
          endMonth: row.current ? undefined : row.endMonth || undefined,
        })),
        education,
        certifications,
        itSkills,
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: talentKeys });
      close();
      toast.success("Professional profile saved");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  function text(key: "designation" | "industry", label: string) {
    return (
      <label className="r-field">
        {label}
        <input
          maxLength={120}
          value={value[key]}
          onChange={(e) => setValue((v) => ({ ...v, [key]: e.target.value }))}
        />
      </label>
    );
  }
  function number(
    key:
      | "experienceMonths"
      | "currentSalary"
      | "expectedSalary"
      | "noticePeriodDays",
    label: string,
    max: number,
  ) {
    return (
      <label className="r-field">
        {label}
        <input
          type="number"
          min={0}
          max={max}
          value={value[key] ?? ""}
          onChange={(e) =>
            setValue((v) => ({
              ...v,
              [key]:
                e.target.value === ""
                  ? key === "experienceMonths"
                    ? 0
                    : null
                  : Number(e.target.value),
            }))
          }
        />
      </label>
    );
  }
  function entries(
    key: "employment" | "education" | "certifications",
    title: string,
  ) {
    const rows = value[key];
    const update = (
      i: number,
      field: keyof CareerEntry,
      text: string | boolean,
    ) =>
      setValue((v) => ({
        ...v,
        [key]: v[key].map((r, n) => (n === i ? { ...r, [field]: text } : r)),
      }));
    return (
      <section className="r-editor-section">
        <div className="r-row">
          <h3>{title}</h3>
          <button
            type="button"
            className="r-link"
            disabled={rows.length >= (key === "education" ? 20 : 30)}
            onClick={() =>
              setValue((v) => ({
                ...v,
                [key]: [
                  ...v[key],
                  { title: "", organisation: "", period: "", description: "" },
                ],
              }))
            }
          >
            + Add
          </button>
        </div>
        <small>
          Use month and year for employment. Existing period text is retained
          when structured dates are missing.
        </small>
        {rows.map((r, i) => (
          <fieldset key={i} className="r-entry">
            <legend>
              {title} {i + 1}
            </legend>
            <div className="r-pair">
              <label className="r-field">
                {key === "employment"
                  ? "Job title"
                  : key === "education"
                    ? "Degree"
                    : "Certificate"}
                <input
                  required
                  maxLength={160}
                  value={r.title}
                  onChange={(e) => update(i, "title", e.target.value)}
                />
              </label>
              <label className="r-field">
                {key === "employment"
                  ? "Company"
                  : key === "education"
                    ? "Institute"
                    : "Issuer"}
                <input
                  maxLength={160}
                  value={r.organisation}
                  onChange={(e) => update(i, "organisation", e.target.value)}
                />
              </label>
            </div>
            {key === "employment" ? (
              <>
                <div className="r-pair">
                  <label className="r-field">
                    Start month
                    <input
                      type="month"
                      min="1900-01"
                      max={new Date().toISOString().slice(0, 7)}
                      value={r.startMonth ?? ""}
                      onChange={(e) => update(i, "startMonth", e.target.value)}
                    />
                  </label>
                  <label className="r-field">
                    End month
                    <input
                      type="month"
                      min={r.startMonth || "1900-01"}
                      max={new Date().toISOString().slice(0, 7)}
                      disabled={r.current}
                      value={r.endMonth ?? ""}
                      onChange={(e) => update(i, "endMonth", e.target.value)}
                    />
                  </label>
                </div>
                <label className="r-check">
                  <input
                    type="checkbox"
                    checked={!!r.current}
                    onChange={(e) => {
                      update(i, "current", e.target.checked);
                      if (e.target.checked) update(i, "endMonth", "");
                    }}
                  />
                  Currently working here
                </label>
                {!r.startMonth && r.period && (
                  <p className="r-help">
                    Existing period: {r.period}. Add structured dates to make
                    the timeline precise.
                  </p>
                )}
              </>
            ) : (
              <label className="r-field">
                Period / graduation year
                <input
                  maxLength={80}
                  value={r.period ?? ""}
                  onChange={(e) => update(i, "period", e.target.value)}
                />
              </label>
            )}
            {key === "education" && (
              <label className="r-field">
                Qualification level
                <select
                  value={r.level || ""}
                  onChange={(e) => update(i, "level", e.target.value)}
                >
                  <option value="">Not recorded</option>
                  {["UG", "PG", "PHD", "OTHER"].map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </label>
            )}
            {key === "employment" && (
              <label className="r-field">
                Industry at this company
                <input
                  maxLength={120}
                  value={r.industry || ""}
                  onChange={(e) => update(i, "industry", e.target.value)}
                />
              </label>
            )}
            <label className="r-field">
              Details
              <textarea
                rows={2}
                maxLength={1500}
                value={r.description ?? ""}
                onChange={(e) => update(i, "description", e.target.value)}
              />
            </label>
            <button
              type="button"
              className="r-link"
              onClick={() =>
                setValue((v) => ({
                  ...v,
                  [key]: v[key].filter((_, n) => n !== i),
                }))
              }
            >
              Remove entry
            </button>
          </fieldset>
        ))}
      </section>
    );
  }
  return (
    <Sheet
      open
      onClose={close}
      title={`Edit professional profile · ${candidate.name}`}
      wide
      footer={
        <button
          form="professional-profile-form"
          type="submit"
          className="r-button r-primary"
          disabled={save.isPending}
        >
          {save.isPending ? "Saving…" : "Save profile"}
        </button>
      }
    >
      <form
        id="professional-profile-form"
        className="recruiter-workspace"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <label className="r-field">
          Professional summary
          <textarea
            rows={4}
            maxLength={4000}
            value={value.summary}
            onChange={(e) =>
              setValue((v) => ({ ...v, summary: e.target.value }))
            }
          />
        </label>
        <div className="r-pair">
          {text("designation", "Current designation")}
          {text("industry", "Industry")}
          {number(
            "experienceMonths",
            "Additional experience months (0–11)",
            11,
          )}
          {number(
            "noticePeriodDays",
            "Notice period (days; 0 = immediate)",
            365,
          )}
          {number(
            "currentSalary",
            "Current annual salary (INR rupees)",
            1000000000,
          )}
          {number(
            "expectedSalary",
            "Expected annual salary (INR rupees)",
            1000000000,
          )}
        </div>
        <label className="r-field">
          Preferred locations (comma separated)
          <input
            maxLength={2400}
            value={locations}
            onChange={(e) => setLocations(e.target.value)}
          />
        </label>
        <div className="r-pair">
          <label className="r-field">
            Employment preference
            <select
              value={value.employmentPreference}
              onChange={(e) =>
                setValue((v) => ({
                  ...v,
                  employmentPreference: e.target.value,
                }))
              }
            >
              <option value="">Not specified</option>
              {["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP"].map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>
          <label className="r-field">
            Work preference
            <select
              value={value.workPreference}
              onChange={(e) =>
                setValue((v) => ({ ...v, workPreference: e.target.value }))
              }
            >
              <option value="">Not specified</option>
              {["ONSITE", "HYBRID", "REMOTE"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>
        <section className="r-editor-section">
          <h3>Search details</h3>
          <label className="r-field">
            Work authorisations (candidate declared)
          </label>
          <div className="r-chip-options">
            {[
              ["INDIA_WORK_AUTH", "Authorised to work in India"],
              ["H1B", "H-1B"],
              ["L1", "L-1"],
              ["TN", "TN permit"],
              ["US_WORK_AUTH", "Authorised to work in the US"],
            ].map(([key, label]) => {
              const selected = value.searchDetails?.workAuthorisations || [],
                active = selected.includes(key);
              return (
                <button
                  type="button"
                  key={key}
                  aria-pressed={active}
                  className={`r-chip ${active ? "active" : ""}`}
                  onClick={() =>
                    setValue((v) => ({
                      ...v,
                      searchDetails: {
                        ...v.searchDetails,
                        workAuthorisations: active
                          ? selected.filter((k) => k !== key)
                          : [...selected, key],
                      },
                    }))
                  }
                >
                  {label} {active ? "✓" : "+"}
                </button>
              );
            })}
          </div>
          <p className="r-help">
            Record facts from the candidate’s supplied information. Leave
            unknown details unselected.
          </p>
          <label className="r-field">
            Languages (comma separated)
            <input
              value={(value.searchDetails?.languages || []).join(",")}
              onChange={(e) =>
                setValue((v) => ({
                  ...v,
                  searchDetails: {
                    ...v.searchDetails,
                    languages: e.target.value.split(","),
                  },
                }))
              }
            />
          </label>
          <label className="r-field">
            Portfolio URL (HTTPS)
            <input
              type="url"
              value={value.searchDetails?.portfolioUrl || ""}
              onChange={(e) =>
                setValue((v) => ({
                  ...v,
                  searchDetails: {
                    ...v.searchDetails,
                    portfolioUrl: e.target.value || undefined,
                  },
                }))
              }
            />
          </label>
          <label className="r-field">
            Date of birth (YYYY-MM-DD)
            <input
              type="date"
              value={value.searchDetails?.dateOfBirth || ""}
              onChange={(e) =>
                setValue((v) => ({
                  ...v,
                  searchDetails: {
                    ...v.searchDetails,
                    dateOfBirth: e.target.value || undefined,
                  },
                }))
              }
            />
          </label>
          {(
            [
              ["servingNotice", "Currently serving notice"],
              ["educationComplete", "Education history is complete"],
              ["emailOptOut", "Candidate has opted out of recruitment email"],
            ] as const
          ).map(([key, label]) => (
            <label className="r-check" key={key}>
              <input
                type="checkbox"
                checked={!!value.searchDetails?.[key]}
                onChange={(e) =>
                  setValue((v) => ({
                    ...v,
                    searchDetails: {
                      ...v.searchDetails,
                      [key]: e.target.checked,
                    },
                  }))
                }
              />
              {label}
            </label>
          ))}
          <label className="r-field">Recorded experience insights</label>
          <div className="r-chip-options">
            {[
              ["startup", "Startup experience"],
              ["promoted", "Promoted in current company"],
              ["founder", "Founder experience"],
              ["earlyStartup", "Early startup employee"],
              ["phdUnder4", "Completed PhD in under 4 years"],
            ].map(([key, label]) => {
              const tags = value.searchDetails?.insights || [],
                active = tags.includes(key);
              return (
                <button
                  type="button"
                  key={key}
                  className={`r-chip ${active ? "active" : ""}`}
                  aria-pressed={active}
                  onClick={() =>
                    setValue((v) => ({
                      ...v,
                      searchDetails: {
                        ...v.searchDetails,
                        insights: active
                          ? tags.filter((t) => t !== key)
                          : [...tags, key],
                      },
                    }))
                  }
                >
                  {label} {active ? "✓" : "+"}
                </button>
              );
            })}
          </div>
        </section>
        {entries("employment", "Employment")}
        {entries("education", "Education")}
        {entries("certifications", "Certifications")}
        <section className="r-editor-section">
          <div className="r-row">
            <h3>IT skills</h3>
            <button
              type="button"
              className="r-link"
              disabled={value.itSkills.length >= 100}
              onClick={() =>
                setValue((v) => ({
                  ...v,
                  itSkills: [
                    ...v.itSkills,
                    { name: "", version: "", lastUsed: "", months: 0 },
                  ],
                }))
              }
            >
              + Add skill
            </button>
          </div>
          {value.itSkills.map((skill, i) => (
            <fieldset className="r-entry" key={i}>
              <legend>Skill {i + 1}</legend>
              <div className="r-pair">
                {(["name", "version", "lastUsed"] as const).map((k) => (
                  <label className="r-field" key={k}>
                    {k === "name"
                      ? "Skill"
                      : k === "version"
                        ? "Version"
                        : "Last used (year)"}
                    <input
                      required={k === "name"}
                      maxLength={
                        k === "lastUsed" ? 10 : k === "version" ? 40 : 80
                      }
                      value={skill[k] ?? ""}
                      onChange={(e) =>
                        setValue((v) => ({
                          ...v,
                          itSkills: v.itSkills.map((s, n) =>
                            n === i ? { ...s, [k]: e.target.value } : s,
                          ),
                        }))
                      }
                    />
                  </label>
                ))}
                <label className="r-field">
                  Experience (months)
                  <input
                    type="number"
                    min={0}
                    max={720}
                    value={skill.months ?? 0}
                    onChange={(e) =>
                      setValue((v) => ({
                        ...v,
                        itSkills: v.itSkills.map((s, n) =>
                          n === i
                            ? { ...s, months: Number(e.target.value) }
                            : s,
                        ),
                      }))
                    }
                  />
                </label>
              </div>
              <button
                type="button"
                className="r-link"
                onClick={() =>
                  setValue((v) => ({
                    ...v,
                    itSkills: v.itSkills.filter((_, n) => n !== i),
                  }))
                }
              >
                Remove skill
              </button>
            </fieldset>
          ))}
        </section>
      </form>
    </Sheet>
  );
}
