import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Clock, Bookmark, Search } from "lucide-react";
import { api } from "../lib/api";
import { root, talentKeys, SavedSearch } from "./types";
import { searchLabel, searchUrl } from "./search-tools";
import { QueryError } from "./display";
export function SearchHistory() {
  const [tab, setTab] = useState("recent");
  const recent = useQuery({
    queryKey: [...talentKeys, "recent-searches"],
    queryFn: () =>
      api.get<
        { id: string; filters: Record<string, unknown>; createdAt: string }[]
      >(`${root}/recent-searches`),
  });
  const saved = useQuery({
    queryKey: [...talentKeys, "searches"],
    queryFn: () => api.get<SavedSearch[]>(`${root}/searches`),
  });
  const result = tab === "recent" ? recent : saved;
  const rows = tab === "recent" ? recent.data : saved.data;
  return (
    <section className="r-card r-search-history">
      <h2>Your searches</h2>
      <div className="r-tabs" role="tablist" aria-label="Your searches">
        <button
          role="tab"
          aria-selected={tab === "recent"}
          className={tab === "recent" ? "active" : ""}
          onClick={() => setTab("recent")}
        >
          <Clock size={16} /> Recent searches
        </button>
        <button
          role="tab"
          aria-selected={tab === "saved"}
          className={tab === "saved" ? "active" : ""}
          onClick={() => setTab("saved")}
        >
          <Bookmark size={16} /> Saved searches
        </button>
      </div>
      {result.isError ? (
        <QueryError error={result.error} retry={() => void result.refetch()} />
      ) : result.isPending ? (
        <p role="status">Loading searches…</p>
      ) : rows?.length ? (
        <ul className="r-history-list">
          {rows.map((row) => (
            <li key={row.id}>
              <Search size={17} />
              <Link to={searchUrl(row.filters)}>
                <strong>
                  {"name" in row ? String(row.name) : searchLabel(row.filters)}
                </strong>
                {"name" in row && <small>{searchLabel(row.filters)}</small>}
                {"createdAt" in row && (
                  <small>
                    {new Date(String(row.createdAt)).toLocaleString()}
                  </small>
                )}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="r-muted">
          {tab === "recent"
            ? "Your searches will appear here after you search."
            : "Save a search from the results page to find it here."}
        </p>
      )}
    </section>
  );
}