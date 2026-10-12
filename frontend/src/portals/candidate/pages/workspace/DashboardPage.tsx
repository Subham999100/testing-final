// ============================================================
// Clyptus Job Portal - Candidate Portal
// Page: DashboardPage (Candidate Workspace Skeleton)
// ============================================================

import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCandidateAuth } from '../../lib/session';
import { candidateApi } from '../../lib/api';
import { candidateQueryKeys } from '../../lib/queryKeys';
import { CandidateApplication } from '../../lib/types';
import { Card, PageSkeleton } from '@/portals/org/ui/ui';
import { Briefcase, FileText, CheckCircle2 } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useCandidateAuth();

  const { data: applications, isLoading } = useQuery({
    queryKey: candidateQueryKeys.applications.list,
    queryFn: () => candidateApi.get<CandidateApplication[]>('/candidate/applications'),
  });

  if (isLoading) return <PageSkeleton />;

  const appCount = applications?.length ?? 0;
  const hasResume = !!user?.profile?.resumeFileName;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Welcome back, {user?.firstName}
        </h1>
        <p className="text-sm text-slate-500 mt-1">Here is a summary of your job search activity.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{appCount}</p>
              <p className="text-xs text-slate-500 font-medium">Submitted Applications</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-50 text-orange-600 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">{hasResume ? 'Active' : 'Missing'}</p>
              <p className="text-xs text-slate-500 font-medium">Resume Vault Status</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-50 text-green-600 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">{user?.isEmailVerified ? 'Verified' : 'Active'}</p>
              <p className="text-xs text-slate-500 font-medium">Candidate Account</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Links</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/jobs"
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Search Open Positions
          </Link>
          <Link
            to="/candidate/applications"
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors"
          >
            View All Applications ({appCount})
          </Link>
          <Link
            to="/candidate/resume"
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors"
          >
            Manage Resume
          </Link>
          <Link
            to="/candidate/profile"
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors"
          >
            Edit Profile
          </Link>
        </div>
      </div>
    </div>
  );
};
