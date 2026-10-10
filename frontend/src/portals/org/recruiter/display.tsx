import React, { useState } from "react";
import { employmentDates, employmentPeriod } from "./career";
import { Link } from "react-router-dom";
import {
  Bookmark,
  Briefcase,
  MapPin,
  Mail,
  MessageCircle,
  MessageSquare,
  Smartphone,
  Sparkles,
  ExternalLink,
  Linkedin,
  Paperclip,
  Heart,
  Clock,
  IndianRupee,
  Phone,
  CheckCircle2,
  Monitor,
  Eye,
  Download,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, errorMessage } from "../lib/api";
import { usePermissions } from "../lib/session";
import { toast } from "../ui/toast";
import { SearchDetails, TalentCard, talentKeys } from "./types";

export function highlightTerms(query: string): string[] {
  const groups = [false];
  let negate = false;
  const terms: string[] = [];
  for (const token of query.match(/"[^"]+"|[()]|[^\s()]+/g) ?? []) {
    if (token === "NOT") {
      negate = !negate;
      continue;
    }
    if (token === "(") {
      groups.push(groups[groups.length - 1] !== negate);
      negate = false;
      continue;
    }
    if (token === ")") {
      if (groups.length > 1) groups.pop();
      negate = false;
      continue;
    }
    if (token === "AND" || token === "OR") continue;
    if (groups[groups.length - 1] === negate)
      terms.push(token.replace(/^"|"$/g, ""));
    negate = false;
  }
  return [...new Set(terms.filter(Boolean))].sort(
    (a, b) => b.length - a.length,
  );
}
export function Highlight({
  text,
  query = "",
}: {
  text?: string | null;
  query?: string;
}) {
  if (!text) return <>Not specified</>;
  const terms = highlightTerms(query);
  if (!terms.length) return <>{text}</>;
  const pattern = new RegExp(
    `(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
    "gi",
  );
  return (
    <>
      {text
        .split(pattern)
        .map((part, i) => (i % 2 ? <mark key={i}>{part}</mark> : part))}
    </>
  );
}
export const salary = (n?: number | null) =>
  n == null
    ? "Salary not specified"
    : `₹ ${(n / 100000).toLocaleString("en-IN", { maximumFractionDigits: 2 })} Lac`;

export function formatSalary(n?: number | null): string {
  if (n == null) return "Salary not specified";
  const lacs = n / 100000;
  return `₹ ${lacs % 1 === 0 ? lacs : lacs.toFixed(1)} Lac`;
}

export const date = (d?: string | null) =>
  d
    ? new Date(d).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Not available";

export function relativeTime(d?: string | null): string {
  if (!d) return "Not available";
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return "Not available";
  const diffMs = Date.now() - dateObj.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffWeeks === 1) return "1 week ago";
  if (diffWeeks < 4) return `${diffWeeks} weeks ago`;
  if (diffMonths === 1) return "1 month ago";
  if (diffMonths < 12) return `${diffMonths} months ago`;
  if (diffYears === 1) return "1 year ago";
  return `${diffYears} years ago`;
}

export const experience = (c: TalentCard) =>
  c.experienceYears == null
    ? "Experience not specified"
    : `${c.experienceYears}y`;

export function formatExperience(c: TalentCard): string {
  if (c.experienceYears == null) return "Experience not specified";
  const m = c.professional?.experienceMonths;
  if (!m) return `${c.experienceYears}y`;
  return `${c.experienceYears}y ${m}m`;
}

export function maskPhone(phone?: string | null): string {
  if (!phone) return "+91-837*******";
  const clean = phone.replace(/[\s-]/g, "");
  if (clean.length > 5) {
    return clean.slice(0, clean.length - 6) + "******";
  }
  return "+91-837*******";
}

export function getVerificationStatus(details?: SearchDetails | null) {
  const isEmail = details?.isEmailVerified;
  const isPhone = details?.isPhoneVerified;
  if (isEmail && isPhone) {
    return { verified: true, text: "Verified phone & email id" };
  }
  if (isPhone) {
    return { verified: true, text: "Verified phone" };
  }
  if (isEmail) {
    return { verified: true, text: "Verified email" };
  }
  return { verified: false, text: "Phone & email unverified" };
}

export function safeResumeUrl(value?: string | null) {
  try {
    const u = new URL(value ?? "");
    return u.protocol === "https:" && !u.username && !u.password
      ? u.href
      : null;
  } catch {
    return null;
  }
}
export function FavouriteButton({ candidate }: { candidate: TalentCard }) {
  const { can } = usePermissions();
  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: () =>
      candidate.saved
        ? api.del(`/org/candidates/${candidate.id}/save`)
        : api.post(`/org/candidates/${candidate.id}/save`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: talentKeys });
      void qc.invalidateQueries({ queryKey: ["org", "candidates"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (!can("candidates.save")) return null;
  return (
    <button
      type="button"
      className="r-card-bottom-btn"
      aria-label={candidate.saved ? "Remove from favourites" : "Add to favourites"}
      aria-pressed={candidate.saved}
      disabled={save.isPending}
      onClick={() => save.mutate()}
    >
      <Heart
        size={14}
        fill={candidate.saved ? "#ef4444" : "none"}
        color={candidate.saved ? "#ef4444" : "currentColor"}
      />
      <span>Favourite</span>
    </button>
  );
}
export const SaveButton = FavouriteButton;
export function CompactProfileCard({
  candidate: c,
  query = "",
  selected,
  onSelect,
  compact = false,
}: {
  candidate: TalentCard;
  query?: string;
  selected?: boolean;
  onSelect?: (id: string) => void;
  compact?: boolean;
}) {
  const { can } = usePermissions();
  const p = c.professional;
  const href = `/org/candidates/${c.id}${query ? `?search=${encodeURIComponent(query)}` : ""}`;
  return (
    <article className={`r-card r-candidate ${compact ? "r-compact" : ""}`}>
      <div className="r-row r-start">
        {onSelect && (
          <input
            type="checkbox"
            aria-label={`Select ${c.name}`}
            checked={!!selected}
            onChange={() => onSelect(c.id)}
          />
        )}
        <div className="r-avatar" aria-hidden="true">
          {c.firstName?.[0]}
          {c.lastName?.[0]}
        </div>
        <div className="r-grow">
          <h2>
            {can("candidates.read") ? <Link to={href}>{c.name}</Link> : c.name}
          </h2>
          <p className="r-muted">
            <Highlight text={c.headline} query={query} />
          </p>
        </div>
        <SaveButton candidate={c} />
      </div>
      <div className="r-meta">
        <span>
          <Briefcase size={15} />
          {experience(c)}
        </span>
        <span>{salary(p?.currentSalary)}</span>
        <span>
          <MapPin size={15} />
          {c.location || "Location not specified"}
        </span>
      </div>
      {!compact && (
        <dl className="r-facts">
          <dt>Current</dt>
          <dd>
            <Highlight
              text={
                [p?.designation, c.currentCompany]
                  .filter(Boolean)
                  .join(" at ") || c.headline
              }
              query={query}
            />
          </dd>
          <dt>Previous</dt>
          <dd>
            {p?.employment?.[1]
              ? `${p.employment[1].title} · ${p.employment[1].organisation}`
              : "Not specified"}
          </dd>
          <dt>Education</dt>
          <dd>
            {p?.education?.[0]
              ? `${p.education[0].title} · ${p.education[0].organisation}`
              : "Not specified"}
          </dd>
          <dt>Preferred locations</dt>
          <dd>{p?.preferredLocations?.join(", ") || "Not specified"}</dd>
          <dt>Notice period</dt>
          <dd>
            {p?.noticePeriodDays == null
              ? "Not specified"
              : p.noticePeriodDays === 0
                ? "Immediate"
                : `${p.noticePeriodDays} days`}
          </dd>
        </dl>
      )}
      <div className="r-skills">
        {c.skills.slice(0, compact ? 8 : 16).map((s) => (
          <span key={s}>
            <Highlight
              text={s}
              query={query || c.matchingSkills?.map((s) => `"${s}"`).join(" ")}
            />
          </span>
        ))}
        {c.skills.length > (compact ? 8 : 16) && (
          <span>+{c.skills.length - (compact ? 8 : 16)} more</span>
        )}
      </div>
      {c.aiReason && (
        <p className="r-muted">
          <strong>AI suggestion:</strong> {c.aiReason}
        </p>
      )}
      {c.skillCoverage != null && (
        <p className="r-muted">
          {c.skillCoverage}% required/shared skills covered ·{" "}
          {c.matchingSkills?.join(", ")}
        </p>
      )}
      <footer className="r-row">
        <span className="r-muted">
          Updated {date(p?.updatedAt || c.updatedAt || c.createdAt)}
        </span>
        {can("candidates.read") && (
          <Link className="r-link" to={href}>
            View profile →
          </Link>
        )}
      </footer>
    </article>
  );
}
export function ProfileCard(props: {
  candidate: TalentCard;
  query?: string;
  selected?: boolean;
  onSelect?: (id: string) => void;
  compact?: boolean;
  onEmail?: (id: string) => void;
  onWhatsApp?: (id: string) => void;
  onSms?: (id: string) => void;
  onComment?: (candidate: TalentCard) => void;
}) {
  const { candidate: c, query = "", selected, onSelect, compact } = props;
  const { can } = usePermissions(),
    [skillsExpanded, setSkillsExpanded] = useState(false),
    [summaryOpen, setSummaryOpen] = useState(false);
  if (compact) return <CompactProfileCard {...props} />;
  const p = c.professional,
    href = `/org/candidates/${c.id}${query ? `?search=${encodeURIComponent(query)}` : ""}`;
  const jobs = [...(p?.employment || [])].sort(
    (a, b) =>
      (employmentDates(b)?.start ?? -1) - (employmentDates(a)?.start ?? -1),
  );
  const current = jobs.find((j) => j.current || employmentDates(j)?.current),
    past = jobs.find((j) => j !== current);
  const terms = highlightTerms(query);

  const isNewlyAdded = c.createdAt
    ? Date.now() - new Date(c.createdAt).getTime() < 14 * 86400000
    : false;

  const portfolioUrl = p?.searchDetails?.portfolioUrl;
  const isLinkedIn = portfolioUrl?.toLowerCase().includes("linkedin.com");

  const formatJobLine = (job: typeof current) => {
    if (!job) return null;
    const parts = [job.title, job.organisation, employmentPeriod(job)].filter(Boolean);
    return parts.join(" | ");
  };

  const currentJobText =
    formatJobLine(current) ||
    [p?.designation || c.headline, c.currentCompany].filter(Boolean).join(" | ");

  const pastJobText = formatJobLine(past);

  const verification = getVerificationStatus(p?.searchDetails);

  // Resume match evidence
  const resumeMatch = query
    ? terms
        .filter(
          (t) =>
            c.skills.some((s) => s.toLowerCase().includes(t.toLowerCase())) ||
            p?.summary?.toLowerCase().includes(t.toLowerCase()),
        )
        .join(", ")
    : c.matchingSkills?.slice(0, 3).join(", ");

  const displayedSkills = skillsExpanded ? c.skills : c.skills.slice(0, 10);
  const remainingSkillsCount = c.skills.length - 10;

  const handleResumeClick = (e: React.MouseEvent) => {
    if (!c.hasResume) {
      e.preventDefault();
      toast.error("No resume attached for this candidate");
      return;
    }
    if (c.unlocked) {
      window.open(`/api/v1/org/recruiter/candidates/${c.id}/resume/download`, "_blank");
    } else {
      window.location.href = href;
    }
  };

  const handleViewNumber = () => {
    window.location.href = href;
  };

  return (
    <div className="r-candidate-card-wrapper">
      <article className="r-card r-candidate r-foundit-card">
        <div className="r-foundit-layout">
          {/* LEFT COLUMN: ~68–70% */}
          <div className="r-foundit-left">
            <div className="r-foundit-header">
              {onSelect && (
                <input
                  type="checkbox"
                  className="r-card-checkbox"
                  aria-label={`Select ${c.name}`}
                  checked={!!selected}
                  onChange={() => onSelect(c.id)}
                />
              )}
              <div className="r-foundit-avatar" aria-hidden="true">
                {(c.firstName?.[0] || "") + (c.lastName?.[0] || "")}
              </div>
              <div className="r-foundit-identity">
                <div className="r-foundit-name-row">
                  <h2 className="r-foundit-name">
                    {can("candidates.read") ? (
                      <Link to={href} className="r-foundit-name-link">{c.name}</Link>
                    ) : (
                      c.name
                    )}
                  </h2>
                  {isNewlyAdded && (
                    <span className="r-badge-newly-added">Newly added</span>
                  )}
                </div>
                <div className="r-foundit-stats">
                  <span>
                    <Briefcase size={14} className="r-stat-icon" />
                    {formatExperience(c)}
                  </span>
                  <span>
                    <IndianRupee size={13} className="r-stat-icon" />
                    {salary(p?.currentSalary)}
                  </span>
                  <span className={p?.noticePeriodDays === 0 ? "r-immediate-tag" : ""}>
                    <Clock size={13} className="r-stat-icon" />
                    {p?.noticePeriodDays === 0
                      ? "Immediate Joiner"
                      : p?.noticePeriodDays != null
                        ? `${p.noticePeriodDays} days notice`
                        : "Notice not specified"}
                  </span>
                  <span>
                    <MapPin size={14} className="r-stat-icon" />
                    {c.location || "Location not specified"}
                  </span>
                </div>
              </div>
            </div>

            <dl className="r-foundit-facts">
              {currentJobText && (
                <>
                  <dt>Current:</dt>
                  <dd>
                    <Highlight text={currentJobText} query={query} />
                  </dd>
                </>
              )}

              {pastJobText && (
                <>
                  <dt>Past:</dt>
                  <dd>
                    <Highlight text={pastJobText} query={query} />
                  </dd>
                </>
              )}

              {c.skills.length > 0 && (
                <>
                  <dt>Skills:</dt>
                  <dd>
                    <span className="r-foundit-skills-list">
                      {displayedSkills.map((s, idx) => (
                        <React.Fragment key={s}>
                          <Highlight text={s} query={query} />
                          {idx < displayedSkills.length - 1 ? ", " : ""}
                        </React.Fragment>
                      ))}
                    </span>
                    {remainingSkillsCount > 0 && (
                      <button
                        type="button"
                        className="r-skills-more-btn"
                        onClick={() => setSkillsExpanded(!skillsExpanded)}
                      >
                        {skillsExpanded ? "Show fewer" : `+${remainingSkillsCount} More`} <span aria-hidden="true">⌄</span>
                      </button>
                    )}
                  </dd>
                </>
              )}

              {p?.preferredLocations && p.preferredLocations.length > 0 && (
                <>
                  <dt>Pref. location:</dt>
                  <dd>{p.preferredLocations.join(", ")}</dd>
                </>
              )}

              {resumeMatch && (
                <>
                  <dt>In resume:</dt>
                  <dd>
                    <mark className="r-in-resume-mark">{resumeMatch}</mark>
                  </dd>
                </>
              )}

              {p?.education && p.education[0] && (
                <>
                  <dt>Education:</dt>
                  <dd>
                    {[
                      p.education[0].title,
                      p.education[0].organisation,
                      p.education[0].period,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </dd>
                </>
              )}
            </dl>

            <div className="r-foundit-bottom-left">
              {can("candidates.read") ? (
                <Link
                  to={`${href}#similar`}
                  className="r-card-bottom-btn"
                  title="Similar profiles"
                >
                  <Sparkles size={14} />
                  <span>Similar profiles</span>
                </Link>
              ) : (
                <span
                  className="r-card-bottom-btn r-bottom-disabled"
                  title="Candidate view permission required"
                >
                  <Sparkles size={14} />
                  <span>Similar profiles</span>
                </span>
              )}
              <button
                type="button"
                className="r-card-bottom-btn"
                onClick={() => props.onComment?.(c)}
                title="Comment"
              >
                <MessageSquare size={14} />
                <span>Comment</span>
              </button>
              <FavouriteButton candidate={c} />
            </div>
          </div>

          {/* RIGHT COLUMN: ~30–32% */}
          <div className="r-foundit-right">
            <div className="r-foundit-top-pills">
              {isLinkedIn && portfolioUrl ? (
                <a
                  href={portfolioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="r-pill-action r-linkedin-pill"
                  title="Open candidate's LinkedIn profile"
                >
                  <Linkedin size={14} className="r-linkedin-icon" />
                  <span>LinkedIn</span>
                </a>
              ) : (
                <span
                  className="r-pill-action r-pill-disabled"
                  title="LinkedIn profile not provided"
                  aria-disabled="true"
                >
                  <Linkedin size={14} />
                  <span>LinkedIn</span>
                </span>
              )}

              {c.hasResume ? (
                <button
                  type="button"
                  className="r-pill-action r-resume-pill"
                  onClick={handleResumeClick}
                  title={c.unlocked ? "Download resume" : "View / unlock resume"}
                >
                  <Paperclip size={14} />
                  <span>Resume</span>
                </button>
              ) : (
                <span
                  className="r-pill-action r-pill-disabled"
                  title="No resume attached"
                  aria-disabled="true"
                >
                  <Paperclip size={14} />
                  <span>Resume</span>
                </span>
              )}
            </div>

            <div className="r-foundit-summary-block">
              <span className="r-summary-label">Summary:</span>
              {p?.summary ? (
                <p className="r-summary-text">
                  <Highlight
                    text={
                      summaryOpen || p.summary.length <= 160
                        ? p.summary
                        : p.summary.slice(0, 160) + "..."
                    }
                    query={query}
                  />
                  {p.summary.length > 160 && (
                    <button
                      type="button"
                      className="r-summary-toggle"
                      onClick={() => setSummaryOpen(!summaryOpen)}
                    >
                      {summaryOpen ? " less" : " more"}
                    </button>
                  )}
                </p>
              ) : (
                <p className="r-summary-text r-summary-absent">
                  Summary not provided
                </p>
              )}
            </div>

            <div className="r-foundit-contact-block">
              <div className="r-contact-phone-row">
                <div className="r-phone-bubble" aria-hidden="true">
                  <Phone size={13} />
                </div>
                <span className="r-phone-masked">
                  {maskPhone(p?.searchDetails?.isPhoneVerified ? "+91 837******" : null)}
                </span>
                <button
                  type="button"
                  onClick={handleViewNumber}
                  className="r-view-number-btn"
                  title="View contact number"
                >
                  View Number
                </button>
              </div>
              <div className="r-verification-line">
                {verification.verified ? (
                  <span className="r-verified-badge">
                    <CheckCircle2 size={13} className="r-verified-icon" />
                    <span>{verification.text}</span>
                  </span>
                ) : (
                  <span className="r-unverified-text">
                    {verification.text}
                  </span>
                )}
              </div>
            </div>

            <div className="r-foundit-comm-pills">
              {props.onEmail ? (
                <button
                  type="button"
                  className="r-comm-pill"
                  onClick={() => props.onEmail?.(c.id)}
                  title="Email candidate"
                >
                  <Mail size={13} />
                  <span>Email</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="r-comm-pill r-comm-disabled"
                  disabled
                  title="Email messaging permission required"
                >
                  <Mail size={13} />
                  <span>Email</span>
                </button>
              )}

              {props.onWhatsApp ? (
                <button
                  type="button"
                  className="r-comm-pill"
                  onClick={() => props.onWhatsApp?.(c.id)}
                  title="Send WhatsApp message"
                >
                  <MessageCircle size={13} />
                  <span>WhatsApp</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="r-comm-pill r-comm-disabled"
                  disabled
                  title="WhatsApp messaging permission required"
                >
                  <MessageCircle size={13} />
                  <span>WhatsApp</span>
                </button>
              )}

              {props.onSms ? (
                <button
                  type="button"
                  className="r-comm-pill"
                  onClick={() => props.onSms?.(c.id)}
                  title="Send SMS"
                >
                  <Smartphone size={13} />
                  <span>SMS</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="r-comm-pill r-comm-disabled"
                  disabled
                  title="SMS messaging permission required"
                >
                  <Smartphone size={13} />
                  <span>SMS</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </article>

      <div className="r-card-activity-row">
        <span className="r-activity-item" title="Last candidate activity">
          <Monitor size={13} className="r-activity-icon" />
          <span>Active: {relativeTime(p?.lastActiveAt)}</span>
        </span>
        <span className="r-activity-item" title="Last profile update">
          <Clock size={13} className="r-activity-icon" />
          <span>Updated: {relativeTime(p?.updatedAt || c.updatedAt || c.createdAt)}</span>
        </span>
        <span
          className="r-activity-item"
          title={`Viewed by ${c.viewCount ?? 0} recruiters in your organisation`}
        >
          <Eye size={13} className="r-activity-icon" />
          <span>{c.viewCount ?? 0}</span>
        </span>
        <span
          className="r-activity-item"
          title={`Resume downloaded by ${c.downloadCount ?? 0} recruiters in your organisation`}
        >
          <Download size={13} className="r-activity-icon" />
          <span>{c.downloadCount ?? 0}</span>
        </span>
      </div>
    </div>
  );
}
export function QueryError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <div className="r-card r-error" role="alert">
      <p>{errorMessage(error, "Could not load this page")}</p>
      <button type="button" className="r-button" onClick={retry}>
        Try again
      </button>
    </div>
  );
}