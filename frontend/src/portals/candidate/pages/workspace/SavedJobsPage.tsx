// ============================================================
// Clyptus Job Portal - Candidate Portal
// Page: SavedJobsPage (/candidate/saved-jobs)
// List of bookmarked/saved jobs with remove action and direct apply link
// ============================================================

import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bookmark, Briefcase, MapPin, Compass, IndianRupee, Trash2, ArrowRight } from 'lucide-react';
import { candidateApi } from '../../lib/api';
import { candidateQueryKeys } from '../../lib/queryKeys';
import { CandidateSavedJob } from '../../lib/types';
import { toast } from '@/portals/org/ui/toast';

export const SavedJobsPage: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: savedJobs = [], isLoading } = useQuery<CandidateSavedJob[]>({
    queryKey: candidateQueryKeys.savedJobs,
    queryFn: () => candidateApi.getSavedJobs(),
  });

  const removeBookmarkMutation = useMutation({
    mutationFn: (job: CandidateSavedJob) =>
      candidateApi.toggleSaveJob({
        id: job.jobId,
        title: job.title,
        companyName: job.companyName,
        location: job.location,
        workMode: job.workMode,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: candidateQueryKeys.savedJobs });
      toast.success('Removed job from saved list.');
    },
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#1B1A17]">Saved Jobs</h1>
          <p className="text-xs text-[#5C564E] mt-1">
            Jobs you have bookmarked to review or apply to later.
          </p>
        </div>

        <Link
          to="/jobs"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] text-white text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>Browse All Jobs</span>
        </Link>
      </div>

      {/* Saved Jobs List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-[#5C564E] animate-pulse bg-white rounded-2xl border border-[#E8DFD4]">
            Loading saved jobs...
          </div>
        ) : savedJobs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E8DFD4] p-12 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-[#FAF6F1] border border-[#E8DFD4] flex items-center justify-center mx-auto text-[#5C564E]">
              <Bookmark className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-[#1B1A17] font-serif">
              No saved jobs yet
            </h3>
            <p className="text-xs text-[#5C564E] max-w-sm mx-auto">
              Bookmark interesting opportunities while exploring open jobs to save them here for quick access.
            </p>
            <div className="pt-2">
              <Link
                to="/jobs"
                className="inline-block px-4 py-2 bg-[#C2410C] hover:bg-[#9A3412] text-white font-semibold rounded-xl text-xs transition-colors"
              >
                Explore Open Jobs
              </Link>
            </div>
          </div>
        ) : (
          savedJobs.map((job) => (
            <div
              key={job.id}
              className="p-5 bg-white rounded-2xl border border-[#E8DFD4] shadow-xs hover:border-[#C2410C]/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-serif font-bold text-base text-[#1B1A17] hover:text-[#C2410C] transition-colors truncate">
                    <Link to={`/jobs/${job.jobId}`}>{job.title}</Link>
                  </h3>
                  <span className="px-2 py-0.5 rounded-md bg-[#FAF6F1] border border-[#E8DFD4] text-[11px] font-semibold text-[#5C564E]">
                    {job.workMode}
                  </span>
                </div>

                <p className="text-xs text-[#5C564E] font-medium">
                  {job.companyName} {job.location ? `• ${job.location}` : ''}
                </p>

                {job.salaryMin && (
                  <p className="text-xs font-semibold text-[#1B1A17]">
                    ₹{(job.salaryMin / 100000).toFixed(1)}L
                    {job.salaryMax ? ` – ₹${(job.salaryMax / 100000).toFixed(1)}L` : ''} / year
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
                <button
                  type="button"
                  onClick={() => removeBookmarkMutation.mutate(job)}
                  title="Remove bookmark"
                  className="p-2.5 rounded-xl border border-[#E8DFD4] text-[#5C564E] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <Link
                  to={`/jobs/${job.jobId}`}
                  className="px-4 py-2 rounded-xl bg-[#C2410C] hover:bg-[#9A3412] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <span>View & Apply</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
export default SavedJobsPage;
