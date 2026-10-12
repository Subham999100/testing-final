// ============================================================
// Clyptus Job Portal - Candidate Portal
// Page: ApplicationsPage (Candidate Applications List)
// ============================================================

import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { candidateApi } from '../../lib/api';
import { candidateQueryKeys } from '../../lib/queryKeys';
import { CandidateApplication } from '../../lib/types';
import { STAGE_CONFIG, formatDate } from '../../lib/format';
import { PageSkeleton, Badge } from '@/portals/org/ui/ui';
import { Briefcase, ArrowRight } from 'lucide-react';

export const ApplicationsPage: React.FC = () => {
  const { data: applications, isLoading } = useQuery({
    queryKey: candidateQueryKeys.applications.list,
    queryFn: () => candidateApi.get<CandidateApplication[]>('/candidate/applications'),
  });

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Job Applications</h1>
        <p className="text-sm text-slate-500 mt-1">Track the live progress of your applications across employers.</p>
      </div>

      {!applications || applications.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-4">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
            <Briefcase className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">No applications yet</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            You haven't submitted any job applications yet. Browse open roles and apply with your profile.
          </p>
          <Link
            to="/jobs"
            className="inline-block px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg text-sm transition-colors"
          >
            Find Open Jobs
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
          {applications.map((app) => {
            const stage = STAGE_CONFIG[app.status] || { label: app.status, tone: 'gray' as const };
            return (
              <div key={app.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                <div>
                  <h3 className="font-semibold text-base text-slate-900">{app.jobTitle}</h3>
                  <p className="text-sm text-slate-600 font-medium">{app.companyName} • {app.location}</p>
                  <p className="text-xs text-slate-400 mt-1">Applied on {formatDate(app.appliedAt)}</p>
                </div>

                <div className="flex items-center gap-4">
                  <Badge tone={stage.tone}>{stage.label}</Badge>
                  <Link
                    to={`/candidate/applications/${app.id}`}
                    className="text-sm font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1"
                  >
                    <span>View Timeline</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
