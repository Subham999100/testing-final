// ============================================================
// Organisation Super Admin — Recruiter Access & Roles/Permissions
// Simplified UX:
// Select Recruiter → Feature Matrix → Select / Unselect Features → Save Changes
// ============================================================

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  AlertTriangle,
  Briefcase,
  Check,
  CheckCircle2,
  FileCheck,
  Filter,
  Info,
  Loader2,
  Lock,
  RotateCcw,
  Search,
  Settings2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  api,
  errorMessage,
  OrgMemberPermissionDetail,
  OrgPermissionCatalogResponse,
  OrgPermissionItem,
} from '../lib/api';
import { useDebounced } from '../lib/format';
import { qk, STALE } from '../lib/queryKeys';
import { usePermissions } from '../lib/session';
import { toast } from '../ui/toast';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  PageSkeleton,
  Skeleton,
  StatusBadge,
  cn,
} from '../ui/ui';

interface MemberRow {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  title: string | null;
  joinedAt: string;
  tokensRemaining: number;
  openJobs: number;
  openApplications: number;
  canManage: boolean;
}

// User-friendly descriptions for recruiter features (no technical keys)
const FEATURE_HINTS: Record<string, string> = {
  'org.profile.read': 'View company profile, legal details, and branding info',
  'jobs.read.assigned': 'Access and review only jobs assigned to this recruiter',
  'jobs.create': 'Create new job requisitions and draft listings',
  'jobs.update': 'Edit existing job requisition details and requirements',
  'jobs.publish': 'Directly publish jobs to the public careers portal without admin sign-off',
  'jobs.archive': 'Archive, pause, or close completed job listings',
  'candidates.read': 'View candidate profiles, work histories, and qualifications',
  'candidates.search': 'Search and filter candidates in the talent database',
  'candidates.resume.view': 'View, download, and parse candidate resumes',
  'candidates.notes.write': 'Add internal evaluation notes and screening comments',
  'candidates.save': 'Bookmark candidates and add them to saved talent pools',
  'applications.read.assigned': 'Review incoming applications for assigned jobs',
  'applications.transition': 'Advance or transition candidates through hiring stages',
  'ats.move': 'Move candidates between pipeline stages on the ATS board',
  'ats.bulk': 'Perform bulk stage transitions or candidate rejections',
  'interviews.read': 'View scheduled interview rounds and candidate schedules',
  'interviews.schedule': 'Book, reschedule, or cancel candidate interview rounds',
  'interviews.feedback.write': 'Submit scorecard evaluations and interview feedback',
  'offers.read': 'View generated job offers and current offer statuses',
  'offers.create': 'Draft remuneration packages and offer letters',
  'offers.send': 'Directly dispatch signed offer letters to candidates without sign-off',
  'messages.use': 'Send direct email/messages to candidates and interviewers',
  'analytics.self': 'View personal recruiter hiring metrics and placement stats',
  'ai.use': 'Use AI candidate match scoring, summaries, and screening tools',
  'audit.read.self': 'View logs of own user actions and session history',
  'tasks.use': 'Create and manage recruitment tasks and follow-up reminders',
  'support.read': 'View platform support inquiries and open tickets',
  'support.create': 'Submit new support requests to the platform team',
  'support.reply': 'Send follow-up messages on ongoing support tickets',
};

