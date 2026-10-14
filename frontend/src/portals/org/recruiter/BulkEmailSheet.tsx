import React, { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  X,
  ChevronRight,
  ChevronLeft,
  Mail,
  Upload,
  Calendar,
  Clock,
  FolderPlus,
  Monitor,
  Smartphone,
  Info,
  Send,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { api, errorMessage } from "../lib/api";
import { usePermissions } from "../lib/session";
import { toast } from "../ui/toast";
import { Sheet } from "../ui/ui";
import { Folder, root, talentKeys } from "./types";

interface RecipientStatus {
  candidateId: string;
  name: string;
  status: string;
  detail: string | null;
}

interface EmailPreviewResponse {
  id: string;
  subject: string;
  body: string;
  configured: boolean;
  pending: number;
  recipients: RecipientStatus[];
}

const PLACEHOLDERS = [
  { tag: "{{candidate_name}}", label: "Candidate Name" },
  { tag: "{{job_title}}", label: "Job Title" },
  { tag: "{{company_name}}", label: "Company Name" },
  { tag: "{{job_location}}", label: "Job Location" },
  { tag: "{{recruiter_name}}", label: "Recruiter Name" },
  { tag: "{{apply_url}}", label: "Application Link" },
];

export function BulkEmailSheet({
  candidateIds,
  onClose,
}: {
  candidateIds: string[];
  onClose: () => void;
}) {
  const { me } = usePermissions();
  const qc = useQueryClient();

  // Steps: 1 = Compose, 2 = Campaign Setup
  const [step, setStep] = useState<1 | 2>(1);
  const [previewMode, setPreviewMode] = useState<"edit" | "desktop" | "mobile">("edit");

  // Step 1: Compose fields
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [bannerFileName, setBannerFileName] = useState<string | null>(null);
  const [jobTitle, setJobTitle] = useState("");
  const [jobMode, setJobMode] = useState("ONSITE");
  const [locations, setLocations] = useState<string[]>(["Bengaluru"]);
  const [locationInput, setLocationInput] = useState("");
  const [minExp, setMinExp] = useState(2);
  const [maxExp, setMaxExp] = useState(5);
  const [salaryMin, setSalaryMin] = useState(1000000);
  const [salaryMax, setSalaryMax] = useState(2000000);
  const [currency, setCurrency] = useState("INR");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [signature, setSignature] = useState(
    `Warm regards,\n${me?.user?.firstName || "Recruitment"} ${me?.user?.lastName || "Team"}\n${me?.organisation?.name || "Clyptus"}`,
  );

  // Step 2: Campaign setup fields
  const [campaignName, setCampaignName] = useState(
    `Email Campaign - ${new Date().toLocaleDateString()}`,
  );
  const [folderId, setFolderId] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [sendSchedule, setSendSchedule] = useState<"now" | "schedule">("now");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("10:00");
  const [replyTo, setReplyTo] = useState(me?.user?.email || "");
  const [noFollowUp, setNoFollowUp] = useState(false);
  const [followUpDays, setFollowUpDays] = useState(3);
  const [maxFollowUps, setMaxFollowUps] = useState(2);

  // Draft ID tracking
  const requestId = useRef(crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<EmailPreviewResponse | null>(null);
  const stopRef = useRef(false);

  // Draft restoration from sessionStorage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("clyptus_email_draft");
      if (saved) {
        const d = JSON.parse(saved);
        if (d.subject) setSubject(d.subject);
        if (d.body) setBody(d.body);
        if (d.jobTitle) setJobTitle(d.jobTitle);
        if (d.campaignName) setCampaignName(d.campaignName);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Save draft helper
  const saveDraft = () => {
    try {
      sessionStorage.setItem(
        "clyptus_email_draft",
        JSON.stringify({
          subject,
          body,
          jobTitle,
          campaignName,
          jobMode,
          locations,
          minExp,
          maxExp,
          salaryMin,
          salaryMax,
          currency,
          signature,
        }),
      );
      toast.success("Draft saved successfully");
    } catch {
      toast.error("Could not save draft");
    }
  };

  // Fetch folders
  const foldersQuery = useQuery({
    queryKey: [...talentKeys, "folders"],
    queryFn: () => api.get<Folder[]>(`${root}/folders`),
  });

  // Create folder mutation
  const createFolder = useMutation({
    mutationFn: () => api.post<Folder>(`${root}/folders`, { name: newFolderName.trim() }),
    onSuccess: (f) => {
      toast.success(`Folder "${f.name}" created`);
      setNewFolderName("");
      setFolderId(f.id);
      void qc.invalidateQueries({ queryKey: [...talentKeys, "folders"] });
    },
    onError: (e) => toast.error(errorMessage(e, "Could not create folder")),
  });

  // Location helpers
  const addLocation = (loc: string) => {
    const trimmed = loc.trim();
    if (trimmed && !locations.includes(trimmed) && locations.length < 5) {
      setLocations([...locations, trimmed]);
      setLocationInput("");
    }
  };

  const removeLocation = (loc: string) => {
    setLocations(locations.filter((l) => l !== loc));
  };

  // Insert placeholder at textarea cursor
  const insertPlaceholder = (tag: string) => {
    setBody((prev) => `${prev} ${tag} `);
  };

  // Banner file handler (JPEG/PNG max 1MB)
  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      toast.error("Banner image must be 1 MB or smaller.");
      return;
    }
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      toast.error("Banner must be a JPEG or PNG image.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      setBannerUrl(evt.target?.result as string);
      setBannerFileName(file.name);
    };
    reader.readAsDataURL(file);
  };

  // Resolve preview text with mock candidate variables
  const resolvedSubject = (subject || "Career Opportunity: {{job_title}}")
    .replace(/\{\{job_title\}\}/g, jobTitle || "Senior Engineer")
    .replace(/\{\{candidate_name\}\}/g, "Priya Sharma")
    .replace(/\{\{company_name\}\}/g, me?.organisation?.name || "Clyptus");

  const resolvedBody = (body || "Hi {{candidate_name}},\n\nWe would love to discuss the {{job_title}} role at {{company_name}}.")
    .replace(/\{\{job_title\}\}/g, jobTitle || "Senior Engineer")
    .replace(/\{\{candidate_name\}\}/g, "Priya Sharma")
    .replace(/\{\{company_name\}\}/g, me?.organisation?.name || "Clyptus")
    .replace(/\{\{job_location\}\}/g, locations.join(", ") || "Bengaluru")
    .replace(/\{\{recruiter_name\}\}/g, `${me?.user?.firstName || "Priya"} ${me?.user?.lastName || "Sharma"}`)
    .replace(/\{\{apply_url\}\}/g, "https://clyptus.com/jobs/apply/ref-123");

  // Call backend preview
  const reviewRecipients = async () => {
    setBusy(true);
    try {
      const res = await api.post<EmailPreviewResponse>(`${root}/email/preview`, {
        candidateIds,
        subject: subject.trim(),
        body: `${body.trim()}\n\n${signature.trim()}`,
        requestId: requestId.current,
        campaignName,
        folderId: folderId || undefined,
        bannerUrl: bannerUrl || undefined,
        jobDesignation: jobTitle || undefined,
        jobMode,
        jobLocations: locations,
        experienceMin: minExp,
        experienceMax: maxExp,
        salaryMin,
        salaryMax,
        currency,
        signature,
        scheduleAt: sendSchedule === "schedule" && scheduleDate ? `${scheduleDate}T${scheduleTime}:00` : undefined,
        replyTo: replyTo || undefined,
        followUpIntervalDays: noFollowUp ? undefined : followUpDays,
        maxFollowUpAttempts: noFollowUp ? undefined : maxFollowUps,
      });
      setPreview(res);
      setStep(2);
    } catch (e) {
      toast.error(errorMessage(e, "Could not review recipients"));
    } finally {
      setBusy(false);
    }
  };

  // Dispatch campaign
  const sendCampaign = async () => {
    if (!preview) return;
    setBusy(true);
    stopRef.current = false;
    try {
      let next = preview;
      while (next.pending && !stopRef.current) {
        next = await api.post<EmailPreviewResponse>(
          `${root}/email/${preview.id}/send`,
          {},
          { timeout: 35000 },
        );
        setPreview(next);
      }
      toast.success("Email campaign dispatch cycle complete");
      if (next.pending === 0) {
        sessionStorage.removeItem("clyptus_email_draft");
        onClose();
      }
    } catch (e) {
      toast.error(errorMessage(e) + " Status updated. Refresh before resuming.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open
      title={`Email Campaign Composer (${candidateIds.length} candidate${candidateIds.length === 1 ? "" : "s"})`}
      onClose={() => {
        if (!busy) onClose();
      }}
      wide
    >
      <div className="recruiter-workspace" style={{ padding: "8px 0" }}>
        {/* Step Tabs */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "18px",
            paddingBottom: "12px",
            borderBottom: "1px solid var(--r-border)",
          }}
        >
          <button
            type="button"
            className="r-link"
            onClick={() => setStep(1)}
            style={{
              fontWeight: step === 1 ? 700 : 500,
              color: step === 1 ? "var(--r-primary)" : "var(--r-text)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span
              style={{
                width: "22px",
                height: "22px",
                borderRadius: "50%",
                background: step === 1 ? "var(--r-primary)" : "var(--r-border)",
                color: step === 1 ? "white" : "var(--r-text)",
                fontSize: "12px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              1
            </span>
            Step 1: Compose Email
          </button>
          <ChevronRight size={16} style={{ color: "var(--r-muted)" }} />
          <button
            type="button"
            className="r-link"
            onClick={() => {
              if (subject.trim() && body.trim()) void reviewRecipients();
            }}
            disabled={!subject.trim() || !body.trim()}
            style={{
              fontWeight: step === 2 ? 700 : 500,
              color: step === 2 ? "var(--r-primary)" : "var(--r-muted)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span
              style={{
                width: "22px",
                height: "22px",
                borderRadius: "50%",
                background: step === 2 ? "var(--r-primary)" : "var(--r-border)",
                color: step === 2 ? "white" : "var(--r-text)",
                fontSize: "12px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              2
            </span>
            Step 2: Campaign Setup & Schedule
          </button>
        </div>

        {/* STEP 1: COMPOSE */}
        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* View mode toggle: Edit, Desktop Preview, Mobile Preview */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="r-tabs" style={{ margin: 0 }}>
                <button
                  type="button"
                  className={previewMode === "edit" ? "active" : ""}
                  onClick={() => setPreviewMode("edit")}
                >
                  Edit Mode
                </button>
                <button
                  type="button"
                  className={previewMode === "desktop" ? "active" : ""}
                  onClick={() => setPreviewMode("desktop")}
                  style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                >
                  <Monitor size={14} /> Desktop Preview
                </button>
                <button
                  type="button"
                  className={previewMode === "mobile" ? "active" : ""}
                  onClick={() => setPreviewMode("mobile")}
                  style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                >
                  <Smartphone size={14} /> Mobile Preview
                </button>
              </div>

              <button type="button" className="r-link" onClick={saveDraft}>
                Save draft
              </button>
            </div>

            {previewMode === "edit" ? (
              <>
                {/* Banner Upload */}
                <div className="r-card">
                  <h3 style={{ margin: "0 0 10px", fontSize: "0.95rem" }}>Email Header Banner</h3>
                  <p style={{ margin: "0 0 12px", fontSize: "0.8rem", color: "var(--r-muted)" }}>
                    Recommended size: 600 × 57 px (JPEG or PNG, max 1 MB).
                  </p>

                  {bannerUrl ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <img
                        src={bannerUrl}
                        alt="Email banner preview"
                        style={{ maxWidth: "100%", maxHeight: "80px", objectFit: "contain", borderRadius: "6px", border: "1px solid var(--r-border)" }}
                      />
                      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                        <span style={{ fontSize: "0.8rem", color: "var(--r-text)" }}>{bannerFileName || "Uploaded banner"}</span>
                        <label className="r-link" style={{ cursor: "pointer", fontSize: "0.8rem" }}>
                          Replace
                          <input type="file" accept="image/jpeg,image/png" onChange={handleBannerUpload} style={{ display: "none" }} />
                        </label>
                        <button
                          type="button"
                          className="r-link"
                          onClick={() => {
                            setBannerUrl(null);
                            setBannerFileName(null);
                          }}
                          style={{ color: "#dc2626", fontSize: "0.8rem" }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label
                      style={{
                        border: "1px dashed var(--r-border)",
                        borderRadius: "8px",
                        padding: "16px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        cursor: "pointer",
                        background: "var(--r-surface)",
                      }}
                    >
                      <Upload size={18} style={{ color: "var(--r-muted)" }} />
                      <span style={{ fontSize: "0.85rem", color: "var(--r-text)" }}>Click to upload header banner</span>
                      <input type="file" accept="image/jpeg,image/png" onChange={handleBannerUpload} style={{ display: "none" }} />
                    </label>
                  )}
                </div>

                {/* Opportunity Details */}
                <div className="r-card">
                  <h3 style={{ margin: "0 0 16px", fontSize: "0.95rem" }}>Job Opportunity Context</h3>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                        <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Job Designation / Title *</label>
                        <span style={{ fontSize: "0.75rem", color: "var(--r-muted)" }}>{jobTitle.length}/90</span>
                      </div>
                      <input
                        maxLength={90}
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        placeholder="e.g. Lead Full-Stack Engineer"
                        style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--r-border)", fontSize: "0.9rem" }}
                      />
                    </div>

                    <label className="r-field" style={{ margin: 0 }}>
                      Job Mode
                      <select value={jobMode} onChange={(e) => setJobMode(e.target.value)}>
                        <option value="ONSITE">On-site</option>
                        <option value="HYBRID">Hybrid</option>
                        <option value="REMOTE">Remote</option>
                      </select>
                    </label>
                  </div>

                  {/* Locations */}
                  <div style={{ marginTop: "14px" }}>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "6px" }}>
                      Job Locations (up to 5)
                    </label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "6px" }}>
                      {locations.map((loc) => (
                        <span
                          key={loc}
                          style={{
                            background: "var(--r-surface)",
                            border: "1px solid var(--r-border)",
                            borderRadius: "16px",
                            padding: "2px 10px",
                            fontSize: "0.82rem",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          {loc}
                          <button
                            type="button"
                            onClick={() => removeLocation(loc)}
                            style={{ border: "none", background: "none", cursor: "pointer", padding: 0 }}
                          >
                            <X size={13} />
                          </button>
                        </span>
                      ))}
                    </div>
                    {locations.length < 5 && (
                      <div style={{ display: "flex", gap: "8px" }}>
                        <input
                          value={locationInput}
                          onChange={(e) => setLocationInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addLocation(locationInput);
                            }
                          }}
                          placeholder="Type city and press Enter"
                          style={{ flex: 1, padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--r-border)", fontSize: "0.85rem" }}
                        />
                        <button type="button" className="r-button" onClick={() => addLocation(locationInput)}>
                          Add
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Experience & Salary */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginTop: "14px" }}>
                    <div className="r-pair" style={{ margin: 0 }}>
                      <label className="r-field" style={{ margin: 0 }}>
                        Min Experience (yrs)
                        <input type="number" min={0} max={40} value={minExp} onChange={(e) => setMinExp(Number(e.target.value))} />
                      </label>
                      <label className="r-field" style={{ margin: 0 }}>
                        Max Experience (yrs)
                        <input type="number" min={0} max={40} value={maxExp} onChange={(e) => setMaxExp(Number(e.target.value))} />
                      </label>
                    </div>

                    <div className="r-pair" style={{ margin: 0 }}>
                      <label className="r-field" style={{ margin: 0 }}>
                        Annual Salary Min
                        <input type="number" step={50000} value={salaryMin} onChange={(e) => setSalaryMin(Number(e.target.value))} />
                      </label>
                      <label className="r-field" style={{ margin: 0 }}>
                        Annual Salary Max
                        <input type="number" step={50000} value={salaryMax} onChange={(e) => setSalaryMax(Number(e.target.value))} />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Email Subject, Message & Signature */}
                <div className="r-card">
                  {/* Subject */}
                  <div style={{ marginBottom: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Subject Line *</label>
                      <span style={{ fontSize: "0.75rem", color: "var(--r-muted)" }}>{subject.length}/150</span>
                    </div>
                    <input
                      maxLength={150}
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g. Opportunity: {{job_title}} at {{company_name}}"
                      style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--r-border)", fontSize: "0.9rem" }}
                    />
                  </div>

                  {/* Placeholder Menu */}
                  <div style={{ marginBottom: "12px" }}>
                    <span style={{ fontSize: "0.78rem", color: "var(--r-muted)", marginRight: "8px" }}>
                      Insert dynamic variable:
                    </span>
                    <div style={{ display: "inline-flex", flexWrap: "wrap", gap: "6px", marginTop: "4px" }}>
                      {PLACEHOLDERS.map((p) => (
                        <button
                          key={p.tag}
                          type="button"
                          onClick={() => insertPlaceholder(p.tag)}
                          style={{
                            background: "var(--r-surface)",
                            border: "1px solid var(--r-border)",
                            borderRadius: "14px",
                            padding: "2px 8px",
                            fontSize: "0.78rem",
                            cursor: "pointer",
                            color: "var(--r-text)",
                          }}
                        >
                          + {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Message Body */}
                  <div style={{ marginBottom: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Message Body *</label>
                      <span style={{ fontSize: "0.75rem", color: "var(--r-muted)" }}>{body.length}/4000</span>
                    </div>
                    <textarea
                      rows={8}
                      maxLength={4000}
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="Introduce your organisation and the role. Personalised placeholders like {{candidate_name}} will resolve automatically for each candidate."
                      style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid var(--r-border)", fontSize: "0.9rem", lineHeight: 1.5 }}
                    />
                  </div>

                  {/* Signature */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Email Signature</label>
                      <span style={{ fontSize: "0.75rem", color: "var(--r-muted)" }}>{signature.length}/350</span>
                    </div>
                    <textarea
                      rows={3}
                      maxLength={350}
                      value={signature}
                      onChange={(e) => setSignature(e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--r-border)", fontSize: "0.85rem", lineHeight: 1.4 }}
                    />
                  </div>
                </div>
              </>
            ) : (
              /* LIVE PREVIEW (Desktop or Mobile) */
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  background: "#f1f5f9",
                  padding: "24px",
                  borderRadius: "12px",
                  border: "1px solid var(--r-border)",
                }}
              >
                <div
                  style={{
                    width: previewMode === "mobile" ? "340px" : "620px",
                    background: "white",
                    borderRadius: "10px",
                    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                    overflow: "hidden",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  {bannerUrl && (
                    <img
                      src={bannerUrl}
                      alt="Banner"
                      style={{ width: "100%", height: "auto", display: "block", borderBottom: "1px solid #e2e8f0" }}
                    />
                  )}

                  <div style={{ padding: "20px 24px" }}>
                    <div style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: "12px", marginBottom: "16px" }}>
                      <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                        From: <strong>{me?.user?.firstName || "Priya"} ({me?.organisation?.name || "Clyptus"})</strong> &lt;{replyTo}&gt;
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
                        To: <strong>Priya Sharma</strong> &lt;priya.candidate@example.com&gt;
                      </div>
                      <div style={{ fontSize: "1rem", fontWeight: 700, marginTop: "8px", color: "#0f172a" }}>
                        {resolvedSubject}
                      </div>
                    </div>

                    <div style={{ fontSize: "0.9rem", color: "#334155", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                      {resolvedBody}
                    </div>

                    <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #f1f5f9", fontSize: "0.85rem", color: "#64748b", whiteSpace: "pre-wrap" }}>
                      {signature}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 1 Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button
                type="button"
                className="r-button r-primary"
                disabled={!subject.trim() || !body.trim() || busy}
                onClick={() => void reviewRecipients()}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                {busy ? "Validating recipients…" : "Proceed to Campaign Setup"} <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: CAMPAIGN SETUP & RECIPIENTS */}
        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Setup Form */}
            <div className="r-card">
              <h3 style={{ margin: "0 0 16px", fontSize: "1.05rem" }}>Campaign Schedule & Sender Settings</h3>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
                <label className="r-field" style={{ margin: 0 }}>
                  Campaign Name *
                  <input
                    value={campaignName}
                    maxLength={100}
                    onChange={(e) => setCampaignName(e.target.value)}
                  />
                </label>

                <label className="r-field" style={{ margin: 0 }}>
                  Reply-to Address *
                  <input
                    type="email"
                    value={replyTo}
                    onChange={(e) => setReplyTo(e.target.value)}
                  />
                </label>
              </div>

              {/* Folder Selector */}
              <div style={{ marginTop: "14px" }}>
                <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
                  <label className="r-field" style={{ flex: 1, minWidth: "220px", margin: 0 }}>
                    Associate with Folder
                    <select value={folderId} onChange={(e) => setFolderId(e.target.value)}>
                      <option value="">No folder</option>
                      {foldersQuery.data?.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} ({f._count?.candidates ?? 0} candidates)
                        </option>
                      ))}
                    </select>
                  </label>

                  <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
                    <label className="r-field" style={{ margin: 0 }}>
                      Create Folder
                      <input
                        placeholder="Folder name"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                      />
                    </label>
                    <button
                      type="button"
                      disabled={!newFolderName.trim() || createFolder.isPending}
                      className="r-button"
                      onClick={() => createFolder.mutate()}
                    >
                      <FolderPlus size={15} /> Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Schedule options */}
              <div style={{ marginTop: "16px", borderTop: "1px solid var(--r-border)", paddingTop: "16px" }}>
                <h4 style={{ margin: "0 0 10px", fontSize: "0.9rem" }}>Dispatch Timing</h4>
                <div style={{ display: "flex", gap: "16px", marginBottom: "12px" }}>
                  <label className="r-check">
                    <input
                      type="radio"
                      name="scheduleMode"
                      checked={sendSchedule === "now"}
                      onChange={() => setSendSchedule("now")}
                    />
                    Send immediately
                  </label>
                  <label className="r-check">
                    <input
                      type="radio"
                      name="scheduleMode"
                      checked={sendSchedule === "schedule"}
                      onChange={() => setSendSchedule("schedule")}
                    />
                    Schedule for later
                  </label>
                </div>

                {sendSchedule === "schedule" && (
                  <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      min={new Date().toISOString().slice(0, 10)}
                      style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--r-border)", fontSize: "0.85rem" }}
                    />
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--r-border)", fontSize: "0.85rem" }}
                    />
                    <span style={{ fontSize: "0.8rem", color: "var(--r-muted)" }}>
                      Timezone: <strong>Asia/Kolkata (IST)</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* Follow-up rules */}
              <div style={{ marginTop: "16px", borderTop: "1px solid var(--r-border)", paddingTop: "16px" }}>
                <h4 style={{ margin: "0 0 10px", fontSize: "0.9rem" }}>Automated Follow-up Settings</h4>
                <label className="r-check" style={{ marginBottom: "10px" }}>
                  <input
                    type="checkbox"
                    checked={noFollowUp}
                    onChange={(e) => setNoFollowUp(e.target.checked)}
                  />
                  I don't want to send follow-up emails
                </label>

                {!noFollowUp && (
                  <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
                    <label className="r-field" style={{ margin: 0 }}>
                      Follow-up interval (days)
                      <input
                        type="number"
                        min={1}
                        max={14}
                        value={followUpDays}
                        onChange={(e) => setFollowUpDays(Number(e.target.value))}
                        style={{ width: "90px" }}
                      />
                    </label>
                    <label className="r-field" style={{ margin: 0 }}>
                      Maximum follow-up attempts
                      <select
                        value={maxFollowUps}
                        onChange={(e) => setMaxFollowUps(Number(e.target.value))}
                        style={{ width: "80px" }}
                      >
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                      </select>
                    </label>
                    <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--r-muted)", maxWidth: "340px" }}>
                      Follow-up sequences pause immediately upon candidate response, opt-out or campaign cancellation.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Recipient Review Table */}
            {preview && (
              <div className="r-card">
                <h3 style={{ margin: "0 0 10px", fontSize: "1rem" }}>
                  Recipient Review ({preview.recipients.length} Candidates)
                </h3>
                <p style={{ margin: "0 0 12px", fontSize: "0.85rem", color: "var(--r-muted)" }}>
                  {preview.pending} ready to send ·{" "}
                  {preview.recipients.filter((r) => r.status === "SKIPPED").length} skipped (locked contact / opt-out)
                </p>

                <div style={{ maxHeight: "200px", overflowY: "auto", border: "1px solid var(--r-border)", borderRadius: "6px" }}>
                  <table style={{ width: "100%", fontSize: "0.85rem", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "var(--r-surface)", textAlign: "left" }}>
                        <th style={{ padding: "8px 12px" }}>Recipient</th>
                        <th style={{ padding: "8px 12px" }}>Status</th>
                        <th style={{ padding: "8px 12px" }}>Detail</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.recipients.map((r) => (
                        <tr key={r.candidateId} style={{ borderTop: "1px solid var(--r-border)" }}>
                          <td style={{ padding: "8px 12px" }}>{r.name}</td>
                          <td style={{ padding: "8px 12px" }}>
                            <span
                              style={{
                                color:
                                  r.status === "PENDING"
                                    ? "#16a34a"
                                    : r.status === "SENT"
                                      ? "#0284c7"
                                      : "#d97706",
                                fontWeight: 500,
                              }}
                            >
                              {r.status}
                            </span>
                          </td>
                          <td style={{ padding: "8px 12px", color: "var(--r-muted)" }}>
                            {r.detail || "Eligible for outreach"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {!preview.configured && (
                  <div
                    style={{
                      marginTop: "12px",
                      background: "#fffbeb",
                      border: "1px solid #fde68a",
                      borderRadius: "6px",
                      padding: "10px 14px",
                      fontSize: "0.82rem",
                      color: "#92400e",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <AlertCircle size={16} />
                    <span>
                      Recruiter SMTP is not configured. Ask your organisation administrator to connect SMTP in Settings &gt; Integrations.
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Step 2 Actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button
                type="button"
                className="r-button"
                onClick={() => setStep(1)}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <ChevronLeft size={16} /> Back to Compose
              </button>

              <div style={{ display: "flex", gap: "10px" }}>
                <button type="button" className="r-button" onClick={saveDraft}>
                  Save draft
                </button>
                <button
                  type="button"
                  className="r-button r-primary"
                  disabled={busy || !preview}
                  onClick={() => void sendCampaign()}
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <Send size={15} />
                  {busy ? "Sending…" : sendSchedule === "schedule" ? "Schedule Campaign" : "Send Campaign"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}
