import { apiClient } from "../../../services/api";
import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Bell,
  Briefcase,
  Link2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  Sparkles,
} from "lucide-react";
import { api, errorMessage } from "../lib/api";
import { usePermissions } from "../lib/session";
import { useDebounced } from "../lib/format";
import { AddToJobSheet } from "../pages/candidates";
import { Sheet } from "../ui/ui";
import { toast } from "../ui/toast";
import {
  CareerEntry,
  TalentCard,
  TalentDetail,
  root,
  talentKeys,
} from "./types";
import {
  Highlight,
  ProfileCard,
  QueryError,
  SaveButton,
  date,
  experience,
  salary,
} from "./display";
import { ResumeSection } from "./ResumeSection";
import { ProfileEditor } from "./ProfileEditor";
import "./recruiter.css";
function Timeline({ title, rows }: { title: string; rows?: CareerEntry[] }) {
  return (
    <section className="r-profile-section">
      <h2>{title}</h2>
      {rows?.length ? (
        <ol className="r-timeline">
          {rows.map((r, i) => (
            <li key={i}>
              <h3>{r.title}</h3>
              <p>{r.organisation}</p>
              <p className="r-muted">{r.period}</p>
              {r.description && <p className="r-prewrap">{r.description}</p>}
            </li>
          ))}
        </ol>
      ) : (
        <p className="r-muted">No {title.toLowerCase()} added yet.</p>
      )}
    </section>
  );
}
export function ProfilePage() {
  const { id = "" } = useParams();
  return <ProfileContent key={id} id={id} />;
}
function ProfileContent({ id }: { id: string }) {
  const [params] = useSearchParams();
  const query = params.get("search") ?? "";
  const { can } = usePermissions();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [addJob, setAddJob] = useState(false);
  const [note, setNote] = useState("");
  const [reminder, setReminder] = useState(false);
  const [due, setDue] = useState("");
  const [title, setTitle] = useState("Follow up with candidate");
  const [mode, setMode] = useState("skills");
  const [jobId, setJobId] = useState("");
  const [jobSearch, setJobSearch] = useState("");
  const jobQ = useDebounced(jobSearch);
  const detail = useQuery({
    queryKey: [...talentKeys, "detail", id],
    queryFn: () => api.get<TalentDetail>(`${root}/candidates/${id}`),
  });
  const similar = useQuery({
    queryKey: [...talentKeys, "similar", id, mode, jobId],
    queryFn: () =>
      api.get<{ method: string; candidates: TalentCard[] }>(
        `${root}/candidates/${id}/similar`,
        {
          mode,
          jobId: mode === "skills" ? jobId : undefined,
        },
      ),
    enabled: !!detail.data,
  });
  const jobs = useQuery({
    queryKey: [...talentKeys, "job-picker", jobQ],
    queryFn: () =>
      api.page<{ id: string; title: string }>("/org/jobs", {
        search: jobQ,
        limit: 20,
      }),
    enabled: can("jobs.read.all", "jobs.read.assigned"),
  });
  const aiSuggestions = useMutation({
    mutationFn: async () => {
      const response = (await apiClient.post(
        `${root}/candidates/${id}/ai-similar`,
        jobId ? { jobId } : {},
        {
          timeout: 45000,
        },
      )) as unknown as {
        data: { method: string; candidates: TalentCard[]; charged: number };
      };
      return response.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["org", "tokens"] });
      void qc.invalidateQueries({ queryKey: ["org", "me"] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  useEffect(() => {
    aiSuggestions.reset();
  }, [jobId, mode]);
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: talentKeys });
  };
  useEffect(() => {
    if (detail.data)
      void api.post(`${root}/candidates/${id}/viewed`).catch(() => {});
  }, [id, !!detail.data]);
  const addNote = useMutation({
    mutationFn: () =>
      api.post(`/org/candidates/${id}/notes`, { body: note.trim() }),
    onSuccess: () => {
      setNote("");
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const addReminder = useMutation({
    mutationFn: () =>
      api.post("/org/tasks", {
        title: title.trim(),
        dueAt: new Date(due).toISOString(),
        relatedType: "CANDIDATE",
        relatedId: id,
        description: `Follow up: ${detail.data?.name}. /org/candidates/${id}`,
      }),
    onSuccess: () => {
      setReminder(false);
      void qc.invalidateQueries({ queryKey: ["org", "tasks"] });
      toast.success("Follow-up task created");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (detail.isError)
    return (
      <div className="recruiter-workspace">
        <QueryError error={detail.error} retry={() => void detail.refetch()} />
      </div>
    );
  if (!detail.data)
    return (
      <div className="r-card" role="status">
        Loading candidate profile…
      </div>
    );
  const c = detail.data,
    p = c.professional;
  return (
    <div className="recruiter-workspace">
      <Link
        className="r-link r-back"
        to={`/org/candidates${query ? `?search=${encodeURIComponent(query)}` : ""}`}
      >
        <ArrowLeft size={16} />
        Candidate search
      </Link>
      <div className="r-profile-toolbar r-card">
        <div className="r-row">
          {can("applications.transition") && (
            <button className="r-button" onClick={() => setAddJob(true)}>
              <Plus size={16} />
              Add to job
            </button>
          )}
          {can("tasks.use") && (
            <button className="r-button" onClick={() => setReminder(true)}>
              <Bell size={16} />
              Set reminder
            </button>
          )}
          <button
            className="r-button"
            onClick={() => {
              void navigator.clipboard
                .writeText(`${window.location.origin}/org/candidates/${id}`)
                .then(() => toast.success("Internal profile link copied"))
                .catch(() =>
                  toast.error(
                    "Could not copy. Copy the URL from your address bar.",
                  ),
                );
            }}
          >
            <Link2 size={16} />
            Copy profile link
          </button>
          {can("interviews.read") && (
            <Link className="r-button" to="/org/interviews">
              Interviews
            </Link>
          )}
        </div>
        <SaveButton candidate={c} />
      </div>
      <div className="r-profile-grid">
        <div className="r-profile-main">
          <section className="r-card r-identity">
            <div className="r-row r-start">
              <div className="r-avatar r-avatar-large" aria-hidden="true">
                {c.firstName?.[0]}
                {c.lastName?.[0]}
              </div>
              <div className="r-grow">
                <h1>{c.name}</h1>
                <p>
                  <Highlight text={c.headline} query={query} />
                </p>
                <div className="r-meta">
                  <span>
                    <Briefcase size={16} />
                    {experience(c)}
                  </span>
                  <span>{salary(p?.currentSalary)}</span>
                  <span>
                    <MapPin size={16} />
                    {c.location || "Not specified"}
                  </span>
                </div>
              </div>
            </div>
            <dl className="r-facts">
              <dt>Current</dt>
              <dd>
                {p?.designation || c.headline || "Not specified"}
                {c.currentCompany ? ` at ${c.currentCompany}` : ""}
              </dd>
              <dt>Highest degree</dt>
              <dd>{p?.education?.[0]?.title || "Not specified"}</dd>
              <dt>Preferred locations</dt>
              <dd>{p?.preferredLocations.join(", ") || "Not specified"}</dd>
              <dt>Notice period</dt>
              <dd>
                {p?.noticePeriodDays == null
                  ? "Not specified"
                  : p.noticePeriodDays === 0
                    ? "Immediate"
                    : `${p.noticePeriodDays} days`}
              </dd>
            </dl>
            {c.contact ? (
              <div className="r-contact">
                <div className="r-row">
                  <a
                    className="r-button"
                    href={`mailto:${encodeURIComponent(c.contact.email)}`}
                  >
                    <Mail size={16} />
                    Email
                  </a>
                  {c.contact.phone && (
                    <a
                      className="r-button"
                      href={`tel:${c.contact.phone.replace(/[^+\d]/g, "")}`}
                    >
                      <Phone size={16} />
                      Call candidate
                    </a>
                  )}
                </div>
                {c.contact.phone?.startsWith("+") && (
                  <a
                    className="r-link"
                    href={`https://wa.me/${c.contact.phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle size={16} />
                    WhatsApp
                  </a>
                )}
                <p>
                  {c.contact.email}
                  {c.contact.phone ? ` · ${c.contact.phone}` : ""}
                </p>
              </div>
            ) : null}
            <footer className="r-row r-muted">
              <span>{c.viewers} organisation members viewed</span>
              <span>Candidate last active: {date(p?.lastActiveAt)}</span>
            </footer>
          </section>
          <section className="r-card r-profile-body">
            <div className="r-row">
              <h2>Profile details</h2>
              {can("candidates.save") && (
                <button className="r-link" onClick={() => setEditing(true)}>
                  Edit profile
                </button>
              )}
            </div>
            <div>
              <section className="r-profile-section">
                <h2>Profile summary</h2>
                <p className="r-summary r-prewrap">
                  <Highlight text={p?.summary || c.headline} query={query} />
                </p>
              </section>
              <section className="r-profile-section">
                <h2>Key skills</h2>
                <div className="r-skills">
                  {c.skills.length ? (
                    c.skills.map((s) => (
                      <span key={s}>
                        <Highlight text={s} query={query} />
                      </span>
                    ))
                  ) : (
                    <p>No skills added.</p>
                  )}
                </div>
              </section>
              <Timeline title="Employment" rows={p?.employment} />
              <Timeline title="Education" rows={p?.education} />
              <Timeline title="Certifications" rows={p?.certifications} />
              <section className="r-profile-section">
                <h2>IT skills</h2>
                {p?.itSkills.length ? (
                  <div className="r-table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Skill</th>
                          <th>Version</th>
                          <th>Last used</th>
                          <th>Experience</th>
                        </tr>
                      </thead>
                      <tbody>
                        {p.itSkills.map((s, i) => (
                          <tr key={i}>
                            <td>
                              <Highlight text={s.name} query={query} />
                            </td>
                            <td>{s.version || "—"}</td>
                            <td>{s.lastUsed || "—"}</td>
                            <td>
                              {s.months == null
                                ? "—"
                                : `${Math.floor(s.months / 12)}y ${s.months % 12}m`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="r-muted">No IT skill history added.</p>
                )}
              </section>
              <section className="r-profile-section">
                <h2>Desired job</h2>
                <dl className="r-facts">
                  <dt>Employment</dt>
                  <dd>
                    {p?.employmentPreference.replace(/_/g, " ") ||
                      "Not specified"}
                  </dd>
                  <dt>Work mode</dt>
                  <dd>{p?.workPreference || "Not specified"}</dd>
                  <dt>Expected salary</dt>
                  <dd>{salary(p?.expectedSalary)}</dd>
                </dl>
              </section>
              <section className="r-profile-section">
                <h2>Applications</h2>
                {c.applications.length ? (
                  c.applications.map((a) => (
                    <div className="r-list-row" key={a.id}>
                      <Link className="r-link" to={`/org/applications/${a.id}`}>
                        {a.job.title}
                      </Link>
                      <span className="r-tag">{a.stage}</span>
                    </div>
                  ))
                ) : (
                  <p className="r-muted">
                    No applications visible to your account.
                  </p>
                )}
              </section>
              <ResumeSection candidate={c} query={query} />
            </div>
          </section>
        </div>
        <aside className="r-profile-side">
          <section className="r-card">
            <h2>Recruiter notes</h2>
            {can("candidates.notes.write") && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addNote.mutate();
                }}
              >
                <label className="r-field">
                  Add a comment
                  <textarea
                    rows={3}
                    maxLength={2000}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Job-related observations for your team"
                  />
                </label>
                <button
                  className="r-button"
                  disabled={!note.trim() || addNote.isPending}
                >
                  Add comment
                </button>
              </form>
            )}
            {c.notes.length ? (
              c.notes.map((n) => (
                <article className="r-note" key={n.id}>
                  <p className="r-prewrap">{n.body}</p>
                  <small>
                    {n.author} · {date(n.createdAt)}
                  </small>
                </article>
              ))
            ) : (
              <p className="r-muted">No comments yet.</p>
            )}
          </section>
          <section className="r-similar">
            <h2>
              <Sparkles size={20} />
              Similar profiles
            </h2>
            <div className="r-tabs">
              <button
                className={mode === "skills" ? "active" : ""}
                onClick={() => setMode("skills")}
              >
                Skills match
              </button>
              <button
                className={mode === "viewed" ? "active" : ""}
                onClick={() => setMode("viewed")}
              >
                Also viewed
              </button>
            </div>
            {mode === "skills" &&
              can("jobs.read.all", "jobs.read.assigned") && (
                <div className="r-match-job">
                  <label className="r-field">
                    Match against a job
                    <input
                      value={jobSearch}
                      onChange={(e) => setJobSearch(e.target.value)}
                      placeholder="Search your assigned jobs"
                    />
                  </label>
                  <select
                    aria-label="Matching job"
                    value={jobId}
                    onChange={(e) => setJobId(e.target.value)}
                  >
                    <option value="">This candidate’s skills</option>
                    {jobs.data?.data.map((j) => (
                      <option value={j.id} key={j.id}>
                        {j.title}
                      </option>
                    ))}
                  </select>
                  <small>Showing up to 20 jobs; search to find another.</small>
                </div>
              )}
            {mode === "skills" && can("ai.use") && (
              <button
                className="r-button"
                disabled={
                  aiSuggestions.isPending || !similar.data?.candidates.length
                }
                onClick={() => {
                  if (
                    window.confirm(
                      "Run AI-assisted reranking for up to 5 tokens? Only professional skills, headlines and experience are sent to the configured AI provider.",
                    )
                  )
                    aiSuggestions.mutate();
                }}
              >
                <Sparkles size={16} />
                {aiSuggestions.isPending
                  ? "Matching…"
                  : "AI-assisted match · 5 tokens"}
              </button>
            )}
            <p className="r-help">
              {mode === "skills" && aiSuggestions.data
                ? aiSuggestions.data.method
                : similar.data?.method}
              . Suggestions support your review; they do not make hiring
              decisions.
            </p>
            {similar.isError ? (
              <QueryError
                error={similar.error}
                retry={() => void similar.refetch()}
              />
            ) : similar.isPending ? (
              <p role="status">Finding similar profiles…</p>
            ) : similar.data?.candidates.length ? (
              (mode === "skills" && aiSuggestions.data
                ? aiSuggestions.data.candidates
                : similar.data.candidates
              ).map((s) => <ProfileCard key={s.id} candidate={s} compact />)
            ) : (
              <div className="r-card">
                <p>
                  No recommendations yet. Add relevant skills or choose another
                  job.
                </p>
              </div>
            )}
          </section>
        </aside>
      </div>
      {editing && (
        <ProfileEditor candidate={c} close={() => setEditing(false)} />
      )}
      {addJob && (
        <AddToJobSheet
          candidateId={id}
          onClose={() => {
            setAddJob(false);
            refresh();
          }}
        />
      )}
      <Sheet
        open={reminder}
        onClose={() => setReminder(false)}
        title="Set a follow-up reminder"
        footer={
          <button
            type="submit"
            form="candidate-reminder"
            className="r-button r-primary"
            disabled={addReminder.isPending}
          >
            Create task
          </button>
        }
      >
        <form
          id="candidate-reminder"
          onSubmit={(e) => {
            e.preventDefault();
            addReminder.mutate();
          }}
        >
          <label className="r-field">
            Task title
            <input
              required
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="r-field">
            Due date and time (your local time)
            <input
              required
              type="datetime-local"
              value={due}
              onChange={(e) => setDue(e.target.value)}
            />
          </label>
          <p>
            This creates a task in your Tasks page. Timed email or SMS delivery
            is not configured.
          </p>
        </form>
      </Sheet>
    </div>
  );
}