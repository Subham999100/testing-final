// ============================================================
// Clyptus Job Portal - Candidate Portal
// Page: ApplicationDetailPage (Application Status & History Timeline)
// ============================================================

import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { candidateApi } from '../../lib/api';
import { candidateQueryKeys } from '../../lib/queryKeys';
import { CandidateApplication } from '../../lib/types';
import { STAGE_CONFIG, formatDate } from '../../lib/format';
import { PageSkeleton, Badge, Button } from '@/portals/org/ui/ui';
import { ArrowLeft, Clock, FileText, AlertCircle } from 'lucide-react';

export const ApplicationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const { data: app, isLoading, isError, error, refetch } = useQuery({
    queryKey: candidateQueryKeys.applications.detail(id || ''),
    queryFn: () => candidateApi.get<CandidateApplication>(`/candidate/applications/${id}`),
    enabled: !!id,
  });

  if (isLoading) return <PageSkeleton />;

  if (isError) {
    return (
      <div className="bg-white border border-red-200 rounded-xl p-8 text-center space-y-4 max-w-xl mx-auto my-12">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800">Unable to load application details</h3>
        <p className="text-sm text-slate-500 max-w-sm mx-auto">
          {(error as any)?.message || 'Application not found or connection failed.'}
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button onClick={() => refetch()} variant="secondary">
            Retry
          </Button>
          <Link to="/candidate/applications" className="text-sm text-orange-600 font-semibold hover:underline">
            Back to applications
          </Link>
        </div>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold text-slate-800">Application not found</h2>
        <Link to="/candidate/applications" className="mt-4 inline-block text-sm text-orange-600 font-semibold">
          ← Back to applications
        </Link>
      </div>
    );
  }

  const currentStage = STAGE_CONFIG[app.status] || { label: app.status, tone: 'gray' as const };

  return (
    <div className="space-y-6 max-w-4xl">
      <Link to="/candidate/applications" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft className="w-4 h-4" />
        Back to all applications
      </Link>

      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{app.jobTitle}</h1>
            <p className="text-base text-slate-600 font-medium mt-1">{app.companyName} • {app.location}</p>
            <p className="text-xs text-slate-400 mt-2">Application Reference: {app.id}</p>
          </div>
          <Badge tone={currentStage.tone} className="text-sm py-1 px-3">
            {currentStage.label}
          </Badge>
        </div>

        {/* Timeline */}
        <div>
          <h3 className="font-semibold text-lg text-slate-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-500" />
            Stage Progression Timeline
          </h3>

          <div className="space-y-4 border-l-2 border-slate-200 ml-3 pl-4">
            <div className="relative">
              <div className="absolute -left-[23px] top-1.5 w-3 h-3 rounded-full bg-blue-600 border-2 border-white" />
              <p className="text-sm font-semibold text-slate-900">Application Submitted</p>
              <p className="text-xs text-slate-500">{formatDate(app.appliedAt)}</p>
            </div>

            {app.history?.map((h) => {
              const toStageCfg = STAGE_CONFIG[h.toStage] || { label: h.toStage, tone: 'gray' as const };
              return (
                <div key={h.id} className="relative">
                  <div className="absolute -left-[23px] top-1.5 w-3 h-3 rounded-full bg-orange-600 border-2 border-white" />
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">Advanced to {toStageCfg.label}</p>
                    <Badge tone={toStageCfg.tone} className="text-xs">{toStageCfg.label}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{formatDate(h.createdAt)}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Resume attached */}
        {app.resume && (
          <div className="pt-6 border-t border-slate-100">
            <h4 className="text-sm font-semibold text-slate-800 mb-2">Resume Attached to this Application</h4>
            <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <FileText className="w-4 h-4 text-orange-600" />
              <span className="font-medium">{app.resume.originalFileName}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
