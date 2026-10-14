// ============================================================
// Clyptus Job Portal - Candidate Portal
// Component: JobCard
// Accessible card representation with Bookmark / Save job action
// Harmonized palette with #FAF6F1, #E8DFD4, #1B1A17, #C2410C
// ============================================================

import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CandidateJob } from '../lib/types';
import { formatRelative, formatSalaryDisplay } from '../lib/format';
import { CompanyMonogram } from './CompanyMonogram';
import { MapPin, Briefcase, Clock, ArrowRight, Bookmark } from 'lucide-react';
import { candidateApi } from '../lib/api';
import { candidateQueryKeys } from '../lib/queryKeys';
import { toast } from '@/portals/org/ui/toast';

interface JobCardProps {
  job: CandidateJob;
}

export const JobCard: React.FC<JobCardProps> = ({ job }) => {
  const queryClient = useQueryClient();

  const { data: savedJobs = [] } = useQuery({
    queryKey: candidateQueryKeys.savedJobs,
    queryFn: () => candidateApi.getSavedJobs(),
    staleTime: 60000,
  });

  const isSaved = savedJobs.some((s) => s.jobId === job.id);

  const toggleSaveMutation = useMutation({
    mutationFn: () =>
      candidateApi.toggleSaveJob({
        id: job.id,
        title: job.title,
        companyName: job.companyName,
        location: job.location,
        workMode: job.workMode,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: candidateQueryKeys.savedJobs });
      toast.success(res.saved ? `Saved "${job.title}" to your bookmarks.` : `Removed "${job.title}" from bookmarks.`);
    },
  });

  return (
    <div className="bg-white border border-[#E8DFD4] rounded-2xl p-5 sm:p-6 hover:border-[#C2410C]/40 hover:shadow-md transition-all flex flex-col justify-between group text-[#1B1A17]">
      <div>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3.5 min-w-0">
            <CompanyMonogram name={job.companyName} size="md" />
            <div className="min-w-0 flex-1">
              <Link
                to={`/jobs/${job.id}`}
                className="text-base sm:text-lg font-serif font-bold text-[#1B1A17] group-hover:text-[#C2410C] transition-colors line-clamp-1 block"
              >
                {job.title}
              </Link>
              <p className="text-xs font-semibold text-[#5C564E] truncate mt-0.5">{job.companyName}</p>
            </div>
          </div>

          {/* Bookmark Toggle Button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              toggleSaveMutation.mutate();
            }}
            title={isSaved ? 'Remove from saved jobs' : 'Save job'}
            aria-label={isSaved ? `Remove ${job.title} from saved jobs` : `Save ${job.title}`}
            className={`p-2 rounded-xl border transition-colors shrink-0 ${
              isSaved
                ? 'bg-[#FFF1E6] border-[#C2410C]/30 text-[#C2410C]'
                : 'bg-white border-[#E8DFD4] text-[#5C564E] hover:text-[#C2410C] hover:bg-[#FAF6F1]'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-[#C2410C]' : ''}`} />
          </button>
        </div>

        {/* Badges / Meta */}
        <div className="flex flex-wrap items-center gap-2 mb-4 text-xs">
          <span className="inline-flex items-center gap-1 bg-[#FAF6F1] border border-[#E8DFD4] px-2.5 py-1 rounded-lg font-medium text-[#5C564E]">
            <MapPin className="w-3.5 h-3.5" />
            {job.location}
          </span>
          <span className="inline-flex items-center gap-1 bg-[#FFF1E6] text-[#C2410C] border border-[#C2410C]/20 px-2.5 py-1 rounded-lg font-semibold">
            {job.workMode}
          </span>
          <span className="inline-flex items-center gap-1 bg-[#FAF6F1] border border-[#E8DFD4] px-2.5 py-1 rounded-lg font-medium text-[#5C564E]">
            <Briefcase className="w-3.5 h-3.5" />
            {job.employmentType}
          </span>
          {job.salary && job.salary !== 'Competitive' && (
            <span className="inline-flex items-center bg-[#F0FDF4] text-[#16A34A] border border-[#16A34A]/20 px-2.5 py-1 rounded-lg font-semibold">
              {formatSalaryDisplay(job.salary)}
            </span>
          )}
        </div>

        {/* Skills */}
        {job.skills && job.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {job.skills.slice(0, 4).map((skill, index) => (
              <span
                key={index}
                className="text-[11px] font-medium bg-[#FAF6F1] border border-[#E8DFD4] text-[#1B1A17] px-2 py-0.5 rounded-md"
              >
                {skill}
              </span>
            ))}
            {job.skills.length > 4 && (
              <span className="text-[11px] font-medium text-[#5C564E] self-center">
                +{job.skills.length - 4} more
              </span>
            )}
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-[#E8DFD4] flex items-center justify-between text-xs text-[#5C564E]">
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {formatRelative(job.postedAt)}
        </span>

        <Link
          to={`/jobs/${job.id}`}
          className="inline-flex items-center gap-1 font-semibold text-[#C2410C] hover:underline transition-colors"
        >
          <span>View Details</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  );
};
