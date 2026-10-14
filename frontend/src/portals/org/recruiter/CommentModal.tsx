import React, { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X, MessageSquare, Clock, User, Send } from "lucide-react";
import { api, errorMessage } from "../lib/api";
import { usePermissions } from "../lib/session";
import { toast } from "../ui/toast";
import { TalentCard, talentKeys } from "./types";
import { date } from "./display";

export interface CandidateComment {
  id: string;
  body: string;
  author: string;
  createdAt: string;
}

const SUGGESTED_CHIPS = [
  { label: "Expected salary", text: "Expected salary: " },
  { label: "Current salary", text: "Current salary: " },
  { label: "Relevant experience", text: "Relevant experience: " },
  { label: "Willing to relocate", text: "Willing to relocate: " },
];

export function CommentModal({
  candidate,
  onClose,
}: {
  candidate: TalentCard;
  onClose: () => void;
}) {
  const { can } = usePermissions();
  const qc = useQueryClient();
  const [commentText, setCommentText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Fetch comments for this candidate
  const notesQuery = useQuery({
    queryKey: ["candidate-notes", candidate.id],
    queryFn: () =>
      api.get<CandidateComment[]>(`/org/candidates/${candidate.id}/notes`),
  });

  // Add comment mutation
  const addMutation = useMutation({
    mutationFn: (body: string) =>
      api.post<CandidateComment>(`/org/candidates/${candidate.id}/notes`, {
        body,
      }),
    onSuccess: () => {
      toast.success("Comment added successfully");
      setCommentText("");
      void qc.invalidateQueries({
        queryKey: ["candidate-notes", candidate.id],
      });
      void qc.invalidateQueries({ queryKey: talentKeys });
      void qc.invalidateQueries({ queryKey: ["org", "candidates"] });
    },
    onError: (e) => {
      toast.error(errorMessage(e, "Could not add comment"));
    },
  });

  const handleChipClick = (chipText: string) => {
    setCommentText((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return chipText;
      return `${trimmed}\n${chipText}`;
    });
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = commentText.trim();
    if (!trimmed) return;
    addMutation.mutate(trimmed);
  };

  return (
    <div
      className="r-modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.55)",
        backdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1050,
        padding: "16px",
      }}
    >
      <div
        className="r-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="comment-modal-title"
        style={{
          background: "#ffffff",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "600px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow:
            "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid var(--r-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              className="r-avatar"
              style={{
                width: "40px",
                height: "40px",
                fontSize: "14px",
                fontWeight: 600,
              }}
              aria-hidden="true"
            >
              {candidate.firstName?.[0]}
              {candidate.lastName?.[0]}
            </div>
            <div>
              <h2
                id="comment-modal-title"
                style={{
                  margin: 0,
                  fontSize: "1.1rem",
                  fontWeight: 600,
                  color: "var(--r-text)",
                }}
              >
                Comments: {candidate.name}
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.85rem",
                  color: "var(--r-muted)",
                }}
              >
                {candidate.professional?.designation ||
                  candidate.headline ||
                  candidate.currentCompany ||
                  "Candidate in talent pool"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="r-link"
            style={{
              padding: "6px",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--r-muted)",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body content with scroll */}
        <div
          style={{
            padding: "20px 24px",
            overflowY: "auto",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {/* Comments list */}
          <div>
            <h3
              style={{
                margin: "0 0 12px",
                fontSize: "0.9rem",
                fontWeight: 600,
                color: "var(--r-text)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <MessageSquare size={15} />
              Team comments (visible within organisation)
            </h3>

            {notesQuery.isLoading ? (
              <p
                style={{
                  color: "var(--r-muted)",
                  fontSize: "0.875rem",
                  margin: 0,
                }}
              >
                Loading comments…
              </p>
            ) : notesQuery.data && notesQuery.data.length > 0 ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  maxHeight: "220px",
                  overflowY: "auto",
                }}
              >
                {notesQuery.data.map((note) => (
                  <div
                    key={note.id}
                    style={{
                      background: "var(--r-surface)",
                      border: "1px solid var(--r-border)",
                      borderRadius: "8px",
                      padding: "12px 14px",
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        whiteSpace: "pre-wrap",
                        fontSize: "0.9rem",
                        color: "var(--r-text)",
                        lineHeight: 1.5,
                      }}
                    >
                      {note.body}
                    </p>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        marginTop: "8px",
                        fontSize: "0.78rem",
                        color: "var(--r-muted)",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <User size={12} />
                        {note.author}
                      </span>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <Clock size={12} />
                        {date(note.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p
                style={{
                  color: "var(--r-muted)",
                  fontSize: "0.875rem",
                  margin: 0,
                  fontStyle: "italic",
                }}
              >
                No comments recorded yet. Add internal feedback or observations
                below.
              </p>
            )}
          </div>

          {/* Form to add comment */}
          {can("candidates.notes.write") ? (
            <form
              onSubmit={handleSubmit}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                borderTop: "1px solid var(--r-border)",
                paddingTop: "18px",
              }}
            >
              <div>
                <label
                  htmlFor="candidate-comment-textarea"
                  style={{
                    display: "block",
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    marginBottom: "8px",
                    color: "var(--r-text)",
                  }}
                >
                  Write your comment
                </label>

                {/* Suggested chips */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "6px",
                    marginBottom: "10px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--r-muted)",
                      alignSelf: "center",
                      marginRight: "4px",
                    }}
                  >
                    Insert template:
                  </span>
                  {SUGGESTED_CHIPS.map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => handleChipClick(chip.text)}
                      style={{
                        background: "var(--r-surface)",
                        border: "1px solid var(--r-border)",
                        borderRadius: "16px",
                        padding: "3px 10px",
                        fontSize: "0.8rem",
                        color: "var(--r-text)",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "var(--r-primary)";
                        e.currentTarget.style.color = "var(--r-primary)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "var(--r-border)";
                        e.currentTarget.style.color = "var(--r-text)";
                      }}
                    >
                      + {chip.label}
                    </button>
                  ))}
                </div>

                <textarea
                  id="candidate-comment-textarea"
                  ref={textareaRef}
                  rows={4}
                  maxLength={2000}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write internal observations, evaluation notes, or salary details for your team..."
                  style={{
                    width: "100%",
                    borderRadius: "8px",
                    border: "1px solid var(--r-border)",
                    padding: "10px 12px",
                    fontSize: "0.9rem",
                    fontFamily: "inherit",
                    lineHeight: 1.5,
                    resize: "vertical",
                    outline: "none",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    fontSize: "0.75rem",
                    color: "var(--r-muted)",
                    marginTop: "4px",
                  }}
                >
                  {commentText.length}/2000 characters
                </div>
              </div>

              {/* Actions */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                }}
              >
                <button
                  type="button"
                  onClick={onClose}
                  className="r-button"
                  style={{ padding: "8px 16px" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!commentText.trim() || addMutation.isPending}
                  className="r-button r-primary"
                  style={{
                    padding: "8px 18px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Send size={15} />
                  {addMutation.isPending ? "Adding comment…" : "Add comment"}
                </button>
              </div>
            </form>
          ) : (
            <p
              style={{
                fontSize: "0.85rem",
                color: "var(--r-muted)",
                margin: 0,
              }}
            >
              You do not have permission to write candidate notes.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
