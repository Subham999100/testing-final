import { VoiceSearch } from "./VoiceSearch";
import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  PlusCircle,
  ChevronDown,
  GraduationCap,
  Briefcase,
  Sparkles,
  SlidersHorizontal,
  Bot
} from "lucide-react";
import { SearchPage } from "./SearchPage";
import { SearchHistory } from "./SearchHistory";
import { EducationFilters } from "./EducationFilters";
import { LanguageSelector } from "./LanguageSelector";
import { cleanSearch, searchUrl, interpretNaturalQuery, ExtractedQueryCriteria, AGE_OPTIONS } from "./search-tools";
import { usePermissions } from "../lib/session";
import "./recruiter.css";
export function CandidateSearchEntry() {
  const [p] = useSearchParams();
  return p.get("mode") !== "form" &&
    (p.has("results") ||
      Object.keys(cleanSearch(Object.fromEntries(p))).length > 0) ? (
    <SearchPage />
  ) : (
    <AdvancedSearchPage />
  );
}
export function AdvancedSearchPage() {
  const [params] = useSearchParams(),
    navigate = useNavigate(),
    { can } = usePermissions();
  const defaults = {
    includePreferred: "true",
    includeUnknownSalary: "true",
    includeUnknownNotice: "true",
    booleanMode: "false",
    excludeSynonyms: "false",
  };
  const [v, setV] = useState<Record<string, string>>(() => ({
    ...defaults,
    ...cleanSearch(Object.fromEntries(params)),
  }));
  const [error, setError] = useState("");
  const [jdError, setJdError] = useState("");
  const [voiceError, setVoiceError] = useState("");
  const [searchTab, setSearchTab] = useState("form"),
    [jd, setJd] = useState(""),
    [voiceQuery, setVoiceQuery] = useState("");

  const [extractedCriteria, setExtractedCriteria] = useState<ExtractedQueryCriteria | null>(null);
  const [reviewSearch, setReviewSearch] = useState("");
  const [reviewLocation, setReviewLocation] = useState("");
  const [reviewMinExp, setReviewMinExp] = useState("");
  const [reviewMaxExp, setReviewMaxExp] = useState("");
  const [reviewMinSalLakhs, setReviewMinSalLakhs] = useState("");
  const [reviewMaxSalLakhs, setReviewMaxSalLakhs] = useState("");
  const [reviewNoticeDays, setReviewNoticeDays] = useState("");
  const [reviewWorkMode, setReviewWorkMode] = useState("");

  const handleExtract = (rawText: string) => {
    const result = interpretNaturalQuery(rawText);
    setExtractedCriteria(result);
    setReviewSearch(result.search || "");
    setReviewLocation(result.location || "");
    setReviewMinExp(result.minExperience || "");
    setReviewMaxExp(result.maxExperience || "");
    setReviewMinSalLakhs(result.minSalary ? String(Math.floor(Number(result.minSalary) / 100000)) : "");
    setReviewMaxSalLakhs(result.maxSalary ? String(Math.floor(Number(result.maxSalary) / 100000)) : "");
    setReviewNoticeDays(result.noticeDays || "");
    setReviewWorkMode(result.workMode || "");
  };

  const executeReviewedSearch = () => {
    const cleanParams: Record<string, string> = {};
    if (reviewSearch.trim()) cleanParams.search = reviewSearch.trim();
    if (reviewLocation.trim()) cleanParams.location = reviewLocation.trim();
    if (reviewMinExp.trim()) cleanParams.minExperience = reviewMinExp.trim();
    if (reviewMaxExp.trim()) cleanParams.maxExperience = reviewMaxExp.trim();
    if (reviewMinSalLakhs.trim()) cleanParams.minSalary = String(Number(reviewMinSalLakhs) * 100000);
    if (reviewMaxSalLakhs.trim()) cleanParams.maxSalary = String(Number(reviewMaxSalLakhs) * 100000);
    if (reviewNoticeDays.trim()) cleanParams.noticeDays = reviewNoticeDays.trim();
    if (reviewWorkMode.trim()) cleanParams.workMode = reviewWorkMode.trim();
    if (reviewSearch.includes(" OR ") || reviewSearch.includes(" AND ") || reviewSearch.includes('"')) {
      cleanParams.booleanMode = "true";
    }
    navigate(searchUrl(cleanParams));
  };
  const [months, setMonths] = useState(
      !!(v.minExperienceMonths || v.maxExperienceMonths),
    ),
    [thousands, setThousands] = useState(
      !!(Number(v.minSalary) % 100000 || Number(v.maxSalary) % 100000),
    );
  const [activity, setActivity] = useState(
    v.activeDays
      ? "activeDays"
      : v.updatedDays
        ? "updatedDays"
        : "activityDays",
  );
  const set = (k: string, value: string) => setV((s) => ({ ...s, [k]: value }));
  const field = (k: string, label: string, max = 120) => (
    <label className="r-field">
      {label}
      <input
        value={v[k] || ""}
        maxLength={max}
        onChange={(e) => set(k, e.target.value)}
      />
    </label>
  );
  const select = (k: string, label: string, options: string[][]) => (
    <label className="r-field">
      {label}
      <span className="r-select-wrap">
        <select value={v[k] || ""} onChange={(e) => set(k, e.target.value)}>
          {options.map(([value, text]) => (
            <option key={value} value={value}>
              {text}
            </option>
          ))}
        </select>
        <ChevronDown size={16} />
      </span>
    </label>
  );
  const toggle = (k: string, label: string) => (
    <label className="r-toggle">
      <input
        type="checkbox"
        checked={v[k] === "true"}
        onChange={(e) => set(k, String(e.target.checked))}
      />
      <span className="r-switch" aria-hidden="true" />
      {label}
    </label>
  );
  const rangeOptions = (n: number, label: string) => [
    ["", label],
    ...Array.from({ length: n + 1 }, (_, i) => [String(i), String(i)]),
  ];
  const exp = (prefix: string, label: string) => (
    <div>
      {select(
        prefix + "Experience",
        `Experience (${label})`,
        rangeOptions(60, "Years"),
      )}
      {months &&
        select(
          prefix + "ExperienceMonths",
          `Additional months (${label})`,
          rangeOptions(11, "Months"),
        )}
    </div>
  );
  const salary = (prefix: string, label: string) => {
    const raw = v[prefix + "Salary"],
      total = Number(raw || 0),
      lakh = Math.floor(total / 100000),
      rest = Math.floor((total % 100000) / 1000);
    return (
      <div>
        <label className="r-field">
          Annual salary ({label})
          <span className="r-select-wrap">
            <select
              aria-label={`Salary lakhs ${label}`}
              value={raw == null || raw === "" ? "" : String(lakh)}
              onChange={(e) =>
                set(
                  prefix + "Salary",
                  e.target.value === ""
                    ? ""
                    : String(Number(e.target.value) * 100000 + rest * 1000),
                )
              }
            >
              {rangeOptions(1000, "Lakhs (INR)").map(([key, text]) => (
                <option value={key} key={key}>
                  {text}
                </option>
              ))}
            </select>
            <ChevronDown size={16} />
          </span>
        </label>
        {thousands && (
          <label className="r-field">
            Additional thousands ({label})
            <span className="r-select-wrap">
              <select
                value={rest}
                onChange={(e) =>
                  set(
                    prefix + "Salary",
                    String(lakh * 100000 + Number(e.target.value) * 1000),
                  )
                }
              >
                {Array.from({ length: 100 }, (_, i) => (
                  <option key={i}>{i}</option>
                ))}
              </select>
              <ChevronDown size={16} />
            </span>
          </label>
        )}
      </div>
    );
  };
  const chips = (key: string, values: string[][]) => (
    <div className="r-chip-options" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      {values.map(([value, label]) => (
        <button
          type="button"
          key={value}
          aria-pressed={(v[key] || "") === value}
          className={(v[key] || "") === value ? "r-chip active" : "r-chip"}
          onClick={() => set(key, v[key] === value ? "" : value)}
        >
          {label}
          <span aria-hidden="true">{(v[key] || "") === value ? " ✓" : " +"}</span>
        </button>
      ))}
    </div>
  );

  const toggleArray = (k: string, value: string) => {
    const arr = (v[k] || "").split(",").filter(Boolean);
    const newArr = arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];
    set(k, newArr.join(","));
  };

  const multiChips = (key: string, values: string[][]) => (
    <div className="r-chip-options" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      {values.map(([value, label]) => {
        const active = (v[key] || "").split(",").filter(Boolean).includes(value);
        return (
          <button
            type="button"
            key={value}
            aria-pressed={active}
            className={active ? "r-chip active" : "r-chip"}
            onClick={() => toggleArray(key, value)}
          >
            {label}
            <span aria-hidden="true">{active ? " ✓" : " +"}</span>
          </button>
        );
      })}
    </div>
  );
  const educationChips = [
    ["phdUnder4", "PhD in under 4 years"],
    ["certified", "Has certifications"],
  ];
  const experienceChips = [
    ["startup", "Has startup experience"],
    ["promoted", "Promoted in current company"],
    ["founder", "Has founder experience"],
    ["earlyStartup", "Early employee of startup"],
    ["portfolio", "Has a blog/portfolio"],
    ["structuredHistory", "Structured career history"],
  ];
  const workModeChips = [
    ["ONSITE", "On-site"],
    ["HYBRID", "Hybrid"],
    ["REMOTE", "Remote"],
  ];
  const employmentTypeChips = [
    ["FULL_TIME", "Full-time"],
    ["PART_TIME", "Part-time"],
    ["CONTRACT", "Contract"],
    ["INTERNSHIP", "Internship"],
  ];
  const visaChips = [
    ["H1B", "Have H1 Visa"],
    ["L1", "Have L1 Visa"],
    ["TN", "TN Permit Holder"],
    ["US_WORK_AUTH", "Authorized to work in US"],
  ];
  const scope = [
    ["current", "Current only"],
    ["past", "Past only"],
    ["any", "Current or past"],
  ];
  const submit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError("");
    setJdError("");
    setVoiceError("");

    if (searchTab === "jd") {
      if (!jd.trim()) return;
      handleExtract(jd);
      return;
    }

    if (searchTab === "voice") {
      if (!voiceQuery.trim()) return;
      handleExtract(voiceQuery);
      return;
    }

    if (
      v.maxExperience &&
      Number(v.minExperience || 0) * 12 + Number(v.minExperienceMonths || 0) >
        Number(v.maxExperience) * 12 + Number(v.maxExperienceMonths || 0)
    )
      return setError("Minimum experience exceeds maximum.");
    if (v.minSalary && v.maxSalary && Number(v.minSalary) > Number(v.maxSalary))
      return setError("Minimum salary exceeds maximum.");
    for (const k of ["ug", "pg", "phd"] as const) {
      if (
        v[k] === "specific" &&
        !v[k + "Text"]?.trim() &&
        !v[k + "Course"]?.trim() &&
        !v[k + "Institute"]?.trim() &&
        !v[k + "YearFrom"] &&
        !v[k + "YearTo"]
      )
        return setError(`Enter the specific ${k.toUpperCase()} qualification details.`);
      if (
        v[k + "YearFrom"] &&
        v[k + "YearTo"] &&
        Number(v[k + "YearFrom"]) > Number(v[k + "YearTo"])
      )
        return setError(`Passing year From cannot be after To for ${k.toUpperCase()}.`);
    }
    if (v.minAge && v.maxAge && Number(v.minAge) > Number(v.maxAge))
      return setError("Minimum age exceeds maximum.");
    navigate(searchUrl(v));
  };
  return (
    <div className="recruiter-workspace r-detailed-search">
      <header className="r-heading">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={24} style={{ color: '#c026d3' }} /> Find the right candidates with AI
          </h1>
        </div>
        <span className="r-country" style={{ color: 'var(--r-muted)', fontSize: '0.85rem' }}>
          India <ChevronDown size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />
        </span>
      </header>
      <div className="r-advanced-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', paddingBottom: '120px' }}>
        <form
          id="advanced-search"
          onSubmit={submit}
          className="r-advanced-form"
        >
          <section className="r-card">
            <div className="r-tabs" role="tablist" aria-label="Search method">
              <button
                type="button"
                role="tab"
                aria-selected={searchTab === "form"}
                className={searchTab === "form" ? "active" : ""}
                onClick={() => {
                  setSearchTab("form");
                  setExtractedCriteria(null);
                }}
              >
                Search form <span style={{ fontSize: '0.65rem', background: '#fdf4ff', color: '#c026d3', padding: '2px 6px', borderRadius: '10px', marginLeft: '4px', fontWeight: 700 }}>BETA</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={searchTab === "jd"}
                className={searchTab === "jd" ? "active" : ""}
                onClick={() => setSearchTab("jd")}
              >
                Search by Job Description
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={searchTab === "voice"}
                className={searchTab === "voice" ? "active" : ""}
                onClick={() => setSearchTab("voice")}
              >
                Voice Search
              </button>
            </div>
            {searchTab === "voice" && (
              <VoiceSearch
                value={voiceQuery}
                onChange={(text) => {
                  setVoiceQuery(text);
                  if (voiceError) setVoiceError("");
                }}
                onGenerate={() => handleExtract(voiceQuery)}
                error={voiceError}
              />
            )}
            {searchTab === "jd" && (
              <div style={{ padding: "0 4px", marginBottom: "24px" }}>
                <h2 style={{ margin: "0 0 16px" }}>Find the right candidate matches in seconds!</h2>
                <div style={{ border: "1px solid var(--r-border)", borderRadius: "12px", overflow: "hidden", background: "white" }}>
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--r-border)", fontSize: "13px", color: "var(--r-text)" }}>
                    Write or paste job description here to search
                  </div>
                  <div style={{ position: "relative" }}>
                    <textarea
                      value={jd}
                      maxLength={5000}
                      onChange={(e) => {
                        setJd(e.target.value.slice(0, 5000));
                        if (jdError) setJdError("");
                      }}
                      placeholder="Try something like: I'm looking for software engineering leader over 10 years of experience with AWS and Java in Bengaluru."
                      style={{ width: "100%", height: "200px", border: "none", outline: "none", resize: "none", padding: "16px", fontSize: "1rem", color: "#333" }}
                    />
                    <div style={{ position: "absolute", bottom: "16px", right: "16px", background: "#10b981", color: "white", borderRadius: "4px", padding: "4px", display: "flex" }}>
                      <Bot size={16} />
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", fontSize: "0.8rem", color: "var(--r-muted)", marginTop: "8px" }}>
                  {jd.length}/5000 characters limit
                </div>
                {jdError && <div style={{ color: "#b42318", fontSize: "0.85rem", marginTop: "8px", textAlign: "right" }}>{jdError}</div>}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "16px" }}>
                  <button type="button" onClick={() => { setJd(""); setJdError(""); setExtractedCriteria(null); }} className="r-link" style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                    Clear All
                  </button>
                  <button 
                    type="button" 
                    disabled={!jd.trim()}
                    onClick={() => handleExtract(jd)}
                    className="r-button r-primary"
                  >
                    Extract Criteria & Review
                  </button>
                </div>
              </div>
            )}

            {(searchTab === "jd" || searchTab === "voice") && extractedCriteria && (
              <div className="r-card" style={{ border: "2px solid #c026d3", borderRadius: "12px", padding: "20px", margin: "20px 0 32px", background: "#fdf4ff" }}>
                <h3 style={{ display: "flex", alignItems: "center", gap: "8px", margin: "0 0 12px", color: "#86198f" }}>
                  <Sparkles size={20} /> Review Extracted Search Criteria
                </h3>
                <p style={{ fontSize: "0.9rem", color: "var(--r-text)", marginBottom: "16px" }}>
                  {extractedCriteria.explanation}
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px", marginBottom: "16px" }}>
                  <label className="r-field" style={{ margin: 0 }}>
                    Keywords (Boolean query)
                    <input
                      value={reviewSearch}
                      onChange={(e) => setReviewSearch(e.target.value)}
                      placeholder="Skills / titles"
                    />
                  </label>
                  <label className="r-field" style={{ margin: 0 }}>
                    Location
                    <input
                      value={reviewLocation}
                      onChange={(e) => setReviewLocation(e.target.value)}
                      placeholder="e.g. Bengaluru"
                    />
                  </label>
                  <div className="r-pair" style={{ margin: 0 }}>
                    <label className="r-field" style={{ margin: 0 }}>
                      Min Exp (yrs)
                      <input
                        type="number"
                        min={0}
                        max={60}
                        value={reviewMinExp}
                        onChange={(e) => setReviewMinExp(e.target.value)}
                      />
                    </label>
                    <label className="r-field" style={{ margin: 0 }}>
                      Max Exp (yrs)
                      <input
                        type="number"
                        min={0}
                        max={60}
                        value={reviewMaxExp}
                        onChange={(e) => setReviewMaxExp(e.target.value)}
                      />
                    </label>
                  </div>
                  <div className="r-pair" style={{ margin: 0 }}>
                    <label className="r-field" style={{ margin: 0 }}>
                      Min Salary (Lacs)
                      <input
                        type="number"
                        min={0}
                        max={1000}
                        value={reviewMinSalLakhs}
                        onChange={(e) => setReviewMinSalLakhs(e.target.value)}
                      />
                    </label>
                    <label className="r-field" style={{ margin: 0 }}>
                      Max Salary (Lacs)
                      <input
                        type="number"
                        min={0}
                        max={1000}
                        value={reviewMaxSalLakhs}
                        onChange={(e) => setReviewMaxSalLakhs(e.target.value)}
                      />
                    </label>
                  </div>
                  <label className="r-field" style={{ margin: 0 }}>
                    Notice Period (Days ≤)
                    <input
                      type="number"
                      min={0}
                      max={365}
                      value={reviewNoticeDays}
                      onChange={(e) => setReviewNoticeDays(e.target.value)}
                      placeholder="e.g. 30"
                    />
                  </label>
                  <label className="r-field" style={{ margin: 0 }}>
                    Work Mode
                    <select
                      value={reviewWorkMode}
                      onChange={(e) => setReviewWorkMode(e.target.value)}
                    >
                      <option value="">Any</option>
                      <option value="ONSITE">On-site</option>
                      <option value="HYBRID">Hybrid</option>
                      <option value="REMOTE">Remote</option>
                    </select>
                  </label>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                  <button
                    type="button"
                    className="r-link"
                    onClick={() => setExtractedCriteria(null)}
                  >
                    Dismiss
                  </button>
                  <button
                    type="button"
                    className="r-button r-primary"
                    onClick={executeReviewedSearch}
                  >
                    Search Candidates with Criteria
                  </button>
                </div>
              </div>
            )}

            {searchTab === "form" && (
              <>
                <div style={{ marginBottom: '32px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '0.9rem', color: 'var(--r-muted)', fontWeight: 500, margin: 0 }}>Keywords <span style={{ color: '#c026d3', fontSize: '0.8rem' }}>(AI-powered)</span></h3>
                    <div className="r-row r-search-toggles" style={{ margin: 0 }}>
                      {toggle("booleanMode", "Boolean search")}
                    </div>
                  </div>
                  <div className="r-keyword-row" style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--r-muted)' }} />
                      <input
                        type="text"
                        aria-label="Keywords: skills or job title"
                        value={v.search || ""}
                        onChange={(e) => set("search", e.target.value)}
                        placeholder="Enter keywords like Skills and Job Title"
                        style={{ width: '100%', padding: '12px 12px 12px 40px', border: '1px solid var(--r-border)', borderRadius: '4px', fontSize: '15px' }}
                      />
                    </div>
                    <div style={{ width: '200px' }}>
                      <select style={{ width: '100%', height: '45px', border: '1px solid var(--r-border)', padding: '0 12px', borderRadius: '4px', background: 'var(--r-surface)', fontSize: '14px', color: 'var(--r-text)' }} value={v.searchIn || "profile"} onChange={(e) => set("searchIn", e.target.value)}>
                        <option value="profile">Profile</option>
                        <option value="resume">Attached resume</option>
                        <option value="skills">Skills</option>
                        <option value="headline">Title / designation</option>
                        <option value="titleSkills">Title / designation / skills</option>
                      </select>
                    </div>
                  </div>
                  <div className="r-row r-search-toggles" style={{ marginTop: '12px' }}>
                    {toggle("excludeSynonyms", "Exclude synonyms")}
                  </div>
                  {v.showExcludeKeywords !== "true" ? (
                    <button type="button" className="r-link" onClick={() => set("showExcludeKeywords", "true")} style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      ⊕ Add keywords to exclude from search
                    </button>
                  ) : (
                    <div style={{ marginTop: '16px' }}>
                      <div className="r-field" style={{ margin: 0, position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--r-muted)' }} />
                        <input type="text" value={v.exclude || ""} onChange={(e) => set("exclude", e.target.value)} placeholder="Enter keywords to exclude" style={{ width: '100%', padding: '10px 12px 10px 40px', border: '1px solid var(--r-border)', borderRadius: '4px', fontSize: '14px' }} />
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px' }}>Location</h3>
                  <label className="r-field">
                    Current location
                    <input type="text" value={v.location || ""} onChange={(e) => set("location", e.target.value)} placeholder="Enter current location" />
                  </label>
                  <label className="r-check" style={{ marginTop: '12px' }}>
                    <input type="checkbox" checked={v.includePreferred === "true"} onChange={(e) => set("includePreferred", String(e.target.checked))} />
                    Include relocating candidates
                  </label>
                  <div style={{ marginTop: '16px' }}>
                    <small style={{ fontWeight: 600, display: 'block', marginBottom: '8px', color: '#4b5563' }}>Suggested cities</small>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {["Bengaluru", "Hyderabad", "Gurugram", "Pune", "Delhi", "Chennai", "Mumbai", "Noida"].map(cityName => (
                        <button
                          type="button"
                          key={cityName}
                          className={`r-chip ${v.location === cityName ? 'active' : ''}`}
                          onClick={() => set("location", v.location === cityName ? "" : cityName)}
                        >
                          {cityName}
                        </button>
                      ))}
                    </div>
                  </div>
                  {v.showPreferredLocation !== "true" ? (
                    <button type="button" className="r-link" onClick={() => set("showPreferredLocation", "true")} style={{ marginTop: '16px' }}>+ Add different preferred location</button>
                  ) : (
                    <label className="r-field" style={{ marginTop: '16px' }}>
                      Preferred location
                      <input type="text" value={v.preferredLocation || ""} onChange={(e) => set("preferredLocation", e.target.value)} placeholder="Enter preferred location" />
                    </label>
                  )}
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px' }}>Experience (yrs)</h3>
                  <div className="r-pair">
                    <label className="r-field" style={{ flex: 1 }}>
                      Experience (minimum)
                      <div style={{ display: 'flex', border: '1px solid var(--r-border)', borderRadius: '4px', overflow: 'hidden', background: 'var(--r-surface)' }}>
                        <select
                          aria-label="Experience (minimum)"
                          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', height: '38px', padding: '0 8px' }}
                          value={v.minExperience || ""}
                          onChange={(e) => set("minExperience", e.target.value)}
                        >
                          <option value="">Years</option>
                          {Array.from({length: 30}, (_, i) => <option key={i} value={i}>{i}</option>)}
                        </select>
                        {months && (
                          <>
                            <div style={{ width: '1px', background: 'var(--r-border)' }} />
                            <select
                              aria-label="Experience months (minimum)"
                              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', height: '38px', padding: '0 8px' }}
                              value={v.minExperienceMonths || ""}
                              onChange={(e) => set("minExperienceMonths", e.target.value)}
                            >
                              <option value="">Months</option>
                              {Array.from({length: 12}, (_, i) => <option key={i} value={i}>{i}</option>)}
                            </select>
                          </>
                        )}
                      </div>
                    </label>
                    <label className="r-field" style={{ flex: 1 }}>
                      Experience (maximum)
                      <div style={{ display: 'flex', border: '1px solid var(--r-border)', borderRadius: '4px', overflow: 'hidden', background: 'var(--r-surface)' }}>
                        <select
                          aria-label="Experience (maximum)"
                          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', height: '38px', padding: '0 8px' }}
                          value={v.maxExperience || ""}
                          onChange={(e) => set("maxExperience", e.target.value)}
                        >
                          <option value="">Years</option>
                          {Array.from({length: 30}, (_, i) => <option key={i} value={i}>{i}</option>)}
                        </select>
                        {months && (
                          <>
                            <div style={{ width: '1px', background: 'var(--r-border)' }} />
                            <select
                              aria-label="Experience months (maximum)"
                              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', height: '38px', padding: '0 8px' }}
                              value={v.maxExperienceMonths || ""}
                              onChange={(e) => set("maxExperienceMonths", e.target.value)}
                            >
                              <option value="">Months</option>
                              {Array.from({length: 12}, (_, i) => <option key={i} value={i}>{i}</option>)}
                            </select>
                          </>
                        )}
                      </div>
                    </label>
                  </div>
                  {!months && (
                    <button type="button" className="r-link" onClick={() => setMonths(true)} style={{ marginTop: '8px' }}>+ Add Months</button>
                  )}
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px' }}>Notice period</h3>
                  <div className="r-chip-options" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                    {[
                      ["Immediate joiner", "0"],
                      ["Upto 30 days", "30"],
                      ["Upto 45 days", "45"],
                      ["Upto 60 days", "60"],
                      ["Upto 90 days", "90"],
                      ["Any", ""],
                    ].map(([label, val]) => {
                      const isActive = val === "" ? !v.noticeDays : v.noticeDays === val;
                      return (
                        <button
                          type="button"
                          key={label}
                          className={`r-chip ${isActive ? 'active' : ''}`}
                          onClick={() => set("noticeDays", val === "" ? "" : v.noticeDays === val ? "" : val)}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <small style={{ fontWeight: 600, display: 'block', marginBottom: '8px', color: '#4b5563' }}>Include candidates:</small>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label className="r-check"><input type="checkbox" checked={v.includeUnknownNotice === "true"} onChange={(e) => set("includeUnknownNotice", String(e.target.checked))} /> Without notice period</label>
                    <label className="r-check"><input type="checkbox" checked={v.servingNotice === "true"} onChange={(e) => set("servingNotice", String(e.target.checked))} /> Serving notice period</label>
                  </div>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px' }}>Annual Salary</h3>
                  <div className="r-pair">
                    {salary("min", "Minimum")}
                    {salary("max", "Maximum")}
                  </div>
                  {!thousands && (
                    <button type="button" className="r-link" onClick={() => setThousands(true)} style={{ marginTop: '8px' }}>+ Add Thousand</button>
                  )}
                  <label className="r-check" style={{ marginTop: '16px' }}>
                    <input type="checkbox" checked={v.includeUnknownSalary === "true"} onChange={(e) => set("includeUnknownSalary", String(e.target.checked))} /> Include profiles who have not mentioned current salary
                  </label>
                </div>
              </>
            )}
          </section>
          {searchTab === "form" && (
            <>
              <details className="r-card r-search-accordion" open>
                <summary>
                  <GraduationCap size={20} />
                  Education details
                  <ChevronDown size={18} />
                </summary>
                <div style={{ padding: '8px 0' }}>
                  <EducationFilters
                    values={v}
                    set={set}
                    showPhd={
                      v.showPhd === "true" ||
                      !!v.phd ||
                      !!v.phdCourse ||
                      !!v.phdInstitute ||
                      !!v.phdYearFrom ||
                      !!v.phdYearTo
                    }
                    setShowPhd={(show) => set("showPhd", show ? "true" : "false")}
                  />
                </div>
              </details>

              <details className="r-card r-search-accordion">
                <summary>
                  <Briefcase size={20} />
                  Employment details
                  <ChevronDown size={18} />
                </summary>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label className="r-field" style={{ margin: 0 }}>
                      Industry
                      <input type="text" placeholder="Enter industry" value={v.industry || ""} onChange={(e) => set("industry", e.target.value)} />
                    </label>
                    <label className="r-field" style={{ margin: 0, flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                      Include:
                      <select
                        aria-label="Industry scope"
                        style={{ width: 'auto', border: 'none', color: 'var(--r-muted)', background: 'transparent' }}
                        value={v.industryScope || "current"}
                        onChange={(e) => set("industryScope", e.target.value)}
                      >
                        <option value="current">Current industry</option>
                        <option value="past">Past industry</option>
                        <option value="any">Current or past industry</option>
                      </select>
                    </label>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label className="r-field" style={{ margin: 0 }}>
                      Company
                      <input type="text" placeholder="Enter company name" value={v.company || ""} onChange={(e) => set("company", e.target.value)} />
                    </label>
                    <label className="r-field" style={{ margin: 0, flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                      Include:
                      <select
                        aria-label="Company scope"
                        style={{ width: 'auto', border: 'none', color: 'var(--r-muted)', background: 'transparent' }}
                        value={v.companyScope || "current"}
                        onChange={(e) => set("companyScope", e.target.value)}
                      >
                        <option value="current">Current employees</option>
                        <option value="past">Past employees</option>
                        <option value="any">Current or past employees</option>
                      </select>
                    </label>
                    {v.showExcludeCompany !== "true" ? (
                      <button type="button" className="r-link" style={{ marginTop: '8px', alignSelf: 'flex-start' }} onClick={() => set("showExcludeCompany", "true")}>⊕ Add company to exclude from search</button>
                    ) : (
                      <>
                        <label className="r-field" style={{ margin: 0, marginTop: '12px' }}>
                          Exclude companies
                          <input type="text" placeholder="Add companies to exclude" value={v.excludeCompany || ""} onChange={(e) => set("excludeCompany", e.target.value)} />
                        </label>
                        <label className="r-field" style={{ margin: 0, flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                          Exclude:
                          <select
                            aria-label="Exclude company scope"
                            style={{ width: 'auto', border: 'none', color: 'var(--r-muted)', background: 'transparent' }}
                            value={v.excludeCompanyScope || "current"}
                            onChange={(e) => set("excludeCompanyScope", e.target.value)}
                          >
                            <option value="current">Current employees</option>
                            <option value="past">Past employees</option>
                            <option value="any">Current or past employees</option>
                          </select>
                        </label>
                      </>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label className="r-field" style={{ margin: 0 }}>
                      Designation
                      <input type="text" placeholder="Enter designation" value={v.designation || ""} onChange={(e) => set("designation", e.target.value)} />
                    </label>
                    <label className="r-field" style={{ margin: 0, flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                      Match in:
                      <select
                        aria-label="Designation scope"
                        style={{ width: 'auto', border: 'none', color: 'var(--r-muted)', background: 'transparent' }}
                        value={v.designationScope || "current"}
                        onChange={(e) => set("designationScope", e.target.value)}
                      >
                        <option value="current">Current designation</option>
                        <option value="past">Past designation</option>
                        <option value="any">Current or past designation</option>
                      </select>
                    </label>
                  </div>
                </div>
              </details>

              <details className="r-card r-search-accordion">
                <summary>
                  <Sparkles size={20} />
                  Smart insights
                  <ChevronDown size={18} />
                </summary>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div>
                    <h3 style={{ fontSize: '0.9rem', color: 'var(--r-muted)', marginBottom: '12px' }}>Education</h3>
                    {multiChips("insights", educationChips)}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '0.9rem', color: 'var(--r-muted)', marginBottom: '12px' }}>Experience</h3>
                    {multiChips("insights", experienceChips)}
                  </div>
                </div>
              </details>

              <details className="r-card r-search-accordion">
                <summary>
                  <SlidersHorizontal size={20} />
                  Additional details
                  <ChevronDown size={18} />
                </summary>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div>
                    <h3 style={{ fontSize: '0.9rem', color: 'var(--r-muted)', marginBottom: '12px' }}>Work mode</h3>
                    {chips("workMode", workModeChips)}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '0.9rem', color: 'var(--r-muted)', marginBottom: '12px' }}>Employment type</h3>
                    {chips("employmentType", employmentTypeChips)}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '0.9rem', color: 'var(--r-muted)', marginBottom: '4px' }}>Languages</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--r-muted)', margin: '0 0 8px 0' }}>ⓘ Filter not applicable to sourced profiles</p>
                    <LanguageSelector
                      value={v.languages || v.language || ""}
                      onChange={(val) => {
                        set("languages", val);
                        set("language", val);
                      }}
                    />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '0.9rem', color: 'var(--r-muted)', marginBottom: '8px' }}>Visa status</h3>
                    <div className="r-chip-options" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {visaChips.map(([value, label]) => (
                        <button
                          type="button"
                          key={value}
                          aria-pressed={(v.workAuthorisation || "") === value}
                          className={(v.workAuthorisation || "") === value ? "r-chip active" : "r-chip"}
                          onClick={() => set("workAuthorisation", v.workAuthorisation === value ? "" : value)}
                        >
                          {label}
                          <span aria-hidden="true">{(v.workAuthorisation || "") === value ? " ✓" : " +"}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '0.9rem', color: 'var(--r-muted)', marginBottom: '12px' }}>Hide candidate profiles</h3>
                    <div className="r-chip-options" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      <button
                        type="button"
                        aria-pressed={v.hideEmailed === "true"}
                        className={v.hideEmailed === "true" ? "r-chip active" : "r-chip"}
                        onClick={() => set("hideEmailed", v.hideEmailed === "true" ? "" : "true")}
                      >
                        Already contacted by Email <span aria-hidden="true">{v.hideEmailed === "true" ? "✓" : "+"}</span>
                      </button>
                      <button
                        type="button"
                        aria-pressed={v.hideUnlocked === "true"}
                        className={v.hideUnlocked === "true" ? "r-chip active" : "r-chip"}
                        onClick={() => set("hideUnlocked", v.hideUnlocked === "true" ? "" : "true")}
                      >
                        Already unlocked resumes <span aria-hidden="true">{v.hideUnlocked === "true" ? "✓" : "+"}</span>
                      </button>
                      <button
                        type="button"
                        aria-pressed={v.hideViewed === "true"}
                        className={v.hideViewed === "true" ? "r-chip active" : "r-chip"}
                        onClick={() => set("hideViewed", v.hideViewed === "true" ? "" : "true")}
                      >
                        Profiles I’ve viewed <span aria-hidden="true">{v.hideViewed === "true" ? "✓" : "+"}</span>
                      </button>
                    </div>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '0.9rem', color: 'var(--r-muted)', marginBottom: '4px' }}>Age (Years)</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--r-muted)', margin: '0 0 8px 0' }}>ⓘ Filter not applicable to sourced profiles</p>
                    <div className="r-pair" style={{ gap: '12px' }}>
                      <div className="r-field" style={{ margin: 0 }}>
                        <span className="r-select-wrap">
                          <select
                            aria-label="Age minimum"
                            value={v.minAge || ""}
                            onChange={(e) => set("minAge", e.target.value)}
                          >
                            <option value="">Min</option>
                            {AGE_OPTIONS.map((a) => (
                              <option key={a} value={String(a)}>{a}</option>
                            ))}
                          </select>
                          <ChevronDown size={16} />
                        </span>
                      </div>
                      <div className="r-field" style={{ margin: 0 }}>
                        <span className="r-select-wrap">
                          <select
                            aria-label="Age maximum"
                            value={v.maxAge || ""}
                            onChange={(e) => set("maxAge", e.target.value)}
                          >
                            <option value="">Max</option>
                            {AGE_OPTIONS.map((a) => (
                              <option key={a} value={String(a)}>{a}</option>
                            ))}
                          </select>
                          <ChevronDown size={16} />
                        </span>
                      </div>
                    </div>
                    <label className="r-check" style={{ marginTop: '10px' }}>
                      <input
                        type="checkbox"
                        checked={v.includeUnknownAge === "true"}
                        onChange={(e) => set("includeUnknownAge", e.target.checked ? "true" : "")}
                      />
                      Include profiles without age
                    </label>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '0.9rem', color: 'var(--r-muted)', marginBottom: '12px' }}>Resume & attachments</h3>
                    <div className="r-chip-options" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      <button
                        type="button"
                        aria-pressed={v.hasResume === "true"}
                        className={v.hasResume === "true" ? "r-chip active" : "r-chip"}
                        onClick={() => set("hasResume", v.hasResume === "true" ? "" : "true")}
                      >
                        Profiles with attached resume <span aria-hidden="true">{v.hasResume === "true" ? "✓" : "+"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </details>
            </>
          )}
        </form>
        {can("candidates.search") && (
          <aside>
            <SearchHistory />
          </aside>
        )}
      </div>
      {searchTab === "form" && (
        <footer className="r-fixed-search-footer">
          <div className="r-activity-controls">
            <label>
              <span className="sr-only">Activity type</span>
              <select
                aria-label="Activity type"
                value={activity}
                onChange={(e) => {
                  const next = e.target.value;
                  setV((s) => ({
                    ...s,
                    [activity]: "",
                    [next]: s[activity] || "",
                  }));
                  setActivity(next);
                }}
              >
                <option value="activityDays">Active/updated</option>
                <option value="updatedDays">Updated</option>
                <option value="activeDays">Active</option>
              </select>
            </label>
            <div className="r-activity-divider" />
            <select
              aria-label="Activity period"
              value={v[activity] || ""}
              onChange={(e) => set(activity, e.target.value)}
            >
              <option value="">Any time</option>
              {[
                ["1", "In last day"],
                ["7", "In last 7 days"],
                ["30", "In last month"],
                ["90", "In last 3 months"],
                ["180", "In last 6 months"],
                ["365", "In last year"],
              ].map(([k, t]) => (
                <option value={k} key={k}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          {error && <p role="alert" style={{ color: "#b42318", fontSize: "0.85rem", margin: 0 }}>{error}</p>}
          <div className="r-row">
            <button
              type="button"
              className="r-link"
              onClick={() => {
                setV({ ...defaults });
                setError("");
              }}
            >
              Clear all
            </button>
            <button
              type="submit"
              form="advanced-search"
              className="r-button r-primary"
            >
              Search candidates
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
export function DashboardSearch() {
  const navigate = useNavigate();
  const [keywords, setKeywords] = useState(""),
    [location, setLocation] = useState(""),
    [experience, setExperience] = useState("");
  return (
    <div className="recruiter-workspace r-dashboard-search">
      <section className="r-card">
        <h2>Quick search</h2>
        <form
          className="r-quick-search"
          onSubmit={(e) => {
            e.preventDefault();
            navigate(
              searchUrl({
                search: keywords,
                location,
                minExperience: experience,
              }),
            );
          }}
        >
          <label className="r-field">
            Keywords
            <input
              maxLength={500}
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="Skills or job title"
            />
          </label>
          <label className="r-field">
            Location
            <input
              maxLength={120}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Current or preferred location"
            />
          </label>
          <label className="r-field">
            Minimum experience
            <input
              type="number"
              min={0}
              max={60}
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              placeholder="Years"
            />
          </label>
          <button className="r-button r-primary">Search</button>
        </form>
        <Link className="r-link" to="/org/candidates">
          Advanced search
        </Link>
      </section>
      <SearchHistory />
    </div>
  );
}

