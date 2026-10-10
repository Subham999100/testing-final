import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  X,
  Smartphone,
  FolderPlus,
  AlertCircle,
  Check,
  Send,
  MessageSquare,
  Info,
} from "lucide-react";
import { api, errorMessage } from "../lib/api";
import { usePermissions } from "../lib/session";
import { toast } from "../ui/toast";
import { Sheet } from "../ui/ui";
import { Folder, root, talentKeys } from "./types";

interface SmsPreviewResponse {
  configured: boolean;
  totalSelected: number;
  recipientsWithPhone: number;
  recipientsMissingPhone: number;
  sampleText: string;
  charCount: number;
  segments: number;
  recipients: { id: string; name: string; phone: string; valid: boolean }[];
}

const SMS_TEMPLATES = [
  {
    key: "resume_shortlisted",
    name: "Resume Shortlisted",
    textTemplate: (v: { jobTitle: string; companyName: string; contactInfo: string }) =>
      `Dear Candidate, your resume has been shortlisted for the ${v.jobTitle || "Role"} position at ${v.companyName || "Company"}. Please contact ${v.contactInfo || "HR"} or reply. - Clyptus`,
    fields: [
      { key: "jobTitle", label: "Job Title", placeholder: "e.g. Software Engineer", max: 30 },
      { key: "companyName", label: "Company Name", placeholder: "e.g. Acme Corp", max: 30 },
      { key: "contactInfo", label: "Contact Person / Phone", placeholder: "e.g. 9876543210", max: 30 },
    ],
  },
  {
    key: "interview_schedule",
    name: "Interview Call Invitation",
    textTemplate: (v: { jobTitle: string; interviewDate: string; contactInfo: string }) =>
      `Dear Candidate, you have an interview for ${v.jobTitle || "Role"} on ${v.interviewDate || "Monday"}. Confirm availability with ${v.contactInfo || "Recruiter"}. - Clyptus`,
    fields: [
      { key: "jobTitle", label: "Job Title", placeholder: "e.g. DevOps Engineer", max: 30 },
      { key: "interviewDate", label: "Interview Date/Time", placeholder: "e.g. 15 Oct, 2 PM", max: 30 },
      { key: "contactInfo", label: "Contact Info", placeholder: "e.g. hr@company.com", max: 30 },
    ],
  },
];

