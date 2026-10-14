// ============================================================
// Clyptus Job Portal - Candidate Portal
// Page: DashboardPage (Candidate Workspace Overview)
// Harmonized to Design B palette (#FAF6F1, #E8DFD4, #1B1A17, #C2410C)
// In-card skeletons (no full-screen PageSkeleton flash)
// Server completionScore & breakdown
// ============================================================

import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCandidateAuth, useCandidateResume, useCandidateProfile } from '../../lib/session';
import { candidateApi } from '../../lib/api';
import { candidateQueryKeys } from '../../lib/queryKeys';
import { CandidateApplication } from '../../lib/types';
import { STAGE_CONFIG, formatDate } from '../../lib/format';
import { Button, Badge } from '@/portals/org/ui/ui';
import {
  Briefcase,
  FileText,
  Sparkles,
  ArrowRight,
  AlertCircle,
  User,
  Bookmark,
  Bell,
  RefreshCw,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useCandidateAuth();

  const {
    data: resumeData,
    isLoading: isResumeLoading,
    isError: isResumeError,
    refetch: refetchResume,
  } = useCandidateResume();

  const {
    data: profile,
    isLoading: isProfileLoading,
    isError: isProfileError,
    refetch: refetchProfile,
  } = useCandidateProfile();

  const {
    data: applications,
    isLoading: isAppsLoading,
    isError: isAppsError,
    refetch: refetchApps,
  } = useQuery({
    queryKey: candidateQueryKeys.applications.list,
    queryFn: () => candidateApi.get<CandidateApplication[]>('/candidate/applications'),
  });

  const isLoading = isResumeLoading || isProfileLoading || isAppsLoading;
  const isError = isResumeError || isProfileError || isAppsError;

  if (isError) {
    return (
      <div className="bg-white border border-red-200 rounded-2xl p-8 text-center space-y-4 max-w-xl mx-auto my-12 shadow-xs">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-semibold text-[#1B1A17]">Unable to load dashboard data</h3>
        <p className="text-sm text-[#5C564E] max-w-sm mx-auto">
          We encountered an issue fetching your candidate workspace details. Please try again.
        </p>
        <button
          type="button"
          onClick={() => {
            void refetchResume();
            void refetchProfile();
            void refetchApps();
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] text-white text-xs font-semibold shadow-xs transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  const appCount = applications?.length ?? 0;
  const hasResume = !!resumeData?.hasResume;

  // Server-authoritative profile completeness
  const completenessScore = profile?.completionScore ?? 0;
  const breakdown = profile?.completionBreakdown || {};
  const breakdownEntries = Object.entries(breakdown);
  const totalBreakdownSteps = breakdownEntries.length;
  const completedBreakdownSteps = breakdownEntries.filter(([, val]) => val.completed).length;

  // Recent applications (up to 4)
  const recentApplications = applications?.slice(0, 4) ?? [];

  return (
    <div className="space-y-8 text-[#1B1A17] font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#1B1A17]">
            Welcome back, {user?.firstName || 'Candidate'}
          </h1>
          <p className="text-sm text-[#5C564E] mt-1">
            Track your job applications, profile completeness, and resume vault.
          </p>
        </div>
        <Link
          to="/jobs"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#C2410C] hover:bg-[#9A3412] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors self-start sm:self-auto"
        >
          <Briefcase className="w-4 h-4" />
          <span>Find Jobs</span>
        </Link>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Card 1: Applications */}
        <div className="bg-white border border-[#E8DFD4] p-5 rounded-2xl shadow-xs hover:border-[#D6CCC0] transition-all group">
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-[#FAF6F1] rounded-xl" />
                <div className="w-4 h-4 bg-[#FAF6F1] rounded" />
              </div>
              <div className="space-y-2">
                <div className="h-7 w-12 bg-[#FAF6F1] rounded" />
                <div className="h-3 w-32 bg-[#FAF6F1] rounded" />
              </div>
            </div>
          ) : (
            <Link to="/candidate/applications" className="block">
              <div className="flex items-center justify-between">
                <div className="p-2.5 bg-[#FFF1E6] text-[#C2410C] rounded-xl group-hover:scale-105 transition-transform">
                  <Briefcase className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-[#8C827A] group-hover:text-[#C2410C] group-hover:translate-x-0.5 transition-all" />
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-[#1B1A17]">{appCount}</p>
                <p className="text-xs text-[#5C564E] font-medium mt-0.5">Submitted Applications</p>
              </div>
            </Link>
          )}
        </div>

        {/* Card 2: Resume Vault Status */}
        <div className="bg-white border border-[#E8DFD4] p-5 rounded-2xl shadow-xs hover:border-[#D6CCC0] transition-all group">
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-[#FAF6F1] rounded-xl" />
                <div className="w-12 h-5 bg-[#FAF6F1] rounded-full" />
              </div>
              <div className="space-y-2">
                <div className="h-6 w-28 bg-[#FAF6F1] rounded" />
                <div className="h-3 w-24 bg-[#FAF6F1] rounded" />
              </div>
            </div>
          ) : (
            <Link to="/candidate/resume" className="block">
              <div className="flex items-center justify-between">
                <div
                  className={`p-2.5 rounded-xl group-hover:scale-105 transition-transform ${
                    hasResume ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                  }`}
                >
                  <FileText className="w-5 h-5" />
                </div>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    hasResume ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {hasResume ? 'Active' : 'Missing'}
                </span>
              </div>
              <div className="mt-4">
                <p className="text-base font-bold text-[#1B1A17] truncate">
                  {hasResume ? resumeData?.fileName || 'Active File' : 'No Resume Uploaded'}
                </p>
                <p className="text-xs text-[#5C564E] font-medium mt-0.5">Resume Vault Status</p>
              </div>
            </Link>
          )}
        </div>

        {/* Card 3: Profile Completeness (Server completionScore) */}
        <div className="bg-white border border-[#E8DFD4] p-5 rounded-2xl shadow-xs hover:border-[#D6CCC0] transition-all group">
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-[#FAF6F1] rounded-xl" />
                <div className="w-14 h-5 bg-[#FAF6F1] rounded-full" />
              </div>
              <div className="space-y-2">
                <div className="h-7 w-16 bg-[#FAF6F1] rounded" />
                <div className="h-2 w-full bg-[#FAF6F1] rounded-full" />
                <div className="h-3 w-28 bg-[#FAF6F1] rounded" />
              </div>
            </div>
          ) : (
            <Link to="/candidate/profile" className="block">
              <div className="flex items-center justify-between">
                <div className="p-2.5 bg-[#FFF1E6] text-[#C2410C] rounded-xl group-hover:scale-105 transition-transform">
                  <Sparkles className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#FAF6F1] text-[#5C564E]">
                  {totalBreakdownSteps > 0
                    ? `${completedBreakdownSteps}/${totalBreakdownSteps} sections`
                    : `${completenessScore}%`}
                </span>
              </div>
              <div className="mt-4">
                <div className="flex items-baseline justify-between">
                  <p className="text-2xl font-bold text-[#1B1A17]">{completenessScore}%</p>
                  <span className="text-xs text-[#C2410C] font-semibold group-hover:underline">Edit &rarr;</span>
                </div>
                <div className="w-full bg-[#FAF6F1] h-2 rounded-full mt-2 overflow-hidden border border-[#E8DFD4]/50">
                  <div
                    className="bg-[#C2410C] h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, completenessScore))}%` }}
                  />
                </div>
                <p className="text-xs text-[#5C564E] font-medium mt-1.5">Profile Completeness</p>
              </div>
            </Link>
          )}
        </div>
      </div>

      {/* Recent Applications List */}
      <div className="bg-white border border-[#E8DFD4] rounded-2xl overflow-hidden shadow-xs">
        <div className="p-5 sm:px-6 border-b border-[#FAF6F1] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#1B1A17]">Recent Applications</h2>
            <p className="text-xs text-[#5C564E] mt-0.5">Live status updates from hiring teams</p>
          </div>
          {appCount > 0 && (
            <Link
              to="/candidate/applications"
              className="text-xs font-semibold text-[#C2410C] hover:text-[#9A3412] flex items-center gap-1"
            >
              <span>View all ({appCount})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {isLoading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex items-center justify-between p-4 bg-[#FAF6F1] rounded-xl">
                <div className="space-y-2">
                  <div className="h-4 w-40 bg-[#E8DFD4] rounded" />
                  <div className="h-3 w-56 bg-[#E8DFD4] rounded" />
                </div>
                <div className="h-6 w-20 bg-[#E8DFD4] rounded-full" />
              </div>
            ))}
          </div>
        ) : recentApplications.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <div className="w-12 h-12 bg-[#FAF6F1] rounded-2xl flex items-center justify-center mx-auto text-[#8C827A]">
              <Briefcase className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-[#1B1A17]">No applications submitted yet</h3>
            <p className="text-xs text-[#5C564E] max-w-sm mx-auto">
              Ready to find your next opportunity? Apply to open roles in one click using your active profile and resume.
            </p>
            <div className="pt-2">
              <Link
                to="/jobs"
                className="inline-block px-4 py-2 bg-[#C2410C] hover:bg-[#9A3412] text-white font-medium rounded-xl text-xs transition-colors shadow-xs"
              >
                Browse Open Jobs
              </Link>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[#FAF6F1]">
            {recentApplications.map((app) => {
              const stage = STAGE_CONFIG[app.status] || { label: app.status, tone: 'gray' as const };
              return (
                <div
                  key={app.id}
                  className="p-5 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAF6F1]/50 transition-colors"
                >
                  <div>
                    <Link
                      to={`/candidate/applications/${app.id}`}
                      className="font-semibold text-sm text-[#1B1A17] hover:text-[#C2410C] transition-colors"
                    >
                      {app.jobTitle}
                    </Link>
                    <p className="text-xs text-[#5C564E] font-medium mt-0.5">
                      {app.companyName} &bull; {app.location}
                    </p>
                    <p className="text-[11px] text-[#8C827A] mt-1">Applied on {formatDate(app.appliedAt)}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge tone={stage.tone}>{stage.label}</Badge>
                    <Link
                      to={`/candidate/applications/${app.id}`}
                      className="text-xs font-semibold text-[#C2410C] hover:text-[#9A3412] flex items-center gap-1"
                    >
                      <span>Timeline</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          to="/candidate/profile"
          className="p-4 bg-white hover:bg-[#FAF6F1] border border-[#E8DFD4] rounded-2xl flex items-center justify-between transition-colors shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#FFF1E6] rounded-xl text-[#C2410C]">
              <User className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1B1A17]">Edit Profile</p>
              <p className="text-xs text-[#5C564E]">Skills, experience, bio</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-[#8C827A]" />
        </Link>

        <Link
          to="/candidate/saved-jobs"
          className="p-4 bg-white hover:bg-[#FAF6F1] border border-[#E8DFD4] rounded-2xl flex items-center justify-between transition-colors shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#FFF1E6] rounded-xl text-[#C2410C]">
              <Bookmark className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1B1A17]">Saved Jobs</p>
              <p className="text-xs text-[#5C564E]">View bookmarked openings</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-[#8C827A]" />
        </Link>

        <Link
          to="/candidate/resume"
          className="p-4 bg-white hover:bg-[#FAF6F1] border border-[#E8DFD4] rounded-2xl flex items-center justify-between transition-colors shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#FFF1E6] rounded-xl text-[#C2410C]">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1B1A17]">Manage Resume</p>
              <p className="text-xs text-[#5C564E]">Preview, replace or download</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-[#8C827A]" />
        </Link>
      </div>
    </div>
  );
};
