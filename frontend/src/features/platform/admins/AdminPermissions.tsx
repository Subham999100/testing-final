import React, { useState, useMemo } from "react";
import {
  Shield,
  Key,
  Edit3,
  CheckCircle2,
  X,
  Search,
  Check,
  ShieldCheck,
  Building2,
  Users,
  Coins,
  Briefcase,
  AlertTriangle,
  LifeBuoy,
  Bell,
  FileText,
  BarChart3,
  History,
  Lock,
} from "lucide-react";
import { PlatformAdminUser } from "../../../types/platform.types";
import { PermissionMatrix } from "./PermissionMatrix";
import { PlatformService } from "../../../services/platform.service";
import { ErrorBox } from "../../../components/platform/OperationsUI";
import {
  permissionGroups,
  permissionLabel,
  AVAILABLE_PERMISSIONS,
} from "./permission-labels";

interface AdminPermissionsProps {
  admin: PlatformAdminUser;
  onSaved: () => void;
}

// Domain icon helper for view mode
const domainIcons: Record<string, React.ReactNode> = {
  organisations: <Building2 className="w-4 h-4 text-sky-600" />,
  users: <Users className="w-4 h-4 text-indigo-600" />,
  tokens: <Coins className="w-4 h-4 text-amber-600" />,
  jobs: <Briefcase className="w-4 h-4 text-emerald-600" />,
  moderation: <AlertTriangle className="w-4 h-4 text-rose-600" />,
  support: <LifeBuoy className="w-4 h-4 text-blue-600" />,
  notifications: <Bell className="w-4 h-4 text-purple-600" />,
  reports: <FileText className="w-4 h-4 text-teal-600" />,
  analytics: <BarChart3 className="w-4 h-4 text-violet-600" />,
  audit: <History className="w-4 h-4 text-slate-600" />,
  security: <Lock className="w-4 h-4 text-red-600" />,
};