export function SmsDrawer({
  candidateIds,
  onClose,
}: {
  candidateIds: string[];
  onClose: () => void;
}) {
  const { me } = usePermissions();
  const qc = useQueryClient();

  const [selectedTemplateKey, setSelectedTemplateKey] = useState("resume_shortlisted");
  const [variables, setVariables] = useState<Record<string, string>>({
    jobTitle: "",
    companyName: me?.organisation?.name || "",
    contactInfo: me?.user?.email || "",
    interviewDate: "",
  });

  const [folderId, setFolderId] = useState("");
  const [newFolderName, setNewFolderName] = useState("");

  const activeTemplate =
    SMS_TEMPLATES.find((t) => t.key === selectedTemplateKey) || SMS_TEMPLATES[0];

  // Fetch folders
  const foldersQuery = useQuery({
    queryKey: [...talentKeys, "folders"],
    queryFn: () => api.get<Folder[]>(`${root}/folders`),
  });

  // Create folder
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

  // Backend preview query
  const previewMutation = useMutation({
    mutationFn: () =>
      api.post<SmsPreviewResponse>(`${root}/sms/preview`, {
        candidateIds,
        templateKey: selectedTemplateKey,
        folderId: folderId || undefined,
        variables,
      }),
  });

  useEffect(() => {
    previewMutation.mutate();
  }, [candidateIds, selectedTemplateKey]);

  // Send mutation
  const sendMutation = useMutation({
    mutationFn: () =>
      api.post(`${root}/sms/send`, {
        candidateIds,
        templateKey: selectedTemplateKey,
        folderId: folderId || undefined,
        variables,
      }),
    onSuccess: () => {
      toast.success("SMS batch dispatched");
      onClose();
    },
    onError: (e) => {
      toast.error(errorMessage(e, "Could not send SMS"));
    },
  });

  const previewData = previewMutation.data;
  const generatedMessage = activeTemplate.textTemplate(variables as any);
  const charLength = generatedMessage.length;
  const segments = Math.max(1, Math.ceil(charLength / 160));

  return (
    <Sheet
      open
      title={`Send SMS (${candidateIds.length} candidate${candidateIds.length === 1 ? "" : "s"})`}
      onClose={onClose}
    >
      <div
        className="recruiter-workspace"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "18px",
          padding: "8px 0",
        }}
      >
        {/* Folder Association */}
        <div
          style={{
            background: "var(--r-surface)",
            border: "1px solid var(--r-border)",
            borderRadius: "8px",
            padding: "12px 14px",
          }}
        >
          <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "6px" }}>
            Associate with Folder
          </label>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <select
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              style={{
                flex: 1,
                minWidth: "180px",
                padding: "6px 10px",
                borderRadius: "6px",
                border: "1px solid var(--r-border)",
                fontSize: "0.85rem",
              }}
            >
              <option value="">No folder</option>
              {foldersQuery.data?.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f._count?.candidates ?? 0})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Template Selector */}
        <div>
          <label className="r-field" style={{ margin: 0 }}>
            Select SMS Template
            <select
              value={selectedTemplateKey}
              onChange={(e) => setSelectedTemplateKey(e.target.value)}
            >
              {SMS_TEMPLATES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Template Variable Fields (Max 30 chars each) */}
        <div
          style={{
            border: "1px solid var(--r-border)",
            borderRadius: "8px",
            padding: "14px",
            background: "white",
          }}
        >
          <h4 style={{ margin: "0 0 12px", fontSize: "0.9rem" }}>Template Variables (30 characters limit)</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {activeTemplate.fields.map((field) => (
              <div key={field.key}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <label
                    htmlFor={`sms-var-${field.key}`}
                    style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--r-text)" }}
                  >
                    {field.label} *
                  </label>
                  <span style={{ fontSize: "0.75rem", color: "var(--r-muted)" }}>
                    {(variables[field.key] || "").length}/{field.max}
                  </span>
                </div>
                <input
                  id={`sms-var-${field.key}`}
                  maxLength={field.max}
                  value={variables[field.key] || ""}
                  onChange={(e) =>
                    setVariables({
                      ...variables,
                      [field.key]: e.target.value.slice(0, field.max),
                    })
                  }
                  placeholder={field.placeholder}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    borderRadius: "6px",
                    border: "1px solid var(--r-border)",
                    fontSize: "0.85rem",
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Phone-Style SMS Preview */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--r-muted)" }}>
              LIVE PHONE PREVIEW
            </span>
            <span style={{ fontSize: "0.8rem", color: "var(--r-text)", fontWeight: 500 }}>
              {charLength} / 160 characters · <strong>{segments} {segments === 1 ? "segment" : "segments"}</strong>
            </span>
          </div>

          <div
            style={{
              background: "#f1f5f9",
              borderRadius: "16px",
              padding: "16px",
              border: "1px solid #cbd5e1",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px", color: "#64748b", fontSize: "0.75rem" }}>
              <Smartphone size={14} /> SMS Notification · Sender: Clyptus
            </div>

            <div
              style={{
                background: "#0284c7",
                color: "white",
                borderRadius: "14px 14px 2px 14px",
                padding: "10px 14px",
                fontSize: "0.85rem",
                lineHeight: 1.45,
                boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                maxWidth: "90%",
                marginLeft: "auto",
              }}
            >
              {generatedMessage}
            </div>
            <div style={{ textAlign: "right", marginTop: "4px", fontSize: "0.65rem", color: "#94a3b8" }}>
              Delivered via SMS
            </div>
          </div>
        </div>

        {/* Recipient Validation Notice */}
        {previewData && (
          <div
            style={{
              fontSize: "0.8rem",
              padding: "10px 12px",
              borderRadius: "6px",
              background: previewData.recipientsMissingPhone > 0 ? "#fffbeb" : "#f0fdf4",
              border: `1px solid ${previewData.recipientsMissingPhone > 0 ? "#fde68a" : "#bbf7d0"}`,
              color: previewData.recipientsMissingPhone > 0 ? "#92400e" : "#166534",
            }}
          >
            {previewData.recipientsWithPhone} candidates have a valid phone number.
            {previewData.recipientsMissingPhone > 0 && (
              <span> {previewData.recipientsMissingPhone} candidates have no phone number on record and will be skipped.</span>
            )}
          </div>
        )}

        {/* Provider configuration warning if unconfigured */}
        {!previewData?.configured && (
          <div
            style={{
              background: "#fffbeb",
              border: "1px solid #fde68a",
              borderRadius: "6px",
              padding: "10px 12px",
              fontSize: "0.8rem",
              color: "#92400e",
              display: "flex",
              alignItems: "flex-start",
              gap: "8px",
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
            <span>
              SMS Gateway is not currently configured. Dispatches require organisation SMS credentials. Draft content is preserved.
            </span>
          </div>
        )}

        {/* Actions */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
            borderTop: "1px solid var(--r-border)",
            paddingTop: "14px",
            marginTop: "6px",
          }}
        >
          <button type="button" className="r-button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="r-button r-primary"
            disabled={sendMutation.isPending}
            onClick={() => sendMutation.mutate()}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <Send size={15} />
            {sendMutation.isPending ? "Sending…" : "Send SMS"}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
