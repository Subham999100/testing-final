import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  X,
  MessageCircle,
  Paperclip,
  Check,
  CheckCheck,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Upload,
  AlertCircle,
  Briefcase,
  FolderPlus,
  Info,
} from "lucide-react";
import { api, errorMessage } from "../lib/api";
import { usePermissions } from "../lib/session";
import { toast } from "../ui/toast";
import { Sheet } from "../ui/ui";
import { Folder, root, talentKeys } from "./types";

interface WhatsAppRecipient {
  id: string;
  name: string;
  phone: string | null;
  unlocked: boolean;
  reason: string | null;
}

interface WhatsAppPreviewData {
  configured: boolean;
  providerName: string;
  campaignName: string;
  jobTitle: string;
  totalSelected: number;
  eligibleCount: number;
  lockedCount: number;
  unlockedCount: number;
  tokenCostPerUnlock: number;
  totalUnlockTokens: number;
  recipients: WhatsAppRecipient[];
}

const TEMPLATES = [
  {
    id: "template_1",
    name: "Template 1: Career Opportunity Intro",
    text: `Hi {{candidate_name}}, we came across your profile and think you'd be a great fit for the {{job_title}} role at {{company_name}} in {{job_location}}. Currently at {{current_company}}? Check details and apply here: {{application_link}}`,
  },
  {
    id: "template_2",
    name: "Template 2: Direct Interview Invitation",
    text: `Dear {{candidate_name}}, our recruitment team at {{company_name}} is actively interviewing for {{job_title}} ({{job_location}}). Given your experience, we invite you to review the role: {{application_link}}`,
  },
  {
    id: "template_3",
    name: "Template 3: Executive & Senior Hiring",
    text: `Hello {{candidate_name}}, {{company_name}} is expanding its team with a strategic role: {{job_title}}. Explore details and discuss with our hiring lead: {{application_link}}`,
  },
];