export function AdminPermissions({ admin, onSaved }: AdminPermissionsProps) {
  const isSuper = admin.role === "PLATFORM_SUPER_ADMIN";
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPermissions, setCurrentPermissions] = useState<string[]>(
    admin.platformAdminProfile?.permissions || []
  );
  const [selected, setSelected] = useState<string[]>(
    admin.platformAdminProfile?.permissions || []
  );
  const [search, setSearch] = useState("");
  const [error, setError] = useState<any>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleOpen = () => {
    const perms = admin.platformAdminProfile?.permissions || [];
    setCurrentPermissions(perms);
    setSelected(perms);
    setIsEditing(false);
    setError(null);
    setSuccessMessage(null);
    setSearch("");
    setOpen(true);
  };

  const handleClose = () => {
    if (busy) return;
    setOpen(false);
    setIsEditing(false);
    setError(null);
    setSuccessMessage(null);
  };

  const handleStartEdit = () => {
    setSelected([...currentPermissions]);
    setError(null);
    setSuccessMessage(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setSelected([...currentPermissions]);
    setError(null);
    setIsEditing(false);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await PlatformService.write(
        `admins/${admin.id}`,
        { permissions: selected },
        "patch"
      );
      setCurrentPermissions(selected);
      setSuccessMessage("Permissions updated successfully!");
      setIsEditing(false);
      onSaved();
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3500);
    } catch (err: any) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  // Group assigned permissions by domain category
  const groupedAssigned = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = currentPermissions.filter((key) => {
      if (!term) return true;
      const domainKey = key.split(".")[1] || "";
      const groupName = (permissionGroups[domainKey] || "").toLowerCase();
      const label = permissionLabel(key).toLowerCase();
      return (
        label.includes(term) ||
        key.toLowerCase().includes(term) ||
        groupName.includes(term)
      );
    });

    const groups: { domainKey: string; title: string; perms: string[] }[] = [];
    Object.keys(permissionGroups).forEach((domainKey) => {
      const permsInDomain = filtered.filter((p) => p.split(".")[1] === domainKey);
      if (permsInDomain.length > 0) {
        groups.push({
          domainKey,
          title: permissionGroups[domainKey],
          perms: permsInDomain,
        });
      }
    });
    return groups;
  }, [currentPermissions, search]);

  const activeDomainsCount = useMemo(() => {
    const domainSet = new Set(currentPermissions.map((p) => p.split(".")[1]));
    return domainSet.size;
  }, [currentPermissions]);

  return (
    <>
      {/* Table Cell Trigger Button */}
      {isSuper ? (
        <button
          type="button"
          onClick={handleOpen}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors shadow-2xs"
          title="View Super Admin privileges"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
          <span>Super Admin Access</span>
          <span className="text-[10px] px-1 py-0.2 rounded bg-purple-200/60 font-mono">All *</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleOpen}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border border-line-strong bg-surface hover:bg-soft hover:border-orange-400 text-ink shadow-2xs transition-all group"
          title="View and manage permissions for this administrator"
        >
          <Key className="w-3.5 h-3.5 text-orange-600 group-hover:rotate-12 transition-transform" />
          <span>View & Manage Permissions</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-orange-100 text-orange-800 border border-orange-200">
            {currentPermissions.length}
          </span>
        </button>
      )}

      {/* Permissions Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Permissions for ${admin.firstName} ${admin.lastName}`}
            className="w-full max-w-4xl bg-surface border border-line rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Modal Header */}
            <div className="p-6 pb-4 border-b border-line bg-surface flex flex-col gap-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
                      isSuper
                        ? "bg-danger-soft text-danger border border-danger"
                        : "bg-brand-soft text-action border border-brand"
                    }`}
                  >
                    {admin.firstName[0]}
                    {admin.lastName[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold tracking-tight text-ink">
                        {admin.firstName} {admin.lastName}
                      </h2>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          isSuper
                            ? "bg-danger-soft text-danger border border-danger"
                            : "bg-brand-soft text-action border border-brand"
                        }`}
                      >
                        <Shield className="w-3 h-3" />
                        {admin.role}
                      </span>
                    </div>
                    <p className="text-xs text-muted font-mono mt-0.5">
                      {admin.email} • {admin.platformAdminProfile?.department || "Operations"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleClose}
                  disabled={busy}
                  className="p-1.5 text-muted hover:text-ink hover:bg-soft rounded-lg transition-colors"
                  aria-label="Close dialog"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Subheader & Mode Switcher */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-line">
                <div className="flex items-center gap-2">
                  {isSuper ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                      <ShieldCheck className="w-3.5 h-3.5" /> Root Administrator (Unrestricted Access)
                    </span>
                  ) : (
                    <>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200 font-mono">
                        {currentPermissions.length} of {AVAILABLE_PERMISSIONS.length} Permissions
                      </span>
                      <span className="text-xs text-muted">
                        • {activeDomainsCount} modules enabled
                      </span>
                    </>
                  )}
                </div>

                {!isSuper && (
                  <div className="flex items-center gap-2">
                    {!isEditing ? (
                      <button
                        type="button"
                        onClick={handleStartEdit}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold transition-all shadow-xs"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit Permissions
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          disabled={busy}
                          className="px-3 py-1.5 text-xs font-semibold text-muted hover:text-ink border border-line rounded-lg hover:bg-soft transition-colors"
                        >
                          Cancel Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSave()}
                          disabled={busy}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold transition-all shadow-xs disabled:opacity-50"
                        >
                          {busy ? "Saving…" : "Save Changes"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {/* Success Notification */}
              {successMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold">{successMessage}</span>
                </div>
              )}

              {/* Error Box */}
              {error && <ErrorBox error={error} />}

              {/* Case 1: Super Admin Special View */}
              {isSuper ? (
                <div className="py-6 space-y-6">
                  <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 text-purple-900 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <ShieldCheck className="w-5 h-5 text-purple-600" />
                      Root Platform Super Administrator
                    </div>
                    <p className="text-xs leading-relaxed text-purple-800">
                      This user holds full, unrestricted root-level access (<code>*</code>) across all platform modules,
                      including organization administration, security event resolution, financial token adjustments,
                      audit logs, and user controls. Super Admin privileges cannot be restricted.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">
                      Accessible Platform Domains
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.entries(permissionGroups).map(([domainKey, title]) => (
                        <div
                          key={domainKey}
                          className="p-3 rounded-lg border border-line bg-soft/50 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            {domainIcons[domainKey]}
                            <span className="text-xs font-semibold text-ink">{title}</span>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                            Full Access
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : isEditing ? (
                /* Case 2: Edit Permissions Mode */
                <form onSubmit={handleSave} className="space-y-4">
                  <div className="p-3 rounded-xl bg-orange-50/70 border border-orange-200 flex items-center justify-between text-xs text-orange-900">
                    <span className="font-medium">
                      Select or deselect specific permissions in the matrix below to grant or revoke access.
                    </span>
                    <span className="font-mono font-bold text-orange-800">
                      {selected.length} Selected
                    </span>
                  </div>

                  <PermissionMatrix
                    selected={selected}
                    onChange={setSelected}
                    disabled={busy}
                  />

                  <div className="flex items-center justify-between pt-4 border-t border-line">
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      disabled={busy}
                      className="px-4 py-2 text-xs font-semibold text-muted hover:text-ink transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={busy}
                      className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold transition-all disabled:opacity-50 shadow-xs flex items-center gap-1.5"
                    >
                      {busy ? "Saving Changes…" : "Save Changes"}
                    </button>
                  </div>
                </form>
              ) : (
                /* Case 3: View Assigned Permissions Mode */
                <div className="space-y-5">
                  {/* Search and Filter */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                      <input
                        type="text"
                        placeholder="Search assigned permissions…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 bg-surface border border-line-strong rounded-lg text-xs text-ink placeholder-muted focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                      />
                    </div>
                    {search && (
                      <button
                        type="button"
                        onClick={() => setSearch("")}
                        className="text-xs text-muted hover:text-ink font-semibold"
                      >
                        Clear Search
                      </button>
                    )}
                  </div>

                  {/* Empty state: No permissions assigned */}
                  {currentPermissions.length === 0 ? (
                    <div className="py-12 text-center rounded-xl border border-dashed border-line bg-soft/30 space-y-3">
                      <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mx-auto">
                        <Key className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-ink">No Permissions Assigned</h3>
                        <p className="text-xs text-muted max-w-sm mx-auto mt-1">
                          This administrator has not been granted any platform permissions yet. They cannot access restricted administrative modules.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleStartEdit}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold transition-all shadow-xs"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Assign Permissions
                      </button>
                    </div>
                  ) : groupedAssigned.length === 0 && search.trim() ? (
                    /* Search with no matches */
                    <div className="py-8 text-center text-xs text-muted">
                      No assigned permissions match &quot;{search.trim()}&quot;.
                    </div>
                  ) : (
                    /* Categorized Assigned Permissions */
                    <div className="space-y-4">
                      {groupedAssigned.map(({ domainKey, title, perms }) => (
                        <div
                          key={domainKey}
                          className="rounded-xl border border-line bg-surface overflow-hidden shadow-2xs"
                        >
                          <div className="px-4 py-2.5 bg-soft/70 border-b border-line flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {domainIcons[domainKey]}
                              <span className="text-xs font-bold text-ink tracking-tight">
                                {title}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-surface border border-line text-ink">
                              {perms.length} {perms.length === 1 ? "permission" : "permissions"}
                            </span>
                          </div>

                          <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {perms.map((permKey) => (
                              <div
                                key={permKey}
                                className="p-2.5 rounded-lg border border-line-strong/60 bg-surface hover:bg-soft/40 transition-colors flex items-start gap-2.5"
                              >
                                <div className="mt-0.5 text-emerald-600 shrink-0">
                                  <CheckCircle2 className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-semibold text-ink leading-snug">
                                    {permissionLabel(permKey)}
                                  </div>
                                  <div className="text-[10px] font-mono text-muted truncate mt-0.5">
                                    {permKey}
                                  </div>
                                </div>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                                  Granted
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 px-6 border-t border-line bg-soft/40 flex items-center justify-between">
              <span className="text-[11px] text-muted flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                {!isSuper
                  ? "Permissions are strictly enforced on backend API endpoints and web socket streams."
                  : "Platform Super Admin privileges are root-level."}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={busy}
                  className="px-4 py-2 text-xs font-semibold text-muted hover:text-ink hover:bg-soft rounded-lg transition-colors border border-transparent"
                >
                  Close
                </button>
                {!isSuper && !isEditing && (
                  <button
                    type="button"
                    onClick={handleStartEdit}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold transition-all shadow-xs"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit Permissions
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
