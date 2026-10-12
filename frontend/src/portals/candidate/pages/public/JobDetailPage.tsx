// ============================================================
// Clyptus Job Portal - Candidate Portal
// Page: JobDetailPage (Phase 1 Skeleton)
// ============================================================

import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { candidateApi } from '../../lib/api';
import { candidateQueryKeys } from '../../lib/queryKeys';
import { CandidateJob } from '../../lib/types';
import { PageSkeleton, Button } from '@/portals/org/ui/ui';
import { ArrowLeft, Briefcase, MapPin } from 'lucide-react';

export const JobDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const { data: job, isLoading } = useQuery({
    queryKey: candidateQueryKeys.jobs.detail(id || ''),
    queryFn: () => candidateApi.get<CandidateJob>(`/candidate/jobs/${id}`),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 w-full">
        <PageSkeleton />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-slate-800">Job Not Found</h2>
        <p className="text-sm text-slate-500 mt-2">This job posting may have expired or been removed.</p>
        <Link to="/jobs" className="mt-4 inline-block text-sm text-orange-600 font-semibold">
          ← Back to jobs
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 w-full">
      <Link to="/jobs" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to all listings
      </Link>

      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{job.title}</h1>
            <p className="text-base text-slate-600 font-medium mt-1">{job.companyName}</p>
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 mt-2">
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {job.location} ({job.workMode})
              </span>
              <span className="flex items-center gap-1">
                <Briefcase className="w-4 h-4" />
                {job.employmentType}
              </span>
            </div>
          </div>
          <div>
            <Link to={`/login?next=/jobs/${job.id}`}>
              <Button variant="primary">Sign in to Apply</Button>
            </Link>
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-lg text-slate-900 mb-2">Job Description</h3>
          <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{job.description}</p>
        </div>
      </div>
    </div>
  );
};
