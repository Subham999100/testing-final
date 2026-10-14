import React, { useState, useRef, useEffect } from "react";
import { POPULAR_LANGUAGES } from "./search-tools";
import { ChevronDown, X, Search } from "lucide-react";

interface LanguageSelectorProps {
  value?: string;
  onChange: (value: string) => void;
}

export function LanguageSelector({ value = "", onChange }: LanguageSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = value
    ? value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleLanguage = (lang: string) => {
    let next: string[];
    if (selected.includes(lang)) {
      next = selected.filter((l) => l !== lang);
    } else {
      next = [...selected, lang];
    }
    onChange(next.join(","));
  };

  const removeLanguage = (lang: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = selected.filter((l) => l !== lang);
    onChange(next.join(","));
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setSearch("");
  };

  const filtered = POPULAR_LANGUAGES.filter((lang) =>
    lang.toLowerCase().includes(search.toLowerCase().trim()),
  );

  return (
    <div
      ref={containerRef}
      className="r-language-selector"
      style={{ position: "relative", width: "100%" }}
    >
      <div
        className="r-language-input-box"
        onClick={() => {
          setOpen(true);
          inputRef.current?.focus();
        }}
        style={{
          border: "1px solid var(--r-border)",
          borderRadius: "6px",
          background: "white",
          padding: "6px 12px",
          cursor: "text",
          minHeight: "42px",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
        }}
      >
        {selected.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "6px",
              paddingBottom: "4px",
            }}
          >
            {selected.map((lang) => (
              <span
                key={lang}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  background: "#f3f4f6",
                  color: "#1f2937",
                  fontSize: "12px",
                  fontWeight: 500,
                  padding: "2px 8px",
                  borderRadius: "12px",
                }}
              >
                {lang}
                <button
                  type="button"
                  onClick={(e) => removeLanguage(lang, e)}
                  aria-label={`Remove ${lang}`}
                  style={{
                    border: "none",
                    background: "none",
                    padding: 0,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    color: "#6b7280",
                  }}
                >
                  <X size={13} />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={clearAll}
              style={{
                border: "none",
                background: "none",
                color: "#e8630a",
                fontSize: "12px",
                cursor: "pointer",
                padding: "2px 4px",
              }}
            >
              Clear all
            </button>
          </div>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={search}
            placeholder={
              selected.length === 0
                ? "Enter language"
                : "Type to search more languages..."
            }
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setSearch(e.target.value);
              setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
            }}
            style={{
              border: "none",
              outline: "none",
              fontSize: "14px",
              width: "100%",
              background: "transparent",
            }}
          />
          <ChevronDown
            size={16}
            style={{
              color: "var(--r-muted)",
              transform: open ? "rotate(180deg)" : "none",
              transition: "transform 0.2s",
              cursor: "pointer",
            }}
            onClick={(e) => {
              e.stopPropagation();
              setOpen((o) => !o);
            }}
          />
        </div>
      </div>

      {open && (
        <div
          className="r-language-dropdown"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "white",
            border: "1px solid var(--r-border)",
            borderRadius: "6px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            maxHeight: "240px",
            overflowY: "auto",
            zIndex: 100,
            padding: "4px 0",
          }}
        >
          {filtered.length === 0 ? (
            <div
              style={{
                padding: "12px 16px",
                fontSize: "13px",
                color: "var(--r-muted)",
              }}
            >
              No languages found matching "{search}"
            </div>
          ) : (
            filtered.map((lang) => {
              const isChecked = selected.includes(lang);
              return (
                <label
                  key={lang}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "8px 16px",
                    fontSize: "14px",
                    cursor: "pointer",
                    background: isChecked ? "#fff7ed" : "transparent",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (!isChecked)
                      (e.currentTarget as HTMLElement).style.background =
                        "#f9fafb";
                  }}
                  onMouseLeave={(e) => {
                    if (!isChecked)
                      (e.currentTarget as HTMLElement).style.background =
                        "transparent";
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleLanguage(lang)}
                    style={{ cursor: "pointer" }}
                  />
                  <span>{lang}</span>
                </label>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