export function RolesPermissionsPage() {
  const qc = useQueryClient();
  const { can } = usePermissions();

  const canManageRecruiterPerms = can('recruiters.permissions.manage');

  // Search filter for recruiters list
  const [recruiterSearch, setRecruiterSearch] = useState('');
  const debouncedSearch = useDebounced(recruiterSearch, 200).trim();

  // Selected recruiter
  const [selectedRecruiterId, setSelectedRecruiterId] = useState<string | null>(null);

  // Local state for modified permissions (dirty tracking)
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());

  // 1. Fetch authoritative catalog
  const {
    data: catalogData,
    isLoading: catalogLoading,
    isError: catalogError,
    refetch: refetchCatalog,
  } = useQuery<OrgPermissionCatalogResponse>({
    queryKey: qk.catalog,
    queryFn: () => api.get<OrgPermissionCatalogResponse>('/org/permissions/catalog'),
    staleTime: STALE.static,
  });

  // 2. Fetch recruiters list
  const recruiterFilters = useMemo(
    () => ({
      role: 'RECRUITER',
      search: debouncedSearch,
      page: 1,
      limit: 50,
    }),
    [debouncedSearch],
  );

  const {
    data: recruitersPage,
    isLoading: recruitersLoading,
    isError: recruitersError,
    refetch: refetchRecruiters,
  } = useQuery({
    queryKey: qk.members.list(recruiterFilters),
    queryFn: () => api.page<MemberRow>('/org/members', recruiterFilters),
    placeholderData: keepPreviousData,
    staleTime: STALE.list,
  });

  const recruiters = recruitersPage?.data ?? [];

  // Auto-select first recruiter if none selected or if selected is not in current list
  useEffect(() => {
    if (recruiters.length > 0) {
      if (!selectedRecruiterId || !recruiters.some((r) => r.id === selectedRecruiterId)) {
        setSelectedRecruiterId(recruiters[0].id);
      }
    } else {
      setSelectedRecruiterId(null);
    }
  }, [recruiters, selectedRecruiterId]);

  // 3. Fetch selected recruiter detail (with existing permissions)
  const {
    data: memberDetail,
    isLoading: detailLoading,
    isFetching: detailFetching,
    isError: detailError,
    refetch: refetchDetail,
  } = useQuery<OrgMemberPermissionDetail>({
    queryKey: qk.members.detail(selectedRecruiterId || ''),
    queryFn: () => api.get<OrgMemberPermissionDetail>(`/org/members/${selectedRecruiterId}`),
    enabled: !!selectedRecruiterId,
    staleTime: STALE.detail,
  });

  // Sync initial permissions into local state whenever the selected member detail changes
  useEffect(() => {
    if (memberDetail?.permissions) {
      setSelectedPerms(new Set(memberDetail.permissions));
    } else {
      setSelectedPerms(new Set());
    }
  }, [memberDetail?.id, memberDetail?.permissions]);

  // Compute dirty state
  const isDirty = useMemo(() => {
    if (!memberDetail) return false;
    const initial = new Set(memberDetail.permissions);
    if (selectedPerms.size !== initial.size) return true;
    for (const p of selectedPerms) {
      if (!initial.has(p)) return true;
    }
    return false;
  }, [selectedPerms, memberDetail]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (newPermissions: string[]) =>
      api.put<OrgMemberPermissionDetail>(`/org/members/${selectedRecruiterId}/permissions`, {
        permissions: newPermissions,
      }),
    onSuccess: (updated) => {
      qc.setQueryData(qk.members.detail(selectedRecruiterId || ''), updated);
      setSelectedPerms(new Set(updated.permissions));
      toast.success(`Feature access saved for ${updated.name}`);
    },
    onError: (err) => {
      toast.error(errorMessage(err, 'Failed to save feature permissions'));
    },
  });

  const handleReset = () => {
    if (memberDetail?.permissions) {
      setSelectedPerms(new Set(memberDetail.permissions));
      toast.info('Changes reset to current saved permissions');
    }
  };

  const handleSave = () => {
    if (!selectedRecruiterId || !isDirty) return;
    saveMutation.mutate(Array.from(selectedPerms));
  };

  const handleToggleFeature = (key: string) => {
    if (!canManageRecruiterPerms || saveMutation.isPending) return;
    const next = new Set(selectedPerms);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setSelectedPerms(next);
  };

  const handleToggleGroup = (groupKeys: string[], targetState: boolean) => {
    if (!canManageRecruiterPerms || saveMutation.isPending) return;
    const next = new Set(selectedPerms);
    groupKeys.forEach((key) => {
      if (targetState) {
        next.add(key);
      } else {
        next.delete(key);
      }
    });
    setSelectedPerms(next);
  };

  // Recruiter feature ceiling items grouped by category
  const recruiterCeilingSet = useMemo(
    () => new Set(catalogData?.ceilings?.RECRUITER ?? []),
    [catalogData],
  );

  const recruiterGroups = useMemo(() => {
    if (!catalogData) return [];
    const map = new Map<string, OrgPermissionItem[]>();
    catalogData.catalog
      .filter((p) => recruiterCeilingSet.has(p.key))
      .forEach((p) => {
        const list = map.get(p.group) || [];
        list.push(p);
        map.set(p.group, list);
      });
    return Array.from(map.entries());
  }, [catalogData, recruiterCeilingSet]);

  if (catalogLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Roles & Permissions"
          subtitle="Configure recruiter access and workflow permissions."
        />
        <PageSkeleton />
      </div>
    );
  }

  if (catalogError || !catalogData) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Roles & Permissions"
          subtitle="Configure recruiter access and workflow permissions."
        />
        <Card className="p-8">
          <EmptyState
            icon={AlertTriangle}
            title="Failed to load permission catalog"
            text="Could not load the permission catalog from the server."
            action={
              <Button variant="primary" icon={RotateCcw} onClick={() => refetchCatalog()}>
                Retry
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Title and Overview Cards */}
      <PageHeader
        title="Roles & Permissions"
        subtitle="Manage recruiter feature access. Select a recruiter, choose features, and save changes."
      />

      {/* Governance & Permission Boundaries Card */}
      <Card className="p-4 bg-gradient-to-r from-slate-50 via-white to-indigo-50/30 border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm font-semibold text-slate-800">Organisation Super Admin Overview</h2>
            </div>
            <p className="text-xs text-slate-500 max-w-3xl leading-relaxed">
              Recruiters operate within strict tenant isolation and are governed by their platform{' '}
              <strong className="text-slate-700">Permission Boundaries</strong>. Feature assignments below take effect
              immediately upon saving and are enforced server-side on every request.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
              Role: <span className="text-indigo-600 font-bold">RECRUITER</span>
            </span>
            <span className="text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
              Available: <span className="text-indigo-600 font-bold">{recruiterCeilingSet.size} Features</span>
            </span>
          </div>
        </div>
      </Card>

      {!canManageRecruiterPerms && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 flex items-start gap-3">
          <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <span className="font-semibold">Read-Only Mode:</span> You can inspect recruiter feature access, but
            granting or modifying features requires the <code className="font-mono">recruiters.permissions.manage</code>{' '}
            permission.
          </div>
        </div>
      )}

      {/* 2-Column Master-Detail Layout */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* LEFT COLUMN: Recruiter Selection Directory (4 of 12 columns) */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="flex flex-col h-full">
            <div className="p-4 border-b border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-slate-600" />
                  <h3 className="text-sm font-semibold text-slate-900">Recruiters</h3>
                </div>
                <Badge tone="blue">{recruitersPage?.meta?.total ?? recruiters.length}</Badge>
              </div>

              {/* Search Recruiter Input */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search recruiter..."
                  value={recruiterSearch}
                  onChange={(e) => setRecruiterSearch(e.target.value)}
                  className="h-8 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                {recruiterSearch && (
                  <button
                    onClick={() => setRecruiterSearch('')}
                    className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Recruiter List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[640px]">
              {recruitersLoading ? (
                <div className="p-4 space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : recruitersError ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  <p className="text-rose-600 font-semibold mb-2">Failed to load recruiters</p>
                  <Button size="sm" variant="secondary" onClick={() => refetchRecruiters()}>
                    Retry
                  </Button>
                </div>
              ) : recruiters.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  <p className="font-semibold text-slate-700">No recruiters found</p>
                  <p className="mt-1 text-slate-400">
                    {debouncedSearch ? 'Try a different search term.' : 'No recruiters have been provisioned yet.'}
                  </p>
                </div>
              ) : (
                recruiters.map((r) => {
                  const isSelected = r.id === selectedRecruiterId;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        if (isDirty) {
                          if (!window.confirm('You have unsaved changes. Switch recruiter anyway?')) {
                            return;
                          }
                        }
                        setSelectedRecruiterId(r.id);
                      }}
                      className={cn(
                        'w-full flex items-center justify-between p-3.5 text-left transition-colors',
                        isSelected
                          ? 'bg-indigo-50/70 border-l-4 border-indigo-600 pl-2.5'
                          : 'hover:bg-slate-50 border-l-4 border-transparent',
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar name={r.name} className="h-8 w-8 text-xs font-bold" />
                        <div className="min-w-0">
                          <p
                            className={cn(
                              'text-xs font-semibold truncate',
                              isSelected ? 'text-indigo-900' : 'text-slate-800',
                            )}
                          >
                            {r.name}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">{r.email}</p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <StatusBadge status={r.status} />
                        {isSelected && (
                          <span className="text-[10px] font-bold text-indigo-600">Selected</span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: Feature Access Matrix & Save Panel (8 of 12 columns) */}
        <div className="lg:col-span-8">
          {!selectedRecruiterId ? (
            <Card className="p-12 text-center">
              <EmptyState
                icon={Users}
                title="Select a Recruiter"
                text="Choose a recruiter from the list on the left to inspect and configure their feature access."
              />
            </Card>
          ) : detailLoading && !memberDetail ? (
            <Card className="p-6">
              <PageSkeleton />
            </Card>
          ) : detailError ? (
            <Card className="p-8 text-center">
              <EmptyState
                icon={AlertTriangle}
                title="Failed to load recruiter permissions"
                text="Could not fetch permissions for the selected recruiter."
                action={
                  <Button size="sm" variant="secondary" onClick={() => refetchDetail()}>
                    Retry
                  </Button>
                }
              />
            </Card>
          ) : (
            <Card className="overflow-hidden">
              {/* Selected Recruiter Profile Header */}
              <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={memberDetail?.name || ''} className="h-10 w-10 text-sm font-bold" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-slate-900">{memberDetail?.name}</h3>
                        <StatusBadge status={memberDetail?.status || 'ACTIVE'} />
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {memberDetail?.email} • {memberDetail?.title || 'Recruiter'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-xs text-slate-500 block">Active Features</span>
                      <span className="text-sm font-bold text-slate-800">
                        {selectedPerms.size} / {recruiterCeilingSet.size}
                      </span>
                    </div>

                    {isDirty && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Unsaved Changes
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Toolbar (Sticky header inside matrix) */}
              <div className="px-5 py-3 border-b border-slate-100 bg-white flex items-center justify-between sticky top-0 z-10 shadow-sm">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Feature Access Matrix
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Check or uncheck features. Changes are kept locally until you click Save Changes.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {isDirty && (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={saveMutation.isPending}
                      onClick={handleReset}
                    >
                      Cancel
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={!isDirty || !canManageRecruiterPerms}
                    loading={saveMutation.isPending}
                    icon={saveMutation.isPending ? undefined : Check}
                    onClick={handleSave}
                  >
                    Save Changes
                  </Button>
                </div>
              </div>

              {/* Feature Matrix Categories */}
              <div className="p-6 space-y-6 max-h-[700px] overflow-y-auto">
                {recruiterGroups.map(([groupName, items]) => {
                  const groupKeys = items.map((i) => i.key);
                  const activeInGroup = items.filter((i) => selectedPerms.has(i.key)).length;
                  const allActive = activeInGroup === items.length;

                  return (
                    <div key={groupName} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                      {/* Domain Header */}
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">{groupName}</span>
                          <span className="text-[11px] font-medium text-slate-400">
                            ({activeInGroup} / {items.length} active)
                          </span>
                        </div>

                        {canManageRecruiterPerms && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleGroup(groupKeys, !allActive)}
                              className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                            >
                              {allActive ? 'Deselect All' : 'Select All'}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Feature Checkbox Grid */}
                      <div className="grid gap-2.5 sm:grid-cols-2">
                        {items.map((item) => {
                          const isChecked = selectedPerms.has(item.key);
                          const hint = FEATURE_HINTS[item.key];
                          const isElevatedFeature = item.key === 'jobs.publish' || item.key === 'offers.send';

                          return (
                            <label
                              key={item.key}
                              className={cn(
                                'relative flex items-start gap-3 rounded-lg border p-3 text-xs transition-all cursor-pointer select-none',
                                isChecked
                                  ? 'border-indigo-200 bg-indigo-50/40 shadow-sm'
                                  : 'border-slate-200 bg-white hover:bg-slate-50/80',
                                !canManageRecruiterPerms && 'cursor-not-allowed opacity-75',
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={!canManageRecruiterPerms || saveMutation.isPending}
                                onChange={() => handleToggleFeature(item.key)}
                                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              />

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1">
                                  <span
                                    className={cn(
                                      'font-semibold',
                                      isChecked ? 'text-indigo-950' : 'text-slate-800',
                                    )}
                                  >
                                    {item.label}
                                  </span>

                                  {isElevatedFeature && (
                                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 shrink-0">
                                      Elevated
                                    </span>
                                  )}
                                </div>

                                {hint && (
                                  <p className="mt-0.5 text-[11px] text-slate-500 leading-relaxed">
                                    {hint}
                                  </p>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Sticky Action Footer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isDirty ? (
                    <span className="text-xs text-amber-800 font-medium">
                      You have unsaved changes for <strong>{memberDetail?.name}</strong>.
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">All permissions are currently saved and up to date.</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {isDirty && (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={saveMutation.isPending}
                      onClick={handleReset}
                    >
                      Cancel
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={!isDirty || !canManageRecruiterPerms}
                    loading={saveMutation.isPending}
                    icon={saveMutation.isPending ? undefined : Check}
                    onClick={handleSave}
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
