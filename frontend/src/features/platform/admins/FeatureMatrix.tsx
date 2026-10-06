// ============================================================
// Clyptus Job Portal - Platform Super Admin
// Component: Feature Matrix (Permissions RBAC Table)
// Displays administrators in columns with feature accesses in rows.
// Super Admin can toggle permissions per administrator by name.
// ============================================================

import React, { useState, useMemo, useEffect } from 'react';
import {
  Table as TableIcon,
  Save,
  RotateCcw,
  Search,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Shield,
  ShieldCheck,
  Check,
  X,
  Filter,
} from 'lucide-react';
import { PlatformAdminUser } from '../../../types/platform.types';
import { AVAILABLE_PERMISSIONS, permissionGroups, permissionLabel } from './permission-labels';
import { PlatformService } from '../../../services/platform.service';

interface FeatureMatrixProps {
  admins: PlatformAdminUser[];
  onSaved?: () => void;
  highlightAdminId?: string | null;
}

export const FeatureMatrix: React.FC<FeatureMatrixProps> = ({ admins, onSaved, highlightAdminId }) => {
  // Only Platform Admins can have their permissions edited (Super Admin always has root *)
  const platformAdmins = useMemo(() => {
    return admins.filter((a) => a.role === 'PLATFORM_ADMIN');
  }, [admins]);

  const superAdmins = useMemo(() => {
    return admins.filter((a) => a.role === 'PLATFORM_SUPER_ADMIN');
  }, [admins]);

  // Map of adminId -> Set of assigned permission keys
  const [adminPermissions, setAdminPermissions] = useState<Record<string, string[]>>({});
  const [initialPermissions, setInitialPermissions] = useState<Record<string, string[]>>({});

  // Sync state whenever admins prop updates
  useEffect(() => {
    const permMap: Record<string, string[]> = {};
    platformAdmins.forEach((admin) => {
      permMap[admin.id] = admin.platformAdminProfile?.permissions || [];
    });
    setAdminPermissions(permMap);
    setInitialPermissions(permMap);
  }, [platformAdmins]);

  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showSuperAdminCol, setShowSuperAdminCol] = useState(true);

  // Auto-scroll to highlighted admin column if passed
  useEffect(() => {
    if (highlightAdminId) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`matrix-admin-col-${highlightAdminId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [highlightAdminId]);

  // Detect which admins have unsaved changes
  const modifiedAdminIds = useMemo(() => {
    const modified: string[] = [];
    platformAdmins.forEach((admin) => {
      const current = (adminPermissions[admin.id] || []).slice().sort().join(',');
      const original = (initialPermissions[admin.id] || []).slice().sort().join(',');
      if (current !== original) {
        modified.push(admin.id);
      }
    });
    return modified;
  }, [adminPermissions, initialPermissions, platformAdmins]);

  const hasUnsavedChanges = modifiedAdminIds.length > 0;

  // Toggle single permission for a specific admin
  const handleToggle = (adminId: string, permKey: string) => {
    setAdminPermissions((prev) => {
      const currentList = prev[adminId] || [];
      const hasPerm = currentList.includes(permKey);
      const updated = hasPerm
        ? currentList.filter((k) => k !== permKey)
        : [...currentList, permKey];
      return { ...prev, [adminId]: updated };
    });
    setSaveSuccess(null);
    setSaveError(null);
  };

  // Toggle all permissions for an admin
  const handleSelectAllForAdmin = (adminId: string, grantAll: boolean) => {
    setAdminPermissions((prev) => {
      return {
        ...prev,
        [adminId]: grantAll ? AVAILABLE_PERMISSIONS.map((p) => p.key) : [],
      };
    });
    setSaveSuccess(null);
  };

  // Toggle a feature for all platform admins
  const handleToggleRowForAll = (permKey: string) => {
    const allHaveIt = platformAdmins.every((admin) =>
      (adminPermissions[admin.id] || []).includes(permKey)
    );
    setAdminPermissions((prev) => {
      const next = { ...prev };
      platformAdmins.forEach((admin) => {
        const cur = next[admin.id] || [];
        if (allHaveIt) {
          next[admin.id] = cur.filter((k) => k !== permKey);
        } else if (!cur.includes(permKey)) {
          next[admin.id] = [...cur, permKey];
        }
      });
      return next;
    });
    setSaveSuccess(null);
  };

  // Save all modified permissions to the backend
  const handleSave = async () => {
    if (!hasUnsavedChanges) return;
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      // Send patch requests for modified admins in parallel
      await Promise.all(
        modifiedAdminIds.map((adminId) =>
          PlatformService.write(
            `admins/${adminId}`,
            { permissions: adminPermissions[adminId] || [] },
            'patch'
          )
        )
      );

      // Update initial state baseline
      setInitialPermissions({ ...adminPermissions });
      setSaveSuccess(`Successfully saved permissions for ${modifiedAdminIds.length} administrator${modifiedAdminIds.length === 1 ? '' : 's'}!`);
      if (onSaved) {
        onSaved();
      }
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to update admin permissions');
    } finally {
      setIsSaving(false);
    }
  };

  // Discard all unsaved changes
  const handleDiscard = () => {
    setAdminPermissions({ ...initialPermissions });
    setSaveSuccess(null);
    setSaveError(null);
  };

  // Reset an admin to standard presets
  const handleApplyPreset = (adminId: string, preset: 'FULL' | 'READ_ONLY' | 'SUPPORT' | 'CLEAR') => {
    let perms: string[] = [];
    if (preset === 'FULL') {
      perms = AVAILABLE_PERMISSIONS.map((p) => p.key);
    } else if (preset === 'READ_ONLY') {
      perms = AVAILABLE_PERMISSIONS.filter((p) => p.key.endsWith('.read')).map((p) => p.key);
    } else if (preset === 'SUPPORT') {
      perms = AVAILABLE_PERMISSIONS.filter(
        (p) =>
          p.key.includes('support') ||
          p.key.includes('notifications') ||
          p.key.includes('organisations.read') ||
          p.key.includes('users.read')
      ).map((p) => p.key);
    } else if (preset === 'CLEAR') {
      perms = [];
    }

    setAdminPermissions((prev) => ({
      ...prev,
      [adminId]: perms,
    }));
    setShowResetModal(false);
  };

  // Filter permissions based on search query and group
  const filteredPermissions = useMemo(() => {
    return AVAILABLE_PERMISSIONS.filter((p) => {
      const domain = p.key.split('.')[1] || '';
      const matchesGroup = selectedGroup === 'all' || domain === selectedGroup;
      const matchesSearch =
        search === '' ||
        p.label.toLowerCase().includes(search.toLowerCase()) ||
        p.key.toLowerCase().includes(search.toLowerCase()) ||
        (permissionGroups[domain] || '').toLowerCase().includes(search.toLowerCase());
      return matchesGroup && matchesSearch;
    });
  }, [search, selectedGroup]);

  // Group permissions by category for distinct visual sections
  const groupedFeatures = useMemo(() => {
    const groups: Record<string, typeof AVAILABLE_PERMISSIONS> = {};
    filteredPermissions.forEach((p) => {
      const domain = p.key.split('.')[1] || 'other';
      if (!groups[domain]) groups[domain] = [];
      groups[domain].push(p);
    });
    return groups;
  }, [filteredPermissions]);

  const allColumnsCount = 1 + platformAdmins.length + (showSuperAdminCol ? superAdmins.length : 0);

  return (
    <div className="bg-surface border border-line rounded-2xl shadow-xs overflow-hidden">
      {/* 1. Header with Title, Actions, and Description (matches user image) */}
      <div className="p-5 sm:p-6 border-b border-line bg-surface">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
              <TableIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-ink flex items-center gap-2">
                Feature matrix
                {hasUnsavedChanges && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    {modifiedAdminIds.length} unsaved
                  </span>
                )}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            {hasUnsavedChanges && (
              <button
                type="button"
                onClick={handleDiscard}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-line hover:bg-soft text-muted hover:text-ink transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Discard
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-line-strong bg-surface hover:bg-soft text-ink transition-colors shadow-2xs"
            >
              <HelpCircle className="w-3.5 h-3.5 text-muted" />
              How do I reset?
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={!hasUnsavedChanges || isSaving}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg transition-all shadow-xs ${
                hasUnsavedChanges
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer ring-2 ring-emerald-600/20'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              }`}
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Save permissions
                </>
              )}
            </button>
          </div>
        </div>

        {/* Explanatory description paragraph directly matching reference screenshot */}
        <p className="text-xs text-muted leading-relaxed mt-3 max-w-4xl">
          Page access, above, decides whether a role can open a page at all. This decides what they can do once they are on one — export, unmask salary fields, change a submission's status. Keeping the two apart is what lets a role read the employee report without being able to unmask a bank account on it.
        </p>

        {/* Feedback alerts */}
        {saveSuccess && (
          <div className="mt-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccess}</span>
          </div>
        )}

        {saveError && (
          <div className="mt-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="px-5 py-3 border-b border-line bg-soft/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Filter features or permissions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-surface border border-line-strong rounded-lg text-ink placeholder-muted focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink text-xs"
            >
              ×
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-[11px] font-semibold text-muted uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Module:
          </span>
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="text-xs bg-surface border border-line rounded-lg px-2.5 py-1 text-ink focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">All Modules ({AVAILABLE_PERMISSIONS.length} features)</option>
            {Object.entries(permissionGroups).map(([groupKey, groupLabel]) => (
              <option key={groupKey} value={groupKey}>
                {groupLabel}
              </option>
            ))}
          </select>

          <label className="inline-flex items-center gap-1.5 text-xs text-muted cursor-pointer shrink-0 ml-2">
            <input
              type="checkbox"
              checked={showSuperAdminCol}
              onChange={(e) => setShowSuperAdminCol(e.target.checked)}
              className="rounded border-line-strong text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
            />
            Show Super Admin column
          </label>
        </div>
      </div>

      {/* 3. The Feature Matrix Table (Admins in Columns, Accesses in Rows) */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse min-w-[850px]">
          <thead className="bg-soft/80 border-b border-line text-[11px] font-bold text-muted uppercase tracking-wider sticky top-0 z-20 backdrop-blur-xs">
            <tr>
              {/* Feature column - FROZEN / STICKY */}
              <th scope="col" className="py-3 px-4 min-w-[280px] border-r border-line text-ink font-bold sticky left-0 bg-soft z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]">
                FEATURE
              </th>

              {/* Administrator Columns */}
              <th
                scope="col"
                colSpan={platformAdmins.length + (showSuperAdminCol ? superAdmins.length : 0)}
                className="py-2 px-3 text-left font-bold text-ink bg-soft border-b border-line/60"
              >
                <div className="flex items-center justify-between">
                  <span>ENABLED FOR ROLES / ADMINISTRATORS</span>
                  <span className="text-[10px] font-mono text-muted lowercase">
                    ({platformAdmins.length} configurable admin{platformAdmins.length === 1 ? '' : 's'})
                  </span>
                </div>
              </th>
            </tr>

            {/* Sub-header row with Admin Names in columns */}
            <tr className="border-t border-line/60 text-[10px] bg-slate-50/70">
              <th className="py-2 px-4 border-r border-line text-muted font-mono font-medium sticky left-0 bg-slate-100 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]">
                {filteredPermissions.length} actions listed
              </th>

              {/* Super Admin Column (Permanent Root) */}
              {showSuperAdminCol &&
                superAdmins.map((superAdmin) => (
                  <th
                    key={superAdmin.id}
                    className="py-2.5 px-3 min-w-[170px] border-r border-line/60 bg-rose-50/40 text-ink"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-rose-100 text-rose-700 font-bold flex items-center justify-center text-[10px] shrink-0">
                        SA
                      </span>
                      <div className="truncate">
                        <div className="font-bold text-ink truncate flex items-center gap-1">
                          {superAdmin.firstName} {superAdmin.lastName}
                          <ShieldCheck className="w-3 h-3 text-rose-600 shrink-0" />
                        </div>
                        <span className="text-[9px] font-mono text-rose-700 block truncate">
                          Root (* All Access)
                        </span>
                      </div>
                    </div>
                  </th>
                ))}

              {/* Platform Admin Columns */}
              {platformAdmins.length === 0 ? (
                <th className="py-2.5 px-4 text-center text-muted italic">
                  No Platform Admins found. Create one using the "+ Create Admin" button.
                </th>
              ) : (
                platformAdmins.map((admin) => {
                  const isModified = modifiedAdminIds.includes(admin.id);
                  const isHighlighted = highlightAdminId === admin.id;
                  const assignedCount = (adminPermissions[admin.id] || []).length;
                  const allChecked = assignedCount === AVAILABLE_PERMISSIONS.length;

                  return (
                    <th
                      key={admin.id}
                      id={`matrix-admin-col-${admin.id}`}
                      className={`py-2.5 px-3 min-w-[175px] border-r border-line/60 transition-colors ${
                        isHighlighted
                          ? 'bg-emerald-50/80 ring-2 ring-emerald-500'
                          : isModified
                          ? 'bg-amber-50/50'
                          : 'bg-surface'
                      }`}
                    >
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px] shrink-0">
                              {admin.firstName[0]}
                              {admin.lastName[0]}
                            </span>
                            <div className="truncate">
                              <span className="font-bold text-ink truncate block text-[11px] flex items-center gap-1">
                                {admin.firstName} {admin.lastName}
                                {isHighlighted && (
                                  <span className="px-1 py-0.2 rounded text-[8px] font-bold uppercase bg-emerald-600 text-white">
                                    Focus
                                  </span>
                                )}
                              </span>
                              <span className="text-[9px] text-muted truncate block">
                                {admin.platformAdminProfile?.department || 'Operations'}
                              </span>
                            </div>
                          </div>

                          {isModified && (
                            <span
                              title="Unsaved changes"
                              className="w-2 h-2 rounded-full bg-amber-500 shrink-0"
                            />
                          )}
                        </div>

                        {/* Quick select/clear helpers for this admin */}
                        <div className="flex items-center justify-between pt-1 border-t border-line/50 text-[9px]">
                          <span className="font-mono text-muted">
                            {assignedCount}/{AVAILABLE_PERMISSIONS.length}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSelectAllForAdmin(admin.id, true)}
                              className="text-emerald-700 hover:text-emerald-800 font-semibold underline cursor-pointer"
                            >
                              All
                            </button>
                            <span className="text-muted">|</span>
                            <button
                              type="button"
                              onClick={() => handleSelectAllForAdmin(admin.id, false)}
                              className="text-rose-700 hover:text-rose-800 font-semibold underline cursor-pointer"
                            >
                              None
                            </button>
                          </div>
                        </div>
                      </div>
                    </th>
                  );
                })
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-line">
            {Object.keys(groupedFeatures).length === 0 ? (
              <tr>
                <td colSpan={allColumnsCount} className="py-12 text-center text-muted text-xs">
                  No features found matching "{search}".
                </td>
              </tr>
            ) : (
              Object.entries(groupedFeatures).map(([groupKey, features]) => {
                const groupTitle = (permissionGroups[groupKey] || groupKey).toUpperCase();

                return (
                  <React.Fragment key={groupKey}>
                    {/* Category Group Header Separator */}
                    <tr className="bg-slate-100/70 border-t-2 border-line">
                      <td
                        colSpan={allColumnsCount}
                        className="py-1.5 px-4 font-bold text-[10px] tracking-wider uppercase text-muted font-sans"
                      >
                        {groupTitle} MODULE
                      </td>
                    </tr>

                    {/* Features in this Category */}
                    {features.map((perm) => {
                      return (
                        <tr
                          key={perm.key}
                          className="hover:bg-soft/50 transition-colors group"
                        >
                          {/* Left Column: Feature Title & Key - FROZEN / STICKY */}
                          <td className="py-3 px-4 border-r border-line bg-surface sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]">
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted font-mono block">
                                {groupTitle}
                              </span>
                              <span className="font-semibold text-ink text-xs block mt-0.5">
                                {perm.label}
                              </span>
                              <span className="text-[11px] font-mono text-muted block mt-0.5 select-all">
                                {perm.key}
                              </span>
                            </div>
                          </td>

                          {/* Super Admin Checkbox (Always checked, locked) */}
                          {showSuperAdminCol &&
                            superAdmins.map((superAdmin) => (
                              <td
                                key={superAdmin.id}
                                className="py-3 px-3 border-r border-line/60 bg-rose-50/20 text-center"
                              >
                                <label
                                  className="inline-flex items-center gap-1.5 cursor-not-allowed select-none text-xs font-semibold text-rose-800"
                                  title="Root Super Admin privileges cannot be revoked"
                                >
                                  <input
                                    type="checkbox"
                                    checked={true}
                                    disabled={true}
                                    readOnly
                                    className="w-4 h-4 rounded text-rose-600 border-line cursor-not-allowed accent-rose-600"
                                  />
                                  <span>{superAdmin.firstName}</span>
                                </label>
                              </td>
                            ))}

                          {/* Platform Admin Checkbox Cells */}
                          {platformAdmins.map((admin) => {
                            const isChecked = (adminPermissions[admin.id] || []).includes(perm.key);
                            const isModifiedAdmin = modifiedAdminIds.includes(admin.id);
                            const isHighlighted = highlightAdminId === admin.id;

                            return (
                              <td
                                key={admin.id}
                                className={`py-3 px-3 border-r border-line/60 transition-colors ${
                                  isHighlighted
                                    ? isChecked ? 'bg-emerald-100/40' : 'bg-emerald-50/30'
                                    : isChecked
                                    ? 'bg-emerald-50/20'
                                    : ''
                                }`}
                              >
                                <label
                                  className="inline-flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-ink hover:text-emerald-700 transition-colors"
                                  title={`Toggle ${perm.label} for ${admin.firstName} ${admin.lastName}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleToggle(admin.id, perm.key)}
                                    className="w-4 h-4 text-emerald-600 rounded border-line-strong focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                                  />
                                  {/* Admin name label beside checkbox matching the screenshot layout */}
                                  <span className={isChecked ? 'font-semibold text-ink' : 'text-muted'}>
                                    {admin.firstName}
                                  </span>
                                </label>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 4. Footer Note (matching screenshot exactly) */}
      <div className="p-4 bg-slate-50 border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted">
        <p className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span>
            <strong className="text-ink font-semibold">Admin</strong> keeps{' '}
            <code className="text-[11px] font-mono font-bold text-rose-700 bg-rose-50 px-1 py-0.5 rounded border border-rose-200">
              * (all permissions)
            </code>{' '}
            permanently — otherwise nobody could see everything or fix a mistake made on this page.
          </span>
        </p>

        {hasUnsavedChanges && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              Unsaved changes pending
            </span>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-xs"
            >
              {isSaving ? 'Saving...' : 'Save now'}
            </button>
          </div>
        )}
      </div>

      {/* 5. "How do I reset?" Informational & Action Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-surface border border-line rounded-2xl shadow-xl overflow-hidden">
            <div className="p-5 border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <HelpCircle className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-ink">Resetting Permissions</h3>
              </div>
              <button
                onClick={() => setShowResetModal(false)}
                className="text-muted hover:text-ink text-lg leading-none p-1"
              >
                ×
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-muted leading-relaxed">
              <p>
                The <strong className="text-ink">Feature matrix</strong> lets you configure granular access control for each platform administrator. Here is how resetting and safety works:
              </p>

              <div className="space-y-2 p-3 rounded-xl bg-soft border border-line">
                <div className="font-semibold text-ink flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4 text-action" />
                  Discard Unsaved Changes
                </div>
                <p>
                  If you made checkmark adjustments that haven't been saved yet, click the{' '}
                  <strong className="text-ink">Discard</strong> button in the top action bar to immediately revert back to current database permissions.
                </p>
              </div>

              <div className="space-y-2 p-3 rounded-xl bg-soft border border-line">
                <div className="font-semibold text-ink flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Apply Role Templates
                </div>
                <p>
                  You can quickly configure any administrator by applying standard permission templates below:
                </p>

                {platformAdmins.length === 0 ? (
                  <p className="italic text-muted">No Platform Admins currently registered.</p>
                ) : (
                  <div className="space-y-2 mt-2 pt-2 border-t border-line/60">
                    {platformAdmins.map((admin) => (
                      <div key={admin.id} className="flex items-center justify-between gap-2 py-1">
                        <span className="font-semibold text-ink truncate">
                          {admin.firstName} {admin.lastName}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleApplyPreset(admin.id, 'FULL')}
                            className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                          >
                            Full Access
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApplyPreset(admin.id, 'READ_ONLY')}
                            className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200"
                          >
                            Read Only
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApplyPreset(admin.id, 'SUPPORT')}
                            className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                          >
                            Support
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApplyPreset(admin.id, 'CLEAR')}
                            className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-soft border-t border-line flex justify-end">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-4 py-1.5 bg-surface border border-line hover:bg-slate-100 text-ink rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
