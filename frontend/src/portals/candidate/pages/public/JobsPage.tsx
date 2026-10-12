// ============================================================
// Clyptus Job Portal - Candidate Portal
// Page: JobsPage (Phase 1 Skeleton)
// ============================================================

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { candidateApi } from '../../lib/api';
import { candidateQueryKeys } from '../../lib/queryKeys';
import { CandidateJobListResult } from '../../lib/types';
import { PageSkeleton } from '@/portals/org/ui/ui';

export const JobsPage: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: candidateQueryKeys.jobs.list({ limit: 10 }),
    queryFn: () => candidateApi.get<CandidateJobListResult>('/candidate/jobs', { limit: 10 }),
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Explore Open Positions</h1>
        <p className="text-sm text-slate-500 mt-1">Browse live opportunities across verified employers.</p>
      </div>

      {isLoading ? (
        <PageSkeleton />
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Found {data?.total ?? 0} active openings</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data?.items.map((job) => (
              <Link
                key={job.id}
                to={`/jobs/${job.id}`}
                className="block p-5 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-sm transition-all"
              >
                <h3 className="font-semibold text-lg text-slate-900">{job.title}</h3>
                <p className="text-sm text-slate-500">{job.companyName} • {job.location}</p>
                <div className="flex gap-2 mt-3">
                  <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">{job.workMode}</span>
                  <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">{job.employmentType}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
