// ============================================================
// Clyptus Job Portal - Candidate Portal
// Page: DashboardPage (Candidate Workspace Overview)
// ============================================================

import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCandidateAuth, useCandidateResume, useCandidateProfile } from '../../lib/session';
import { candidateApi } from '../../lib/api';
import { candidateQueryKeys } from '../../lib/queryKeys';
import { CandidateApplication } from '../../lib/types';
import { STAGE_CONFIG, formatDate } from '../../lib/format';
import { Button, Badge, PageSkeleton } from '@/portals/org/ui/ui';
import { Briefcase, FileText, CheckCircle2, ArrowRight, AlertCircle, Sparkles, User, ExternalLink } from 'lucide-react';

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

  if (isLoading) return <PageSkeleton />;

  if (isError) {
    return (
      <div className="bg-white border border-red-200 rounded-xl p-8 text-center space-y-4 max-w-xl mx-auto my-12">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800">Unable to load dashboard data</h3>
        <p className="text-sm text-slate-500 max-w-sm mx-auto">
          We encountered an issue fetching your candidate workspace details. Please try again.
        </p>
        <Button
          onClick={() => {
            refetchResume();
            refetchProfile();
            refetchApps();
          }}
          variant="secondary"
        >
          Retry
        </Button>
      </div>
    );
  }

  const appCount = applications?.length ?? 0;
  const hasResume = !!resumeData?.hasResume;

  // Real profile completeness calculation based on actual profile fields
  const completenessItems = [
    { label: 'Full Name', done: !!(user?.firstName && user?.lastName) },
    { label: 'Headline', done: !!profile?.headline?.trim() },
    { label: 'Location', done: !!profile?.location?.trim() },
    { label: 'Phone', done: !!profile?.phone?.trim() },
    { label: 'Skills', done: !!(profile?.skills && profile.skills.length > 0) },
    { label: 'Bio / Summary', done: !!profile?.bio?.trim() },
    { label: 'Resume in Vault', done: hasResume },
  ];
  const completedCount = completenessItems.filter((i) => i.done).length;
  const completenessPercentage = Math.round((completedCount / completenessItems.length) * 100);

  // Recent applications (up to 4)
  const recentApplications = applications?.slice(0, 4) ?? [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back, {user?.firstName || 'Candidate'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track your job applications, profile completeness, and resume vault.
          </p>
        </div>
        <Link
          to="/jobs"
          className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors self-start sm:self-auto"
        >
          <Briefcase className="w-4 h-4" />
          <span>Find Jobs</span>
        </Link>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Card 1: Applications */}
        <Link
          to="/candidate/applications"
          className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm hover:border-slate-300 hover:shadow transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg group-hover:scale-105 transition-transform">
              <Briefcase className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all" />
          </div>
          <div className="mt-4">
            <p className="text-2xl font-bold text-slate-900">{appCount}</p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Submitted Applications</p>
          </div>
        </Link>

        {/* Card 2: Resume Vault Status */}
        <Link
          to="/candidate/resume"
          className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm hover:border-slate-300 hover:shadow transition-all group"
        >
          <div className="flex items-center justify-between">
            <div
              className={`p-2.5 rounded-lg group-hover:scale-105 transition-transform ${
                hasResume ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
              }`}
            >
              <FileText className="w-5 h-5" />
            </div>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                hasResume ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {hasResume ? 'Active' : 'Missing'}
            </span>
          </div>
          <div className="mt-4">
            <p className="text-lg font-bold text-slate-900 truncate">
              {hasResume ? resumeData?.fileName || 'Active File' : 'No Resume Uploaded'}
            </p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Resume Vault Status</p>
          </div>
        </Link>

        {/* Card 3: Profile Completeness (Replaces Candidate Account card) */}
        <Link
          to="/candidate/profile"
          className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm hover:border-slate-300 hover:shadow transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 bg-orange-50 text-orange-600 rounded-lg group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {completedCount}/{completenessItems.length} steps
            </span>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <p className="text-2xl font-bold text-slate-900">{completenessPercentage}%</p>
              <span className="text-xs text-orange-600 font-medium group-hover:underline">Edit &rarr;</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-orange-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${completenessPercentage}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1.5">Profile Completeness</p>
          </div>
        </Link>
      </div>

      {/* Recent Applications List */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-5 sm:px-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Applications</h2>
            <p className="text-xs text-slate-500 mt-0.5">Live status updates from hiring teams</p>
          </div>
          {appCount > 0 && (
            <Link
              to="/candidate/applications"
              className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1"
            >
              <span>View all ({appCount})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {recentApplications.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <Briefcase className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">No applications submitted yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Ready to find your next opportunity? Apply to open roles in one click using your active profile and resume.
            </p>
            <div className="pt-2">
              <Link
                to="/jobs"
                className="inline-block px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg text-xs transition-colors"
              >
                Browse Open Jobs
              </Link>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentApplications.map((app) => {
              const stage = STAGE_CONFIG[app.status] || { label: app.status, tone: 'gray' as const };
              return (
                <div
                  key={app.id}
                  className="p-5 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <Link
                      to={`/candidate/applications/${app.id}`}
                      className="font-semibold text-sm text-slate-900 hover:text-orange-600 transition-colors"
                    >
                      {app.jobTitle}
                    </Link>
                    <p className="text-xs text-slate-600 font-medium mt-0.5">
                      {app.companyName} &bull; {app.location}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Applied on {formatDate(app.appliedAt)}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge tone={stage.tone}>{stage.label}</Badge>
                    <Link
                      to={`/candidate/applications/${app.id}`}
                      className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1"
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
          className="p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between transition-colors"
        >
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-slate-500" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Edit Profile</p>
              <p className="text-xs text-slate-500">Skills, experience, bio</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400" />
        </Link>

        <Link
          to="/candidate/resume"
          className="p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between transition-colors"
        >
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-slate-500" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Manage Resume</p>
              <p className="text-xs text-slate-500">Preview, replace or download</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400" />
        </Link>

        <Link
          to="/jobs"
          className="p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between transition-colors"
        >
          <div className="flex items-center gap-3">
            <Briefcase className="w-5 h-5 text-slate-500" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Job Directory</p>
              <p className="text-xs text-slate-500">Explore openings across India</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400" />
        </Link>
      </div>
    </div>
  );
};
