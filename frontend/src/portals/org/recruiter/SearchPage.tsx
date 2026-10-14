import { BulkEmailSheet } from "./BulkEmailSheet";
import { VoiceSearch } from "./VoiceSearch";
import { CommentModal } from "./CommentModal";
import { WhatsAppCampaignSheet } from "./WhatsAppCampaignSheet";
import { SmsDrawer } from "./SmsDrawer";
import { SearchHistory } from "./SearchHistory";
import {
  searchFields,
  searchBody,
  interpretNaturalQuery,
  ExtractedQueryCriteria,
  AGE_OPTIONS,
} from "./search-tools";
import { EducationFilters } from "./EducationFilters";
import { LanguageSelector } from "./LanguageSelector";
import React, { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import {
  Mail,
  MessageCircle,
  MessageSquare,
  Smartphone,
  Search,
  SlidersHorizontal,
  FolderPlus,
  Bookmark,
  X,
  Sparkles,
  ChevronDown,
  Bot
} from "lucide-react";
import { api, errorMessage } from "../lib/api";
import { usePermissions } from "../lib/session";
import { toast } from "../ui/toast";
import { Sheet } from "../ui/ui";
import { Folder, SavedSearch, TalentCard, root, talentKeys } from "./types";
import { ProfileCard, QueryError } from "./display";
import "./recruiter.css";
const allowed = searchFields;
const numbers = new Set([
  "activityDays",
  "minExperienceMonths",
  "maxExperienceMonths",
  "updatedDays",
  "minExperience",
  "maxExperience",
  "minSalary",
  "maxSalary",
  "noticeDays",
  "activeDays",
  "page",
  "limit",
]);
export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const recorded = useRef(new Set<string>());
  const { can, me } = usePermissions();
  const qc = useQueryClient();
  const serial = params.toString();
  const filters = Object.fromEntries(
    [...params.entries()].filter(([k]) => allowed.includes(k)),
  );
  const [recent, setRecent] = useState<string[]>([]);
  const [draft, setDraft] = useState(filters);
  const [mobileFilters, setMobileFilters] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [emailTargets, setEmailTargets] = useState<string[]>([]);
  const [emailOpen, setEmailOpen] = useState(false),
    [selecting, setSelecting] = useState(false);
  const [whatsAppTargets, setWhatsAppTargets] = useState<string[]>([]);
  const [whatsAppOpen, setWhatsAppOpen] = useState(false);
  const [smsTargets, setSmsTargets] = useState<string[]>([]);
  const [smsOpen, setSmsOpen] = useState(false);
  const [commentCandidate, setCommentCandidate] = useState<TalentCard | null>(null);
  const [searchTab, setSearchTab] = useState("Search form BETA");
  const selectionEpoch = useRef(0);
  const selectionKey = JSON.stringify(
    Object.entries(filters)
      .filter(([k]) => !["page", "limit"].includes(k))
      .sort(),
  );
  useEffect(() => {
    setSelected([]);
    selectionEpoch.current++;
  }, [selectionKey]);

  const [folderPicker, setFolderPicker] = useState(false);
  const [folderId, setFolderId] = useState("");
  const [newFolder, setNewFolder] = useState("");
  const [saveOpen, setSaveOpen] = useState(false);
  const [searchName, setSearchName] = useState("");
  const [shared, setShared] = useState(false);
  const [jd, setJd] = useState("");
  const [voiceQuery, setVoiceQuery] = useState("");

  const [showSalaryThousands, setShowSalaryThousands] = useState(false);
  const [showExpMonths, setShowExpMonths] = useState(false);
  const [showPreferredLocation, setShowPreferredLocation] = useState(false);
  const [showPhd, setShowPhd] = useState(false);
  const [showExcludeCompany, setShowExcludeCompany] = useState(false);

  const [extractedCriteria, setExtractedCriteria] = useState<ExtractedQueryCriteria | null>(null);
  const [reviewSearch, setReviewSearch] = useState("");
  const [reviewLocation, setReviewLocation] = useState("");
  const [reviewMinExp, setReviewMinExp] = useState("");
  const [reviewMaxExp, setReviewMaxExp] = useState("");
  const [reviewMinSalLakhs, setReviewMinSalLakhs] = useState("");
  const [reviewMaxSalLakhs, setReviewMaxSalLakhs] = useState("");
  const [reviewNoticeDays, setReviewNoticeDays] = useState("");
  const [reviewWorkMode, setReviewWorkMode] = useState("");

  useEffect(() => {
    if ((Number(draft.minSalary) % 100000 > 0) || (Number(draft.maxSalary) % 100000 > 0)) {
      setShowSalaryThousands(true);
    }
    if (draft.minExperienceMonths || draft.maxExperienceMonths) {
      setShowExpMonths(true);
    }
    if (draft.preferredLocation) {
      setShowPreferredLocation(true);
    }
    if (draft.phd || draft.phdText) {
      setShowPhd(true);
    }
    if (draft.excludeCompany) {
      setShowExcludeCompany(true);
    }
  }, [
    draft.minSalary,
    draft.maxSalary,
    draft.minExperienceMonths,
    draft.maxExperienceMonths,
    draft.preferredLocation,
    draft.phd,
    draft.phdText,
    draft.excludeCompany,
  ]);

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
    const cleanParams: Record<string, string> = {
      results: "1",
      page: "1",
      run: crypto.randomUUID(),
    };
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
    setDraft(cleanParams);
    setParams(cleanParams);
    setSearchTab("Search form BETA");
    setExtractedCriteria(null);
  };
  useEffect(() => {
    setDraft(
      Object.fromEntries(
        [...new URLSearchParams(serial)].filter(([k]) => allowed.includes(k)),
      ),
    );
  }, [serial]);
  useEffect(() => {
    if (!me?.user.id) return;
    try {
      const stored: unknown = JSON.parse(
        sessionStorage.getItem(`clyptus_recent_searches:${me.user.id}`) ?? "[]",
      );
      setRecent(
        Array.isArray(stored)
          ? stored.filter((v): v is string => typeof v === "string").slice(0, 8)
          : [],
      );
    } catch {
      setRecent([]);
    }
  }, [me?.user.id]);
  const result = useQuery({
    queryKey: [...talentKeys, "search", filters],
    queryFn: () => api.page<TalentCard>(`${root}/candidates`, filters),
    staleTime: 15000,
  });
  const run = params.get("run");
  useEffect(() => {
    if (
      !run ||
      !result.data ||
      result.isFetching ||
      !can("candidates.search") ||
      recorded.current.has(run)
    )
      return;
    recorded.current.add(run);
    void api
      .post(`${root}/recent-searches`, {
        requestId: run,
        filters: searchBody(filters),
      })
      .then(() =>
        qc.invalidateQueries({ queryKey: [...talentKeys, "recent-searches"] }),
      )
      .catch(() => {
        recorded.current.delete(run);
      });
  }, [run, result.data, result.isFetching, can]);
  const folders = useQuery({
    queryKey: [...talentKeys, "folders"],
    queryFn: () => api.get<Folder[]>(`${root}/folders`),
    enabled: can("candidates.save"),
  });
  const searches = useQuery({
    queryKey: [...talentKeys, "searches"],
    queryFn: () => api.get<SavedSearch[]>(`${root}/searches`),
    enabled: can("candidates.search"),
  });
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: talentKeys });
  };
  const addFolder = useMutation({
    mutationFn: () =>
      api.post<Folder>(`${root}/folders`, { name: newFolder.trim() }),
    onSuccess: (r) => {
      setFolderId(r.id);
      setNewFolder("");
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const addToFolder = useMutation({
    mutationFn: () =>
      api.post(`${root}/folders/${folderId}/candidates`, {
        candidateIds: selected,
      }),
    onSuccess: () => {
      refresh();
      setSelected([]);
      setFolderPicker(false);
      toast.success("Added to folder");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: () =>
      api.post(`${root}/folders/${filters.folderId}/remove`, {
        candidateIds: selected,
      }),
    onSuccess: () => {
      refresh();
      setSelected([]);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const deleteFolder = useMutation({
    mutationFn: (id: string) => api.del(`${root}/folders/${id}`),
    onSuccess: () => {
      setParams({ results: "1" });
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const saveSearch = useMutation({
    mutationFn: () =>
      api.post(`${root}/searches`, {
        name: searchName.trim(),
        shared,
        filters: Object.fromEntries(
          Object.entries(filters).map(([k, v]) => [
            k,
            numbers.has(k) ? Number(v) : v,
          ]),
        ),
      }),
    onSuccess: () => {
      refresh();
      setSaveOpen(false);
      setSearchName("");
      toast.success("Search saved");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const deleteSearch = useMutation({
    mutationFn: (id: string) => api.del(`${root}/searches/${id}`),
    onSuccess: refresh,
    onError: (e) => toast.error(errorMessage(e)),
  });
  const change = (key: string, value: string) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const apply = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    let currentDraft = { ...draft };
    if (searchTab === "Search by Job Description") {
      if (!jd.trim()) return;
      handleExtract(jd);
      return;
    } else if (searchTab === "Voice Search") {
      if (!voiceQuery.trim()) return;
      handleExtract(voiceQuery);
      return;
    }

    if (
      currentDraft.minSalary &&
      currentDraft.maxSalary &&
      Number(currentDraft.minSalary) > Number(currentDraft.maxSalary)
    ) {
      toast.error("Minimum salary exceeds maximum.");
      return;
    }

    const minTot =
      Number(currentDraft.minExperience || 0) * 12 +
      Number(currentDraft.minExperienceMonths || 0);
    const maxTot =
      Number(currentDraft.maxExperience || 0) * 12 +
      Number(currentDraft.maxExperienceMonths || 0);
    if (currentDraft.maxExperience && minTot > maxTot) {
      toast.error("Minimum experience exceeds maximum.");
      return;
    }

    for (const k of ["ug", "pg", "phd"] as const) {
      if (
        currentDraft[k] === "specific" &&
        !currentDraft[`${k}Text`]?.trim() &&
        !currentDraft[`${k}Course`]?.trim() &&
        !currentDraft[`${k}Institute`]?.trim() &&
        !currentDraft[`${k}YearFrom`] &&
        !currentDraft[`${k}YearTo`]
      ) {
        toast.error(`Enter the specific ${k.toUpperCase()} qualification details.`);
        return;
      }
      if (
        currentDraft[`${k}YearFrom`] &&
        currentDraft[`${k}YearTo`] &&
        Number(currentDraft[`${k}YearFrom`]) > Number(currentDraft[`${k}YearTo`])
      ) {
        toast.error(`Passing year From cannot be after To for ${k.toUpperCase()}.`);
        return;
      }
    }
    if (
      currentDraft.minAge &&
      currentDraft.maxAge &&
      Number(currentDraft.minAge) > Number(currentDraft.maxAge)
    ) {
      toast.error("Minimum age exceeds maximum.");
      return;
    }
    
    setParams(
      Object.fromEntries(
        Object.entries({
          ...currentDraft,
          page: "1",
          results: "1",
          run: crypto.randomUUID(),
        }).filter(([, v]) => v !== ""),
      ),
    );
    setMobileFilters(false);
    if (me?.user.id && currentDraft.search?.trim()) {
      const next = [
        currentDraft.search.trim(),
        ...recent.filter((s) => s !== currentDraft.search?.trim()),
      ].slice(0, 8);
      setRecent(next);
      try {
        sessionStorage.setItem(
          `clyptus_recent_searches:${me.user.id}`,
          JSON.stringify(next),
        );
      } catch {
        /* Optional tab-local history. */
      }
    }
  };
  const update = (key: string, value: string) =>
    setParams({
      ...filters,
      results: "1",
      ...(params.get("run") ? { run: params.get("run")! } : {}),
      [key]: value,
      ...(key !== "page" ? { page: "1" } : {}),
    });
  const toggle = (id: string) =>
    setSelected((ids) =>
      ids.includes(id)
        ? ids.filter((x) => x !== id)
        : ids.length < 1000
          ? [...ids, id]
          : ids,
    );
  const rows = result.data?.data ?? [];
  const meta = result.data?.meta;
  function field(key: string, label: string, type = "text", max?: number) {
    return (
      <label className="r-field">
        {label}
        <input
          value={draft[key] ?? ""}
          type={type}
          min={type === "number" ? 0 : undefined}
          max={max}
          maxLength={120}
          onChange={(e) => change(key, e.target.value)}
        />
      </label>
    );
  }
  return (
    <div className="recruiter-workspace">
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
      <form onSubmit={apply} className="r-search-form">
        <div className="r-tabs r-source-tabs" style={{ marginBottom: 16 }}>
          {["Search form BETA", "Search by Job Description", "Voice Search"].map((tab) => (
            <button
              type="button"
              key={tab}
              className={searchTab === tab ? "active" : ""}
              onClick={() => setSearchTab(tab)}
            >
              {tab === "Search form BETA" ? (
                <>Search form <span style={{ fontSize: '0.65rem', background: '#fdf4ff', color: '#c026d3', padding: '2px 6px', borderRadius: '10px', marginLeft: '4px', fontWeight: 700 }}>BETA</span></>
              ) : (
                tab
              )}
            </button>
          ))}
        </div>
        {searchTab === "Search form BETA" && (
          <>
            <div className="r-searchbar">
              <Search size={20} />
              <input
                aria-label="Keywords"
                maxLength={500}
                value={draft.search ?? ""}
                onChange={(e) => change("search", e.target.value)}
                placeholder="Skills, designation, company… e.g. Java AND (AWS OR Azure)"
              />
              <button className="r-button r-primary" type="submit">
                Search
              </button>
            </div>
            <p className="r-help">
              {filters.booleanMode === "false" ? "All entered words must match. Enable Boolean search in advanced search to use AND, OR and NOT." : "Use AND, OR, NOT and quoted phrases. Matching terms are highlighted in profiles."}
            </p>
          </>
        )}
        {searchTab === "Voice Search" && (
          <VoiceSearch 
            value={voiceQuery}
            onChange={(text) => setVoiceQuery(text)}
            onGenerate={() => handleExtract(voiceQuery)}
          />
        )}
        {searchTab === "Search by Job Description" && (
          <div style={{ padding: "0 4px", marginBottom: "24px" }}>
            <h2 style={{ margin: "0 0 16px" }}>Find the right candidate matches in seconds!</h2>
            <div className="r-jd-search-grid">
              <div>
                <div style={{ border: "1px solid var(--r-border)", borderRadius: "12px", overflow: "hidden", background: "white" }}>
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--r-border)", fontSize: "13px", color: "var(--r-text)", fontWeight: 600 }}>
                    Write or paste job description here to search
                  </div>
                  <div style={{ position: "relative" }}>
                    <textarea
                      value={jd}
                      maxLength={5000}
                      onChange={(e) => setJd(e.target.value.slice(0, 5000))}
                      placeholder="Paste job description here, e.g. 'Looking for a Senior Backend Engineer with 5+ years of experience in Java, Spring Boot and AWS in Bengaluru with notice period under 30 days'..."
                      style={{ width: "100%", height: "220px", border: "none", outline: "none", resize: "none", padding: "16px", fontSize: "1rem", color: "#333", fontFamily: "inherit" }}
                    />
                    <div style={{ position: "absolute", bottom: "16px", right: "16px", background: "#10b981", color: "white", borderRadius: "4px", padding: "4px", display: "flex" }}>
                      <Bot size={16} />
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", fontSize: "0.8rem", color: "var(--r-muted)", marginTop: "8px" }}>
                  {jd.length}/5000 characters limit
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "16px" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setJd("");
                      setExtractedCriteria(null);
                    }}
                    className="r-link"
                    style={{ fontSize: "0.9rem", fontWeight: 600 }}
                  >
                    Clear All
                  </button>
                  <button 
                    type="button" 
                    disabled={!jd.trim()}
                    onClick={() => handleExtract(jd)}
                    className="r-button r-primary"
                  >
                    Search Candidates
                  </button>
                </div>
              </div>
              <div>
                <SearchHistory />
              </div>
            </div>
          </div>
        )}

        {(searchTab === "Search by Job Description" || searchTab === "Voice Search") && extractedCriteria && (
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

        {searchTab === "Search form BETA" && (
        <>
          <button
            type="button"
            className="r-button r-mobile-filters"
            aria-expanded={mobileFilters}
            onClick={() => setMobileFilters((v) => !v)}
          >
            <SlidersHorizontal size={16} />
            Filters
          </button>
          <div className="r-search-grid">
            <aside
              className={`r-filter-panel ${mobileFilters ? "r-filters-open" : ""}`}
              aria-label="Candidate filters"
            >
              <div className="r-row">
                <h2>Filters</h2>
                <button
                  type="button"
                  className="r-link"
                  onClick={() => {
                    setDraft({});
                    setParams({ results: "1" });
                  }}
                >
                  Reset all
                </button>
              </div>
              <label className="r-check">
                <input
                  type="checkbox"
                  checked={draft.saved === "true"}
                  onChange={(e) => change("saved", e.target.checked ? "true" : "")}
                />
                Saved by me
              </label>
              <label className="r-check">
                <input
                  type="checkbox"
                  checked={draft.hideViewed === "true"}
                  onChange={(e) => change("hideViewed", e.target.checked ? "true" : "")}
                />
                Hide profiles I’ve viewed
              </label>
              <details open>
                <summary>Keywords</summary>
                <label className="r-field">
                  Search in
                  <select
                    value={draft.searchIn ?? "profile"}
                    onChange={(e) => change("searchIn", e.target.value)}
                  >
                    <option value="profile">Profile</option>
                    <option value="skills">Key skills</option>
                    <option value="headline">Title / designation</option>
                    <option value="resume">Attached resume</option>
                    <option value="titleSkills">
                      Title / designation / skills
                    </option>
                  </select>
                </label>
                {field("exclude", "Exclude keywords")}
                <label className="r-check" style={{ marginTop: "8px" }}>
                  <input
                    type="checkbox"
                    checked={draft.excludeSynonyms === "true"}
                    onChange={(e) => change("excludeSynonyms", e.target.checked ? "true" : "")}
                  />
                  Exclude synonyms
                </label>
              </details>
              <details open>
                <summary>Location</summary>
                {field("location", "Enter current location")}
                <label className="r-check" style={{ marginTop: "8px" }}>
                  <input
                    type="checkbox"
                    checked={draft.includePreferred === "true"}
                    onChange={(e) => change("includePreferred", e.target.checked ? "true" : "")}
                  />
                  Include relocating candidates
                </label>
                <div style={{ marginTop: "12px" }}>
                  <small style={{ fontWeight: 600, display: "block", marginBottom: "8px" }}>Suggested cities</small>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {["Bengaluru", "Hyderabad", "Gurugram", "Pune", "Delhi", "Chennai", "Mumbai", "Noida"].map((cityName) => (
                      <button
                        type="button"
                        key={cityName}
                        className={`r-chip ${draft.location === cityName ? "active" : ""}`}
                        onClick={() => change("location", draft.location === cityName ? "" : cityName)}
                      >
                        {cityName}
                      </button>
                    ))}
                  </div>
                </div>
                {showPreferredLocation ? (
                  <div style={{ marginTop: "10px" }}>
                    {field("preferredLocation", "Preferred location")}
                  </div>
                ) : (
                  <button
                    type="button"
                    className="r-link"
                    style={{ marginTop: "10px" }}
                    onClick={() => setShowPreferredLocation(true)}
                  >
                    + Add different preferred location
                  </button>
                )}
              </details>
              <details open>
                <summary>Experience (yrs)</summary>
                <div className="r-pair">
                  {field("minExperience", "Minimum", "number", 60)}
                  {field("maxExperience", "Maximum", "number", 60)}
                </div>
                {showExpMonths ? (
                  <div className="r-pair" style={{ marginTop: "8px" }}>
                    {field("minExperienceMonths", "+ Min Months", "number", 11)}
                    {field("maxExperienceMonths", "+ Max Months", "number", 11)}
                  </div>
                ) : (
                  <button
                    type="button"
                    className="r-link"
                    style={{ marginTop: "8px" }}
                    onClick={() => setShowExpMonths(true)}
                  >
                    + Add Months
                  </button>
                )}
              </details>
              <details>
                <summary>Notice period</summary>
                <div className="r-chip-options" style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
                  {[
                    ["Immediate joiner", "0"],
                    ["Upto 30 days", "30"],
                    ["Upto 45 days", "45"],
                    ["Upto 60 days", "60"],
                    ["Upto 90 days", "90"],
                    ["Any", ""],
                  ].map(([label, val]) => {
                    const isActive = val === "" ? !draft.noticeDays : draft.noticeDays === val;
                    return (
                      <button
                        type="button"
                        key={label}
                        className={`r-chip ${isActive ? "active" : ""}`}
                        onClick={() => {
                          if (val === "") {
                            change("noticeDays", "");
                          } else {
                            change("noticeDays", draft.noticeDays === val ? "" : val);
                          }
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <small style={{ fontWeight: 600, display: "block", marginBottom: "8px" }}>Include candidates:</small>
                <label className="r-check">
                  <input
                    type="checkbox"
                    checked={draft.includeUnknownNotice === "true"}
                    onChange={(e) => change("includeUnknownNotice", e.target.checked ? "true" : "")}
                  />
                  Without notice period
                </label>
                <label className="r-check">
                  <input
                    type="checkbox"
                    checked={draft.servingNotice === "true"}
                    onChange={(e) => change("servingNotice", e.target.checked ? "true" : "")}
                  />
                  Serving notice period
                </label>
              </details>
              <details>
                <summary>Annual Salary</summary>
                <div className="r-pair">
                  <label className="r-field">
                    Minimum Lacs
                    <input
                      type="number"
                      min={0}
                      max={1000}
                      value={draft.minSalary ? Math.floor(Number(draft.minSalary) / 100000) || "" : ""}
                      onChange={(e) => {
                        const lac = e.target.value;
                        const th = draft.minSalary ? Math.floor((Number(draft.minSalary) % 100000) / 1000) : 0;
                        if (!lac && !th) change("minSalary", "");
                        else change("minSalary", String(Number(lac || 0) * 100000 + th * 1000));
                      }}
                    />
                  </label>
                  <label className="r-field">
                    Maximum Lacs
                    <input
                      type="number"
                      min={0}
                      max={1000}
                      value={draft.maxSalary ? Math.floor(Number(draft.maxSalary) / 100000) || "" : ""}
                      onChange={(e) => {
                        const lac = e.target.value;
                        const th = draft.maxSalary ? Math.floor((Number(draft.maxSalary) % 100000) / 1000) : 0;
                        if (!lac && !th) change("maxSalary", "");
                        else change("maxSalary", String(Number(lac || 0) * 100000 + th * 1000));
                      }}
                    />
                  </label>
                </div>
                {showSalaryThousands ? (
                  <div className="r-pair" style={{ marginTop: "8px" }}>
                    <label className="r-field">
                      + Min Thousands
                      <input
                        type="number"
                        min={0}
                        max={99}
                        value={draft.minSalary ? Math.floor((Number(draft.minSalary) % 100000) / 1000) || "" : ""}
                        onChange={(e) => {
                          const th = e.target.value;
                          const lac = draft.minSalary ? Math.floor(Number(draft.minSalary) / 100000) : 0;
                          if (!lac && !th) change("minSalary", "");
                          else change("minSalary", String(lac * 100000 + Number(th || 0) * 1000));
                        }}
                      />
                    </label>
                    <label className="r-field">
                      + Max Thousands
                      <input
                        type="number"
                        min={0}
                        max={99}
                        value={draft.maxSalary ? Math.floor((Number(draft.maxSalary) % 100000) / 1000) || "" : ""}
                        onChange={(e) => {
                          const th = e.target.value;
                          const lac = draft.maxSalary ? Math.floor(Number(draft.maxSalary) / 100000) : 0;
                          if (!lac && !th) change("maxSalary", "");
                          else change("maxSalary", String(lac * 100000 + Number(th || 0) * 1000));
                        }}
                      />
                    </label>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="r-link"
                    style={{ marginTop: "8px" }}
                    onClick={() => setShowSalaryThousands(true)}
                  >
                    + Add Thousand
                  </button>
                )}
                <label className="r-check" style={{ marginTop: "12px" }}>
                  <input
                    type="checkbox"
                    checked={draft.includeUnknownSalary === "true"}
                    onChange={(e) => change("includeUnknownSalary", e.target.checked ? "true" : "")}
                  />
                  Include profiles who have not mentioned current salary
                </label>
              </details>
              <details>
                <summary>Education</summary>
                <div style={{ padding: "8px 0" }}>
                  <EducationFilters
                    values={draft}
                    set={(k, v) => change(k, v)}
                    showPhd={
                      showPhd ||
                      draft.showPhd === "true" ||
                      !!draft.phd ||
                      !!draft.phdCourse ||
                      !!draft.phdInstitute ||
                      !!draft.phdYearFrom ||
                      !!draft.phdYearTo
                    }
                    setShowPhd={(show) => {
                      setShowPhd(show);
                      change("showPhd", show ? "true" : "false");
                    }}
                  />
                </div>
              </details>
              <details>
                <summary>Industry</summary>
                {field("industry", "Enter industry")}
                <small style={{ fontWeight: 600, display: "block", margin: "12px 0 8px" }}>Match in:</small>
                <label className="r-check">
                  <input
                    type="checkbox"
                    checked={draft.industryScope === "current"}
                    onChange={(e) => change("industryScope", e.target.checked ? "current" : "any")}
                  />
                  Current industry only
                </label>
                <small style={{ fontWeight: 600, display: "block", margin: "12px 0 8px" }}>Suggested</small>
                <button
                  type="button"
                  className={`r-chip ${draft.industry === "Information Services" ? "active" : ""}`}
                  onClick={() => change("industry", draft.industry === "Information Services" ? "" : "Information Services")}
                >
                  Information Services
                </button>
              </details>
              <details>
                <summary>Company</summary>
                {field("company", "Enter company name")}
                <small style={{ fontWeight: 600, display: "block", margin: "12px 0 8px" }}>Include:</small>
                <label className="r-check">
                  <input
                    type="checkbox"
                    checked={draft.companyScope === "current"}
                    onChange={(e) => change("companyScope", e.target.checked ? "current" : "any")}
                  />
                  Current employees only
                </label>
                {showExcludeCompany ? (
                  <div style={{ marginTop: "10px" }}>
                    {field("excludeCompany", "Exclude company")}
                  </div>
                ) : (
                  <button
                    type="button"
                    className="r-link"
                    style={{ marginTop: "12px" }}
                    onClick={() => setShowExcludeCompany(true)}
                  >
                    + Add company to exclude from search
                  </button>
                )}
              </details>
              <details>
                <summary>Designation</summary>
                {field("designation", "Search designation")}
                <small style={{ fontWeight: 600, display: "block", margin: "12px 0 8px" }}>Match in:</small>
                <label className="r-check">
                  <input
                    type="checkbox"
                    checked={draft.designationScope === "current"}
                    onChange={(e) => change("designationScope", e.target.checked ? "current" : "any")}
                  />
                  Current designation only
                </label>
              </details>
              <details>
                <summary>Smart insights</summary>
                {[
                  ["startup", "Has startup experience"],
                  ["founder", "Has founder experience"],
                  ["promoted", "Promoted in current company"],
                  ["portfolio", "Has portfolio or blog link"],
                  ["certified", "Has professional certifications"],
                ].map(([val, label]) => {
                  const activeList = (draft.insights || "").split(",").filter(Boolean);
                  const checked = activeList.includes(val);
                  return (
                    <label key={val} className="r-check" style={{ marginBottom: "6px" }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...activeList, val]
                            : activeList.filter((x) => x !== val);
                          change("insights", next.join(","));
                        }}
                      />
                      {label}
                    </label>
                  );
                })}
              </details>
              <details>
                <summary>Work Preference & Mode</summary>
                <small style={{ fontWeight: 600, display: "block", marginBottom: "8px" }}>Work Mode</small>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
                  {[
                    ["ONSITE", "On-site"],
                    ["HYBRID", "Hybrid"],
                    ["REMOTE", "Remote"],
                  ].map(([mode, label]) => (
                    <button
                      type="button"
                      key={mode}
                      className={`r-chip ${draft.workMode === mode ? "active" : ""}`}
                      onClick={() => change("workMode", draft.workMode === mode ? "" : mode)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <small style={{ fontWeight: 600, display: "block", marginBottom: "8px" }}>Employment Type</small>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {[
                    ["FULL_TIME", "Permanent full time"],
                    ["PART_TIME", "Part time"],
                    ["CONTRACT", "Contract"],
                    ["INTERNSHIP", "Internship"],
                  ].map(([type, label]) => (
                    <button
                      type="button"
                      key={type}
                      className={`r-chip ${draft.employmentType === type ? "active" : ""}`}
                      onClick={() => change("employmentType", draft.employmentType === type ? "" : type)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </details>
              <details>
                <summary>Work authorisation</summary>
                <div className="r-chip-options" style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {[
                    ["INDIA_WORK_AUTH", "Authorized in India"],
                    ["H1B", "H1B Visa"],
                    ["L1", "L1 Visa"],
                    ["TN", "TN Permit"],
                    ["US_WORK_AUTH", "US Work Auth"],
                  ].map(([auth, label]) => (
                    <button
                      type="button"
                      key={auth}
                      className={`r-chip ${draft.workAuthorisation === auth ? "active" : ""}`}
                      onClick={() => change("workAuthorisation", draft.workAuthorisation === auth ? "" : auth)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </details>
              <details>
                <summary>Languages</summary>
                <small style={{ color: "var(--r-muted)", display: "block", marginBottom: "8px" }}>
                  ⓘ Filter not applicable to sourced profiles
                </small>
                <LanguageSelector
                  value={draft.languages || draft.language || ""}
                  onChange={(val) => {
                    change("languages", val);
                    change("language", val);
                  }}
                />
              </details>
              <details>
                <summary>Age (Years)</summary>
                <small style={{ color: "var(--r-muted)", display: "block", marginBottom: "8px" }}>
                  ⓘ Filter not applicable to sourced profiles
                </small>
                <div className="r-pair" style={{ gap: "12px" }}>
                  <div className="r-field" style={{ margin: 0 }}>
                    <span className="r-select-wrap">
                      <select
                        aria-label="Age minimum"
                        value={draft.minAge || ""}
                        onChange={(e) => change("minAge", e.target.value)}
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
                        value={draft.maxAge || ""}
                        onChange={(e) => change("maxAge", e.target.value)}
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
                <label className="r-check" style={{ marginTop: "10px" }}>
                  <input
                    type="checkbox"
                    checked={draft.includeUnknownAge === "true"}
                    onChange={(e) => change("includeUnknownAge", e.target.checked ? "true" : "")}
                  />
                  Include profiles without age
                </label>
              </details>
              <details>
                <summary>Hide profiles that are</summary>
                <label className="r-check">
                  <input
                    type="checkbox"
                    checked={draft.hideEmailed === "true"}
                    onChange={(e) => change("hideEmailed", e.target.checked ? "true" : "")}
                  />
                  Already contacted by Email
                </label>
                <label className="r-check">
                  <input
                    type="checkbox"
                    checked={draft.hideUnlocked === "true"}
                    onChange={(e) => change("hideUnlocked", e.target.checked ? "true" : "")}
                  />
                  Already unlocked resumes
                </label>
                <label className="r-check" style={{ color: "var(--r-muted)", cursor: "not-allowed" }}>
                  <input type="checkbox" disabled />
                  Already contacted by SMS <small>(SMS tracking not available)</small>
                </label>
              </details>
              <details>
                <summary>Show only</summary>
                <label className="r-check">
                  <input
                    type="checkbox"
                    checked={draft.hasResume === "true"}
                    onChange={(e) => change("hasResume", e.target.checked ? "true" : "")}
                  />
                  Profiles with attached resume
                </label>
                <label className="r-check">
                  <input
                    type="checkbox"
                    checked={draft.hideViewed === "true"}
                    onChange={(e) => change("hideViewed", e.target.checked ? "true" : "")}
                  />
                  Unseen profiles
                </label>
                <label className="r-check" style={{ color: "var(--r-muted)", cursor: "not-allowed" }}>
                  <input type="checkbox" disabled />
                  Verified mobile / email <small>(Verification not tracked in profiles)</small>
                </label>
              </details>
              <button type="submit" className="r-button r-primary r-full">
                Apply filters
              </button>
            </aside>
          <section className="r-results" aria-label="Candidate search results">
            <div className="r-row r-toolbar">
              <strong aria-live="polite">
                {result.isPending
                  ? "Searching…"
                  : `${meta?.total ?? 0} profiles`}
              </strong>
              <div className="r-row">
                <label>
                  Sort{" "}
                  <select
                    aria-label="Sort profiles"
                    value={filters.sort ?? "relevance"}
                    onChange={(e) => update("sort", e.target.value)}
                  >
                    <option value="relevance">Relevance</option>
                    <option value="updated">Last updated</option>
                    <option value="experience">Experience</option>
                    <option value="active">Last active</option>
                  </select>
                </label>
                <label>
                  Show{" "}
                  <select
                    aria-label="Profiles per page"
                    value={filters.limit ?? "20"}
                    onChange={(e) => update("limit", e.target.value)}
                  >
                    <option>20</option>
                    <option>40</option>
                    <option>50</option>
                  </select>
                </label>
              </div>
            </div>
            <div
              className="r-tabs r-source-tabs"
              role="tablist"
              aria-label="Candidate origin"
            >
              {[
                ["", "All candidates"],
                ["registered", "Registered candidates"],
                ["sourced", "Sourced candidates"],
              ].map(([key, label]) => (
                <button
                  type="button"
                  role="tab"
                  key={key}
                  aria-selected={(filters.sourceGroup || "") === key}
                  className={
                    (filters.sourceGroup || "") === key ? "active" : ""
                  }
                  onClick={() => update("sourceGroup", key)}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="r-help">
              {meta?.total ?? 0} matching profiles in this view. Profiles with
              an unclassified source appear under All candidates.
            </p>
            <div className="r-row r-bulk">
              <label className="r-check">
                <input
                  type="checkbox"
                  checked={
                    !!rows.length && rows.every((c) => selected.includes(c.id))
                  }
                  disabled={!rows.length}
                  onChange={(e) =>
                    setSelected((ids) =>
                      e.target.checked
                        ? [
                            ...new Set([...ids, ...rows.map((c) => c.id)]),
                          ].slice(0, 1000)
                        : ids.filter((id) => !rows.some((c) => c.id === id)),
                    )
                  }
                />
                Select page · {selected.length} selected
              </label>
              {can("candidates.save") && (
                <button
                  type="button"
                  className="r-link"
                  disabled={!selected.length}
                  onClick={() => setFolderPicker(true)}
                >
                  <FolderPlus size={16} />
                  Add to folder
                </button>
              )}
              {can("messages.use") &&
                can("candidates.read") &&
                can("candidates.resume.view") && (
                  <button
                    type="button"
                    className="r-link"
                    disabled={!selected.length}
                    onClick={() => {
                      setEmailTargets(selected);
                      setEmailOpen(true);
                    }}
                  >
                    <Mail size={16} />
                    Email
                  </button>
                )}
              {can("messages.use") && (
                <button
                  type="button"
                  className="r-link"
                  disabled={!selected.length}
                  onClick={() => {
                    setWhatsAppTargets(selected);
                    setWhatsAppOpen(true);
                  }}
                >
                  <MessageCircle size={16} />
                  WhatsApp
                </button>
              )}
              {can("messages.use") && (
                <button
                  type="button"
                  className="r-link"
                  disabled={!selected.length}
                  onClick={() => {
                    setSmsTargets(selected);
                    setSmsOpen(true);
                  }}
                >
                  <Smartphone size={16} />
                  SMS
                </button>
              )}
              {filters.folderId && can("candidates.save") && (
                <button
                  type="button"
                  className="r-link"
                  disabled={!selected.length || remove.isPending}
                  onClick={() => remove.mutate()}
                >
                  Remove from folder
                </button>
              )}
              {can("candidates.search") && (
                <button
                  type="button"
                  className="r-link"
                  onClick={() => setSaveOpen(true)}
                >
                  <Bookmark size={16} />
                  Save search
                </button>
              )}
            </div>
            {result.isError ? (
              <QueryError
                error={result.error}
                retry={() => void result.refetch()}
              />
            ) : result.isPending ? (
              <div className="r-card" role="status">
                Loading candidates…
              </div>
            ) : rows.length ? (
              rows.map((c) => (
                <ProfileCard
                  key={c.id}
                  candidate={c}
                  query={filters.search}
                  selected={selected.includes(c.id)}
                  onSelect={toggle}
                  onEmail={
                    can("messages.use") &&
                    can("candidates.read") &&
                    can("candidates.resume.view")
                      ? (id) => {
                          setEmailTargets([id]);
                          setEmailOpen(true);
                        }
                      : undefined
                  }
                  onWhatsApp={
                    can("messages.use")
                      ? (id) => {
                          setWhatsAppTargets([id]);
                          setWhatsAppOpen(true);
                        }
                      : undefined
                  }
                  onSms={
                    can("messages.use")
                      ? (id) => {
                          setSmsTargets([id]);
                          setSmsOpen(true);
                        }
                      : undefined
                  }
                  onComment={(candidate) => {
                    setCommentCandidate(candidate);
                  }}
                />
              ))
            ) : (
              <div className="r-card r-empty">
                <Search size={32} />
                <h2>No matching profiles</h2>
                <p>Try fewer keywords or clear a filter.</p>
              </div>
            )}
            {meta && (
              <div className="r-row r-pagination">
                <button
                  type="button"
                  className="r-button"
                  disabled={meta.page <= 1 || result.isFetching}
                  onClick={() => update("page", String(meta.page - 1))}
                >
                  Previous
                </button>
                <span>
                  Page {meta.page} of {meta.totalPages}
                </span>
                <button
                  type="button"
                  className="r-button"
                  disabled={meta.page >= meta.totalPages || result.isFetching}
                  onClick={() => update("page", String(meta.page + 1))}
                >
                  Next
                </button>
              </div>
            )}
          </section>
        </div>
        </>
        )}
      </form>
      {emailOpen && (
        <BulkEmailSheet
          candidateIds={emailTargets}
          onClose={() => setEmailOpen(false)}
        />
      )}
      {commentCandidate && (
        <CommentModal
          candidate={commentCandidate}
          onClose={() => setCommentCandidate(null)}
        />
      )}
      {whatsAppOpen && (
        <WhatsAppCampaignSheet
          candidateIds={whatsAppTargets}
          onClose={() => setWhatsAppOpen(false)}
        />
      )}
      {smsOpen && (
        <SmsDrawer
          candidateIds={smsTargets}
          onClose={() => setSmsOpen(false)}
        />
      )}
      <section className="r-library">
        <div className="r-card">
          <h2>My folders</h2>
          <p className="r-muted">Private shortlists, saved to your account.</p>
          {folders.isError && (
            <QueryError
              error={folders.error}
              retry={() => void folders.refetch()}
            />
          )}
          <div className="r-row">
            <input
              aria-label="New folder name"
              maxLength={80}
              value={newFolder}
              onChange={(e) => setNewFolder(e.target.value)}
              placeholder="e.g. Backend engineers"
            />
            <button
              className="r-button"
              disabled={
                !can("candidates.save") ||
                !newFolder.trim() ||
                addFolder.isPending
              }
              onClick={() => addFolder.mutate()}
            >
              Create
            </button>
          </div>
          {folders.data?.map((f) => (
            <div className="r-list-row" key={f.id}>
              <button
                className="r-link"
                onClick={() =>
                  setParams({
                    folderId: f.id,
                    results: "1",
                    run: crypto.randomUUID(),
                  })
                }
              >
                {f.name} ({f._count.candidates})
              </button>
              <button
                className="r-icon"
                aria-label={`Delete folder ${f.name}`}
                onClick={() => {
                  if (
                    window.confirm(
                      `Delete folder “${f.name}”? Candidates will stay in the talent pool.`,
                    )
                  )
                    deleteFolder.mutate(f.id);
                }}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
        <div className="r-card">
          <h2>Saved searches</h2>
          <p className="r-muted">
            Reuse your filters or a search shared by your team.
          </p>
          {searches.isError && (
            <QueryError
              error={searches.error}
              retry={() => void searches.refetch()}
            />
          )}{" "}
          {!searches.data?.length && <p>No saved searches yet.</p>}
          {searches.data?.map((s) => (
            <div className="r-list-row" key={s.id}>
              <button
                className="r-link"
                onClick={() =>
                  setParams({
                    ...Object.fromEntries(
                      Object.entries(s.filters).map(([k, v]) => [k, String(v)]),
                    ),
                    results: "1",
                    run: crypto.randomUUID(),
                    page: "1",
                  })
                }
              >
                {s.name}
                {s.shared ? " · Team" : ""}
              </button>
              {s.owned && (
                <button
                  className="r-icon"
                  aria-label={`Delete saved search ${s.name}`}
                  disabled={deleteSearch.isPending}
                  onClick={() => deleteSearch.mutate(s.id)}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
      <Sheet
        open={folderPicker}
        onClose={() => setFolderPicker(false)}
        title="Add selected candidates to a folder"
        footer={
          <button
            className="r-button r-primary"
            disabled={!folderId || addToFolder.isPending}
            onClick={() => addToFolder.mutate()}
          >
            Add {selected.length} candidates
          </button>
        }
      >
        <label className="r-field">
          Choose existing folder
          <select
            value={folderId}
            onChange={(e) => setFolderId(e.target.value)}
          >
            <option value="">Choose a folder</option>
            {folders.data?.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f._count?.candidates ?? 0})
              </option>
            ))}
          </select>
        </label>
        <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid var(--r-border, #e2e8f0)" }}>
          <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--r-text, #334155)", marginBottom: "8px" }}>
            Or create a new folder
          </p>
          <div className="r-row" style={{ gap: "8px" }}>
            <input
              aria-label="New folder name"
              maxLength={80}
              value={newFolder}
              onChange={(e) => setNewFolder(e.target.value)}
              placeholder="e.g. Frontend shortlisted"
              style={{ flex: 1 }}
            />
            <button
              type="button"
              className="r-button"
              disabled={!can("candidates.save") || !newFolder.trim() || addFolder.isPending}
              onClick={() => addFolder.mutate()}
            >
              {addFolder.isPending ? "Creating..." : "Create"}
            </button>
          </div>
        </div>
      </Sheet>
      <Sheet
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        title="Save this search"
        footer={
          <button
            className="r-button r-primary"
            disabled={!searchName.trim() || saveSearch.isPending}
            onClick={() => saveSearch.mutate()}
          >
            Save search
          </button>
        }
      >
        <label className="r-field">
          Name
          <input
            maxLength={80}
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
          />
        </label>
        <label className="r-check">
          <input
            type="checkbox"
            checked={shared}
            onChange={(e) => setShared(e.target.checked)}
          />
          Share filters with my organisation
        </label>
        <p>
          Shared searches omit private folder, saved-only and viewed-profile
          filters.
        </p>
      </Sheet>
    </div>
  );
}