export function WhatsAppCampaignSheet({
  candidateIds,
  onClose,
}: {
  candidateIds: string[];
  onClose: () => void;
}) {
  const { me } = usePermissions();
  const qc = useQueryClient();

  // Stage 1 vs Stage 2
  const [stage, setStage] = useState<1 | 2>(1);

  // Stage 1 form fields
  const [campaignName, setCampaignName] = useState("WhatsApp Outreach - " + new Date().toLocaleDateString());
  const [jobTitle, setJobTitle] = useState("");
  const [jobMode, setJobMode] = useState("ONSITE");
  const [locationInput, setLocationInput] = useState("");
  const [locations, setLocations] = useState<string[]>(["Bengaluru"]);
  const [minExp, setMinExp] = useState(2);
  const [maxExp, setMaxExp] = useState(6);
  const [currency, setCurrency] = useState("INR");
  const [salaryMin, setSalaryMin] = useState(800000);
  const [salaryMax, setSalaryMax] = useState(1800000);
  const [folderId, setFolderId] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [noticePeriodVal, setNoticePeriodVal] = useState("30");
  const [noticePeriodUnit, setNoticePeriodUnit] = useState<"days" | "months">("days");

  // Stage 2 form fields
  const [selectedTemplate, setSelectedTemplate] = useState("template_1");
  const [hasMedia, setHasMedia] = useState(false);
  const [mediaFile, setMediaFile] = useState<{ name: string; size: number } | null>(null);

  // Load existing folders
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

  // Preview mutation to fetch recipient eligibility & cost from backend
  const previewMutation = useMutation({
    mutationFn: () =>
      api.post<WhatsAppPreviewData>(`${root}/whatsapp/preview`, {
        candidateIds,
        campaignName,
        jobTitle,
        jobMode,
        locations,
        minExp,
        maxExp,
        currency,
        salaryMin,
        salaryMax,
        folderId: folderId || undefined,
        noticePeriod: `${noticePeriodVal} ${noticePeriodUnit}`,
        templateId: selectedTemplate,
      }),
  });

  useEffect(() => {
    previewMutation.mutate();
  }, [candidateIds]);

  // Dispatch mutation
  const dispatchMutation = useMutation({
    mutationFn: () =>
      api.post(`${root}/whatsapp/send`, {
        candidateIds,
        campaignName,
        jobTitle,
        jobMode,
        locations,
        minExp,
        maxExp,
        currency,
        salaryMin,
        salaryMax,
        folderId: folderId || undefined,
        noticePeriod: `${noticePeriodVal} ${noticePeriodUnit}`,
        templateId: selectedTemplate,
      }),
    onSuccess: () => {
      toast.success("Campaign sent successfully");
      onClose();
    },
    onError: (e) => {
      toast.error(errorMessage(e, "Could not send campaign"));
    },
  });

  const previewData = previewMutation.data;

  // Add location chip
  const addLocation = (loc: string) => {
    const trimmed = loc.trim();
    if (trimmed && !locations.includes(trimmed)) {
      setLocations([...locations, trimmed]);
      setLocationInput("");
    }
  };

  const removeLocation = (loc: string) => {
    setLocations(locations.filter((l) => l !== loc));
  };

  // Compile WhatsApp message with placeholders resolved for preview
  const activeTemplate = TEMPLATES.find((t) => t.id === selectedTemplate) || TEMPLATES[0];
  const sampleCandidate = previewData?.recipients[0] || {
    name: "Aman Verma",
    phone: "+91 98765 43210",
  };
  const resolvedPreviewMessage = activeTemplate.text
    .replace(/\{\{candidate_name\}\}/g, sampleCandidate.name)
    .replace(/\{\{job_title\}\}/g, jobTitle || "Software Engineer")
    .replace(/\{\{company_name\}\}/g, me?.organisation?.name || "Clyptus Tech")
    .replace(/\{\{job_location\}\}/g, locations.join(", ") || "Bengaluru")
    .replace(/\{\{current_company\}\}/g, "Tech Corp")
    .replace(/\{\{application_link\}\}/g, "https://clyptus.com/jobs/apply/sample-ref");

  return (
    <Sheet
      open
      title={`WhatsApp outreach (${candidateIds.length} candidate${candidateIds.length === 1 ? "" : "s"})`}
      onClose={onClose}
      wide
    >
      <div className="recruiter-workspace" style={{ padding: "8px 0" }}>
        {/* Step navigation breadcrumb */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "20px",
            paddingBottom: "12px",
            borderBottom: "1px solid var(--r-border)",
          }}
        >
          <button
            type="button"
            className="r-link"
            onClick={() => setStage(1)}
            style={{
              fontWeight: stage === 1 ? 700 : 500,
              color: stage === 1 ? "var(--r-primary)" : "var(--r-text)",
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
                background: stage === 1 ? "var(--r-primary)" : "var(--r-border)",
                color: stage === 1 ? "white" : "var(--r-text)",
                fontSize: "12px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              1
            </span>
            Stage 1: Campaign Setup
          </button>
          <ChevronRight size={16} style={{ color: "var(--r-muted)" }} />
          <button
            type="button"
            className="r-link"
            onClick={() => {
              if (jobTitle.trim() && campaignName.trim()) setStage(2);
            }}
            disabled={!jobTitle.trim() || !campaignName.trim()}
            style={{
              fontWeight: stage === 2 ? 700 : 500,
              color: stage === 2 ? "var(--r-primary)" : "var(--r-muted)",
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
                background: stage === 2 ? "var(--r-primary)" : "var(--r-border)",
                color: stage === 2 ? "white" : "var(--r-text)",
                fontSize: "12px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              2
            </span>
            Stage 2: Compose & Preview
          </button>
        </div>

        {/* STAGE 1: CAMPAIGN SETUP */}
        {stage === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div className="r-card">
              <h3 style={{ margin: "0 0 16px", fontSize: "1.05rem" }}>Campaign & Opportunity Details</h3>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px" }}>
                <label className="r-field" style={{ margin: 0 }}>
                  Campaign name *
                  <input
                    value={campaignName}
                    maxLength={100}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="e.g. Q4 Senior Java Outreach"
                  />
                </label>

                <label className="r-field" style={{ margin: 0 }}>
                  Job title / Designation *
                  <input
                    value={jobTitle}
                    maxLength={90}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Senior Backend Engineer"
                  />
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginTop: "16px" }}>
                <label className="r-field" style={{ margin: 0 }}>
                  Job mode
                  <select value={jobMode} onChange={(e) => setJobMode(e.target.value)}>
                    <option value="ONSITE">On-site</option>
                    <option value="HYBRID">Hybrid</option>
                    <option value="REMOTE">Remote</option>
                  </select>
                </label>

                <div className="r-pair" style={{ margin: 0 }}>
                  <label className="r-field" style={{ margin: 0 }}>
                    Min exp (yrs)
                    <input
                      type="number"
                      min={0}
                      max={40}
                      value={minExp}
                      onChange={(e) => setMinExp(Number(e.target.value))}
                    />
                  </label>
                  <label className="r-field" style={{ margin: 0 }}>
                    Max exp (yrs)
                    <input
                      type="number"
                      min={0}
                      max={40}
                      value={maxExp}
                      onChange={(e) => setMaxExp(Number(e.target.value))}
                    />
                  </label>
                </div>
              </div>

              {/* Locations with removable chips */}
              <div style={{ marginTop: "16px" }}>
                <label style={{ display: "block", fontWeight: 600, fontSize: "0.85rem", marginBottom: "6px" }}>
                  Job locations (searchable, up to 5)
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "8px" }}>
                  {locations.map((loc) => (
                    <span
                      key={loc}
                      style={{
                        background: "var(--r-surface)",
                        border: "1px solid var(--r-border)",
                        borderRadius: "16px",
                        padding: "3px 10px",
                        fontSize: "0.85rem",
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
                      placeholder="Add city (e.g. Pune, Hyderabad) and press Enter"
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border: "1px solid var(--r-border)",
                        fontSize: "0.85rem",
                      }}
                    />
                    <button
                      type="button"
                      className="r-button"
                      onClick={() => addLocation(locationInput)}
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>

              {/* Salary & Notice Period */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginTop: "16px" }}>
                <div className="r-pair" style={{ margin: 0 }}>
                  <label className="r-field" style={{ margin: 0 }}>
                    Currency
                    <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                      <option value="INR">INR (₹)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                  </label>
                  <label className="r-field" style={{ margin: 0 }}>
                    Annual salary min
                    <input
                      type="number"
                      step={50000}
                      value={salaryMin}
                      onChange={(e) => setSalaryMin(Number(e.target.value))}
                    />
                  </label>
                </div>

                <div className="r-pair" style={{ margin: 0 }}>
                  <label className="r-field" style={{ margin: 0 }}>
                    Annual salary max
                    <input
                      type="number"
                      step={50000}
                      value={salaryMax}
                      onChange={(e) => setSalaryMax(Number(e.target.value))}
                    />
                  </label>
                  <label className="r-field" style={{ margin: 0 }}>
                    Notice period
                    <div style={{ display: "flex", gap: "6px" }}>
                      <input
                        type="number"
                        min={0}
                        max={180}
                        value={noticePeriodVal}
                        onChange={(e) => setNoticePeriodVal(e.target.value)}
                        style={{ width: "70px" }}
                      />
                      <select
                        value={noticePeriodUnit}
                        onChange={(e) => setNoticePeriodUnit(e.target.value as "days" | "months")}
                      >
                        <option value="days">Days</option>
                        <option value="months">Months</option>
                      </select>
                    </div>
                  </label>
                </div>
              </div>

              {/* Folder association */}
              <div style={{ marginTop: "16px", borderTop: "1px solid var(--r-border)", paddingTop: "16px" }}>
                <h4 style={{ margin: "0 0 8px", fontSize: "0.9rem" }}>Organise into Talent Folder</h4>
                <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
                  <label className="r-field" style={{ flex: 1, minWidth: "220px", margin: 0 }}>
                    Select existing folder
                    <select value={folderId} onChange={(e) => setFolderId(e.target.value)}>
                      <option value="">No folder (uncategorised)</option>
                      {foldersQuery.data?.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} ({f._count?.candidates ?? 0} candidates)
                        </option>
                      ))}
                    </select>
                  </label>

                  <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
                    <label className="r-field" style={{ margin: 0 }}>
                      Or create new
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
                      <FolderPlus size={15} /> Create
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Recipient review & Clyptus Token / Cost breakdown */}
            <div className="r-card">
              <h3 style={{ margin: "0 0 10px", fontSize: "1rem" }}>
                Recipient Review & Token Accounting ({candidateIds.length} Selected)
              </h3>

              {previewData ? (
                <div>
                  <div
                    style={{
                      background: "var(--r-surface)",
                      border: "1px solid var(--r-border)",
                      borderRadius: "8px",
                      padding: "12px 16px",
                      marginBottom: "16px",
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "24px",
                      fontSize: "0.85rem",
                    }}
                  >
                    <div>
                      <strong style={{ display: "block" }}>{previewData.unlockedCount} Already Unlocked</strong>
                      <span style={{ color: "var(--r-muted)" }}>0 tokens needed</span>
                    </div>
                    <div>
                      <strong style={{ display: "block" }}>{previewData.lockedCount} Locked Contacts</strong>
                      <span style={{ color: "var(--r-muted)" }}>
                        {previewData.totalUnlockTokens} tokens total (2 tokens/candidate)
                      </span>
                    </div>
                    <div>
                      <strong style={{ display: "block" }}>Messaging Fee</strong>
                      <span style={{ color: "var(--r-muted)" }}>Standard plan messaging included</span>
                    </div>
                  </div>

                  <div style={{ maxHeight: "160px", overflowY: "auto", border: "1px solid var(--r-border)", borderRadius: "6px" }}>
                    <table style={{ width: "100%", fontSize: "0.85rem", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: "var(--r-surface)", textAlign: "left" }}>
                          <th style={{ padding: "8px 12px" }}>Candidate</th>
                          <th style={{ padding: "8px 12px" }}>Phone status</th>
                          <th style={{ padding: "8px 12px" }}>Unlock requirement</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.recipients.map((r) => (
                          <tr key={r.id} style={{ borderTop: "1px solid var(--r-border)" }}>
                            <td style={{ padding: "8px 12px" }}>{r.name}</td>
                            <td style={{ padding: "8px 12px" }}>{r.phone || <em style={{ color: "var(--r-muted)" }}>Missing</em>}</td>
                            <td style={{ padding: "8px 12px" }}>
                              {r.unlocked ? (
                                <span style={{ color: "#16a34a" }}>Unlocked</span>
                              ) : (
                                <span style={{ color: "#d97706" }}>2 tokens to unlock</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p style={{ color: "var(--r-muted)", fontSize: "0.85rem" }}>Loading recipient status…</p>
              )}
            </div>

            {/* Stage 1 Actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button
                type="button"
                className="r-link"
                onClick={() => {
                  toast.success("Draft saved");
                  onClose();
                }}
              >
                Save as draft
              </button>
              <button
                type="button"
                disabled={!campaignName.trim() || !jobTitle.trim()}
                className="r-button r-primary"
                onClick={() => setStage(2)}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                Save & Continue to Compose <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STAGE 2: COMPOSE */}
        {stage === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Collapsed setup summary */}
            <div
              style={{
                background: "var(--r-surface)",
                border: "1px solid var(--r-border)",
                borderRadius: "8px",
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              <div>
                <span style={{ fontSize: "0.8rem", color: "var(--r-muted)" }}>Campaign: </span>
                <strong style={{ fontSize: "0.9rem" }}>{campaignName}</strong>
                <span style={{ margin: "0 8px", color: "var(--r-border)" }}>|</span>
                <span style={{ fontSize: "0.85rem" }}>{jobTitle}</span>
                <span style={{ margin: "0 8px", color: "var(--r-border)" }}>|</span>
                <span style={{ fontSize: "0.85rem", color: "var(--r-muted)" }}>
                  {locations.join(", ") || "Any location"} · {candidateIds.length} recipients
                </span>
              </div>
              <button
                type="button"
                className="r-link"
                onClick={() => setStage(1)}
                style={{ fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: "4px" }}
              >
                <ChevronLeft size={14} /> Edit setup
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "24px", alignItems: "start" }}>
              {/* Left Column: Template Selection & Media Upload */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div className="r-card">
                  <h3 style={{ margin: "0 0 12px", fontSize: "1rem" }}>Sender & Template</h3>

                  <div style={{ marginBottom: "16px", fontSize: "0.85rem", color: "var(--r-text)" }}>
                    <span style={{ color: "var(--r-muted)" }}>Configured WhatsApp Sender: </span>
                    <strong>{previewData?.configured ? "Connected Business Account" : "Meta WhatsApp API (Not configured)"}</strong>
                  </div>

                  <label className="r-field">
                    Approved Message Template Style
                    <select
                      value={selectedTemplate}
                      onChange={(e) => setSelectedTemplate(e.target.value)}
                    >
                      {TEMPLATES.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  {/* Media attachment toggle */}
                  <div style={{ marginTop: "14px", borderTop: "1px solid var(--r-border)", paddingTop: "14px" }}>
                    <label className="r-check" style={{ marginBottom: "10px" }}>
                      <input
                        type="checkbox"
                        checked={hasMedia}
                        onChange={(e) => setHasMedia(e.target.checked)}
                      />
                      Add media file header (Job PDF or Company flyer)
                    </label>

                    {hasMedia && (
                      <div
                        style={{
                          border: "1px dashed var(--r-border)",
                          borderRadius: "8px",
                          padding: "16px",
                          textAlign: "center",
                          background: "var(--r-surface)",
                        }}
                      >
                        {mediaFile ? (
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                              {mediaFile.name} ({(mediaFile.size / 1024).toFixed(1)} KB)
                            </span>
                            <button
                              type="button"
                              className="r-link"
                              onClick={() => setMediaFile(null)}
                              style={{ color: "#dc2626" }}
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <div>
                            <Upload size={20} style={{ color: "var(--r-muted)", margin: "0 auto 6px" }} />
                            <p style={{ margin: "0 0 8px", fontSize: "0.8rem", color: "var(--r-text)" }}>
                              Upload PDF, PNG, or JPEG (Max 5 MB)
                            </p>
                            <input
                              type="file"
                              accept=".pdf,.png,.jpg,.jpeg"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) {
                                  if (f.size > 5 * 1024 * 1024) {
                                    toast.error("File exceeds 5 MB limit");
                                    return;
                                  }
                                  setMediaFile({ name: f.name, size: f.size });
                                }
                              }}
                              style={{ fontSize: "0.8rem" }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Placeholders note */}
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--r-muted)",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "6px",
                  }}
                >
                  <Info size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
                  <span>
                    WhatsApp templates strictly use registered variables (Candidate Name, Job Title, Company Name,
                    Location, Employer, and Apply link) to guarantee message deliverability.
                  </span>
                </div>
              </div>

              {/* Right Column: Live Phone-Style WhatsApp Preview */}
              <div>
                <span
                  style={{
                    display: "block",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    marginBottom: "8px",
                    color: "var(--r-muted)",
                  }}
                >
                  LIVE WHATSAPP PREVIEW
                </span>

                <div
                  style={{
                    width: "320px",
                    borderRadius: "24px",
                    border: "8px solid #1e293b",
                    background: "#efeae2",
                    overflow: "hidden",
                    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                    fontFamily: "system-ui, -apple-system, sans-serif",
                  }}
                >
                  {/* WhatsApp chat top bar */}
                  <div
                    style={{
                      background: "#075e54",
                      color: "white",
                      padding: "12px 14px",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        background: "#25d366",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "14px",
                        fontWeight: 700,
                      }}
                    >
                      C
                    </div>
                    <div>
                      <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                        {me?.organisation?.name || "Clyptus Hiring"}
                      </div>
                      <div style={{ fontSize: "0.7rem", opacity: 0.85 }}>Official WhatsApp Business</div>
                    </div>
                  </div>

                  {/* Chat message content */}
                  <div style={{ padding: "16px 12px", minHeight: "260px" }}>
                    <div
                      style={{
                        background: "#ffffff",
                        borderRadius: "8px",
                        padding: "10px 12px",
                        boxShadow: "0 1px 1px rgba(0,0,0,0.06)",
                        fontSize: "0.85rem",
                        lineHeight: 1.45,
                        color: "#111827",
                        position: "relative",
                      }}
                    >
                      {hasMedia && mediaFile && (
                        <div
                          style={{
                            background: "#f1f5f9",
                            borderRadius: "6px",
                            padding: "8px",
                            marginBottom: "8px",
                            fontSize: "0.75rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <Paperclip size={14} />
                          <strong>{mediaFile.name}</strong>
                        </div>
                      )}

                      <p style={{ margin: 0 }}>{resolvedPreviewMessage}</p>

                      <div
                        style={{
                          marginTop: "8px",
                          borderTop: "1px solid #e2e8f0",
                          paddingTop: "6px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <span
                          style={{
                            color: "#0284c7",
                            fontWeight: 600,
                            fontSize: "0.8rem",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          View & Apply <ExternalLink size={12} />
                        </span>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "flex-end",
                          alignItems: "center",
                          gap: "3px",
                          marginTop: "4px",
                          fontSize: "0.65rem",
                          color: "#64748b",
                        }}
                      >
                        <span>12:30 PM</span>
                        <CheckCheck size={13} style={{ color: "#38bdf8" }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Provider notice if unconfigured */}
            {!previewData?.configured && (
              <div
                style={{
                  background: "#fffbeb",
                  border: "1px solid #fde68a",
                  borderRadius: "8px",
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  fontSize: "0.85rem",
                  color: "#92400e",
                }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>
                  WhatsApp integration credentials are not yet configured. Live sending requires your Meta WhatsApp Business API Token.
                  Drafts and templates are preserved.
                </span>
              </div>
            )}

            {/* Stage 2 actions */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderTop: "1px solid var(--r-border)",
                paddingTop: "16px",
              }}
            >
              <button
                type="button"
                className="r-button"
                onClick={() => setStage(1)}
              >
                Back to Setup
              </button>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  className="r-button"
                  onClick={() => {
                    toast.success("Draft saved");
                    onClose();
                  }}
                >
                  Save draft
                </button>
                <button
                  type="button"
                  className="r-button r-primary"
                  disabled={dispatchMutation.isPending}
                  onClick={() => dispatchMutation.mutate()}
                >
                  {dispatchMutation.isPending ? "Dispatching…" : "Send Campaign"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}
