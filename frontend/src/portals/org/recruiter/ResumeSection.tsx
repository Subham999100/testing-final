import React, { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, LockKeyhole } from "lucide-react";
import { api, errorMessage } from "../lib/api";
import { usePermissions } from "../lib/session";
import { qk } from "../lib/queryKeys";
import { Highlight, safeResumeUrl } from "./display";
import { TalentDetail, talentKeys } from "./types";
import "./recruiter.css";

type ResumeCandidate = Pick<
  TalentDetail,
  "id" | "name" | "hasResume" | "contact" | "unlockCost"
>;
/** The locked document is a decorative placeholder, never a CSS-blurred private CV. */
export function ResumeSection({
  candidate: c,
  query = "",
}: {
  candidate: ResumeCandidate;
  query?: string;
}) {
  const { can } = usePermissions();
  const qc = useQueryClient();
  const inFlight = useRef(false);
  const [opened, setOpened] = useState<ResumeCandidate["contact"]>(null);
  const unlock = useMutation({
    mutationFn: () =>
      api.post<{
        contact: NonNullable<TalentDetail["contact"]>;
        charged: number;
      }>(`/org/candidates/${c.id}/unlock`),
    onSuccess: (result) => {
      setOpened(result.contact);
      void qc.invalidateQueries({ queryKey: talentKeys });
      void qc.invalidateQueries({ queryKey: qk.candidates.all });
      void qc.invalidateQueries({ queryKey: qk.tokens.all });
      void qc.invalidateQueries({ queryKey: qk.me });
      void qc.invalidateQueries({ queryKey: qk.dashboard });
    },
    onSettled: () => {
      inFlight.current = false;
    },
  });
  const permitted = can("candidates.resume.view");
  const contact = permitted ? (c.contact ?? opened) : null;
  const url = safeResumeUrl(contact?.resumeUrl);
  return (
    <section
      className="r-profile-section r-resume-section"
      aria-labelledby={`resume-title-${c.id}`}
    >
      <h2 id={`resume-title-${c.id}`}>
        <FileText size={20} /> Attached resume
      </h2>
      {!c.hasResume ? (
        <p className="r-muted">No resume attached.</p>
      ) : !contact ? (
        <>
          <button
            type="button"
            className="r-resume-locked"
            disabled={!permitted || unlock.isPending}
            aria-label={`View resume for ${c.unlockCost} tokens`}
            aria-busy={unlock.isPending}
            onClick={() => {
              if (!permitted || inFlight.current) return;
              inFlight.current = true;
              unlock.mutate();
            }}
          >
            <span className="r-resume-placeholder" aria-hidden="true">
              <span className="r-resume-heading-line" />
              {Array.from({ length: 16 }, (_, i) => (
                <span
                  key={i}
                  style={{
                    width: `${i % 4 === 0 ? 48 : i % 3 === 0 ? 75 : 94}%`,
                  }}
                />
              ))}
            </span>
            <span className="r-resume-overlay">
              <LockKeyhole size={26} />
              <strong>
                {unlock.isPending ? "Opening resume…" : "Click to view resume"}
              </strong>
              <span>
                {permitted
                  ? `${c.unlockCost} tokens on first unlock · no repeat charge`
                  : "Resume access permission is required"}
              </span>
            </span>
          </button>
          {unlock.isError && (
            <p role="alert" className="r-error">
              {errorMessage(unlock.error)} Try again when the issue is resolved.
            </p>
          )}
        </>
      ) : (
        <>
          {url && (
            <>
              <a
                className="r-button"
                href={url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open / download resume
              </a>
              <iframe
                className="r-cv"
                title={`${c.name} resume`}
                src={url}
                sandbox="allow-same-origin"
                referrerPolicy="no-referrer"
              />
              <p className="r-muted">
                If the document host blocks the preview, use Open / download
                resume.
              </p>
            </>
          )}
          {contact.resumeText && (
            <pre className="r-resume-text">
              <Highlight text={contact.resumeText} query={query} />
            </pre>
          )}
          {!url && !contact.resumeText && (
            <p>
              No supported resume is available. Resume links must use HTTPS.
            </p>
          )}
        </>
      )}
    </section>
  );
}
