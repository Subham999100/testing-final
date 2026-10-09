import React, { useState } from "react";
import { Search, ShieldCheck } from "lucide-react";
import { AVAILABLE_PERMISSIONS, permissionGroups } from "./permission-labels";

export function PermissionMatrix({
  selected,
  onChange,
  disabled = false,
}: {
  selected: string[];
  onChange: (permissions: string[]) => void;
  disabled?: boolean;
}) {
  const [search, setSearch] = useState("");

  const enabledCount = AVAILABLE_PERMISSIONS.filter((p) =>
    selected.includes(p.key)
  ).length;

  const normalizedSearch = search.trim().toLowerCase();

  const filteredPermissions = AVAILABLE_PERMISSIONS.filter((p) => {
    if (!normalizedSearch) return true;
    const domainKey = p.key.split(".")[1] || "";
    const groupName = (permissionGroups[domainKey] || "").toLowerCase();
    const label = p.label.toLowerCase();
    const key = p.key.toLowerCase();

    return (
      label.includes(normalizedSearch) ||
      key.includes(normalizedSearch) ||
      groupName.includes(normalizedSearch)
    );
  });

  const domainKeys = Object.keys(permissionGroups);

  // Column short headers
  const domainShortCode: Record<string, string> = {
    organisations: "ORG",
    users: "USERS",
    tokens: "TOKENS",
    jobs: "JOBS",
    moderation: "MODERATION",
    support: "SUPPORT",
    notifications: "NOTIF.",
    reports: "REPORTS",
    analytics: "ANALYTICS",
    audit: "AUDIT",
    security: "SECURITY",
  };

  // Helper to toggle an entire domain column
  const handleToggleDomainColumn = (domainKey: string) => {
    if (disabled) return;
    const domainPermKeys: string[] = AVAILABLE_PERMISSIONS.filter(
      (p) => p.key.split(".")[1] === domainKey
    ).map((p) => p.key);

    const allSelected = domainPermKeys.every((key) => selected.includes(key));

    if (allSelected) {
      onChange(selected.filter((key) => !domainPermKeys.includes(key)));
    } else {
      onChange([...new Set([...selected, ...domainPermKeys])]);
    }
  };

  return (
    <section className="space-y-3 pt-4 border-t border-line" aria-label="Admin access permissions matrix">
      {/* Header & Enabled Counter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink font-sans">
              Admin Permissions Matrix
            </h4>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-50 text-orange-700 border border-orange-200 font-mono">
              {enabledCount} enabled
            </span>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Choose the actions this Admin can perform across platform domain modules.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="text"
          placeholder="Search permissions…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          disabled={disabled}
          className="w-full pl-9 pr-3 py-1.5 bg-surface border border-line-strong rounded-lg text-xs text-ink placeholder-muted focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
        />
      </div>

      {/* Horizontal Access-Control RBAC Matrix */}
      <div className="border border-line rounded-xl overflow-hidden bg-surface shadow-2xs">
        <div className="overflow-x-auto max-h-[380px]">
          <table className="w-full text-xs text-left min-w-[950px] border-collapse">
            <thead className="sticky top-0 bg-soft border-b border-line text-[10px] font-bold text-muted uppercase tracking-wider z-20">
              <tr>
                <th
                  scope="col"
                  className="py-2.5 px-4 sticky left-0 bg-soft border-r border-line z-30 min-w-[240px] shadow-xs font-bold text-ink"
                >
                  PERMISSION
                </th>
                {domainKeys.map((domainKey) => {
                  const domainPermKeys = AVAILABLE_PERMISSIONS.filter(
                    (p) => p.key.split(".")[1] === domainKey
                  ).map((p) => p.key);
                  const isColumnAllChecked =
                    domainPermKeys.length > 0 &&
                    domainPermKeys.every((key) => selected.includes(key));

                  return (
                    <th
                      key={domainKey}
                      scope="col"
                      className="py-2.5 px-2 text-center border-r border-line/60 min-w-[75px] group hover:bg-slate-200/50 cursor-pointer transition-colors"
                      title={`Toggle all ${permissionGroups[domainKey]} permissions`}
                      onClick={() => handleToggleDomainColumn(domainKey)}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span>{domainShortCode[domainKey] || domainKey.toUpperCase()}</span>
                        <input
                          type="checkbox"
                          readOnly
                          checked={isColumnAllChecked}
                          disabled={disabled}
                          className="w-3 h-3 text-orange-600 rounded border-line-strong cursor-pointer accent-orange-600"
                        />
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredPermissions.map((p) => {
                const isChecked = selected.includes(p.key);
                const targetDomain = p.key.split(".")[1];

                return (
                  <tr key={p.key} className="hover:bg-soft/40 transition-colors">
                    {/* Sticky Left Permission Label */}
                    <td className="py-2 px-4 font-medium text-ink sticky left-0 bg-surface border-r border-line z-10 shadow-xs">
                      <label htmlFor={`permission-${p.key}`} className="cursor-pointer select-none block text-xs">
                        {p.label}
                      </label>
                    </td>

                    {/* Domain Matrix Columns */}
                    {domainKeys.map((domainKey) => {
                      const isMatch = targetDomain === domainKey;

                      return (
                        <td
                          key={domainKey}
                          className={`py-2 px-2 text-center border-r border-line/40 ${
                            isMatch ? "bg-orange-50/20" : ""
                          }`}
                        >
                          {isMatch ? (
                            <input
                              id={`permission-${p.key}`}
                              type="checkbox"
                              disabled={disabled}
                              checked={isChecked}
                              onChange={(e) =>
                                onChange(
                                  e.target.checked
                                    ? [...new Set([...selected, p.key])]
                                    : selected.filter((key) => key !== p.key)
                                )
                              }
                              className="w-4 h-4 text-orange-600 rounded border-line-strong focus:ring-orange-500 accent-orange-600 cursor-pointer mx-auto"
                              aria-label={p.label}
                            />
                          ) : (
                            <span className="text-slate-300 select-none text-[10px]">•</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              {filteredPermissions.length === 0 && (
                <tr>
                  <td colSpan={domainKeys.length + 1} className="py-8 text-center text-muted text-xs">
                    No matching permissions found for "{search.trim()}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[11px] text-muted flex items-center gap-1.5 pt-1">
        <ShieldCheck className="w-3.5 h-3.5 text-orange-600 shrink-0" />
        Managing Platform Admin accounts and critical platform settings remains exclusive to Super Admin.
      </p>
    </section>
  );
}
