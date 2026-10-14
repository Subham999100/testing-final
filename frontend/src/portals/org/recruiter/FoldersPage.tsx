import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Folder as FolderIcon, Plus, Trash2 } from "lucide-react";
import { api, errorMessage } from "../lib/api";
import { toast } from "../ui/toast";
import { ConfirmDialog } from "../ui/ui";
import { Folder, root, talentKeys } from "./types";
import { QueryError } from "./display";
import { searchUrl } from "./search-tools";
import "./recruiter.css";
export function FoldersPage() {
  const qc = useQueryClient();
  const [name, setName] = useState(""),
    [filter, setFilter] = useState(""),
    [removing, setRemoving] = useState<Folder | null>(null);
  const query = useQuery({
    queryKey: [...talentKeys, "folders"],
    queryFn: () => api.get<Folder[]>(`${root}/folders`),
  });
  const refresh = () => void qc.invalidateQueries({ queryKey: talentKeys });
  const create = useMutation({
    mutationFn: () => api.post(`${root}/folders`, { name: name.trim() }),
    onSuccess: () => {
      setName("");
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: () => api.del(`${root}/folders/${removing!.id}`),
    onSuccess: () => {
      setRemoving(null);
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const rows = query.data?.filter((f) =>
    f.name.toLowerCase().includes(filter.toLowerCase()),
  );
  return (
    <div className="recruiter-workspace">
      <header className="r-heading">
        <div>
          <span className="eyebrow">YOUR SHORTLISTS</span>
          <h1>Folders</h1>
          <p>Organise candidate profiles into private folders.</p>
        </div>
      </header>
      <div className="r-card">
        <form
          className="r-folder-create"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) create.mutate();
          }}
        >
          <label className="r-field r-grow">
            New folder name
            <input
              required
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Frontend developers — Hyderabad"
            />
          </label>
          <button
            className="r-button r-primary"
            disabled={create.isPending || !name.trim()}
          >
            <Plus size={16} />
            Create folder
          </button>
        </form>
        <label className="r-field">
          Find a folder
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search folder names"
          />
        </label>
      </div>
      {query.isError ? (
        <QueryError error={query.error} retry={() => void query.refetch()} />
      ) : query.isPending ? (
        <p role="status">Loading folders…</p>
      ) : (
        <div className="r-folder-grid">
          {rows?.length ? (
            rows.map((f) => (
              <article className="r-card" key={f.id}>
                <FolderIcon size={28} />
                <h2>
                  <Link to={searchUrl({ folderId: f.id })}>{f.name}</Link>
                </h2>
                <p>{f._count.candidates} candidates</p>
                <div className="r-row">
                  <Link className="r-link" to={searchUrl({ folderId: f.id })}>
                    Open folder
                  </Link>
                  <button
                    className="r-link"
                    aria-label={`Delete ${f.name}`}
                    onClick={() => setRemoving(f)}
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </article>
            ))
          ) : (
            <p>
              No folders found. Create a folder, then select profiles in
              candidate search and use Add to folder.
            </p>
          )}
        </div>
      )}
      <ConfirmDialog
        open={!!removing}
        title={`Delete ${removing?.name}?`}
        message="This removes the folder only. Candidate profiles remain available."
        tone="danger"
        confirmLabel="Delete folder"
        loading={remove.isPending}
        onConfirm={() => {
          if (!remove.isPending) remove.mutate();
        }}
        onClose={() => {
          if (!remove.isPending) setRemoving(null);
        }}
      />
    </div>
  );
}