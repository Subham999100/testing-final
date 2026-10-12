// ============================================================
// Clyptus Job Portal - Candidate Portal
// Component: JobCard
// Accessible card representation for public job discovery
// ============================================================

import React from 'react';
import { Link } from 'react-router-dom';
import { CandidateJob } from '../lib/types';
import { formatRelative, formatSalaryDisplay } from '../lib/format';
import { CompanyMonogram } from './CompanyMonogram';
import { MapPin, Briefcase, IndianRupee, Clock, ArrowRight } from 'lucide-react';

interface JobCardProps {
  job: CandidateJob;
}

export const JobCard: React.FC<JobCardProps> = ({ job }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between group">
      <div>
        <div className="flex items-start gap-4 mb-4">
          <CompanyMonogram name={job.companyName} size="md" />
          <div className="min-w-0 flex-1">
            <Link
              to={`/jobs/${job.id}`}
              className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1 block"
            >
              {job.title}
            </Link>
            <p className="text-sm font-semibold text-slate-600 truncate mt-0.5">{job.companyName}</p>
          </div>
        </div>

        {/* Badges / Meta */}
        <div className="flex flex-wrap items-center gap-2 mb-4 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md font-medium">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            {job.location}
          </span>
          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-md font-semibold">
            {job.workMode}
          </span>
          <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md font-medium">
            <Briefcase className="w-3.5 h-3.5 text-slate-400" />
            {job.employmentType}
          </span>
          {job.salary && job.salary !== 'Competitive' && (
            <span className="inline-flex items-center bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-md font-semibold">
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
                className="text-[11px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded"
              >
                {skill}
              </span>
            ))}
            {job.skills.length > 4 && (
              <span className="text-[11px] font-medium text-slate-400 self-center">
                +{job.skills.length - 4} more
              </span>
            )}
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {formatRelative(job.postedAt)}
        </span>

        <Link
          to={`/jobs/${job.id}`}
          className="inline-flex items-center gap-1 font-semibold text-orange-600 group-hover:text-orange-700 transition-colors"
        >
          <span>View Details</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  );
};
