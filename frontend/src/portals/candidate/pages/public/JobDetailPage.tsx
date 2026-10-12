// ============================================================
// Clyptus Job Portal - Candidate Portal
// Page: JobDetailPage (Comprehensive Job Details & Apply Action)
// ============================================================

import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { candidateApi } from '../../lib/api';
import { candidateQueryKeys } from '../../lib/queryKeys';
import { CandidateJob } from '../../lib/types';
import { useCandidateAuth } from '../../lib/session';
import { CompanyMonogram } from '../../components/CompanyMonogram';
import { formatDate, formatRelative } from '../../lib/format';
import { Button, PageSkeleton } from '@/portals/org/ui/ui';
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  MapPin,
  Calendar,
  Users,
  CheckCircle2,
  Share2,
  Clock,
  Sparkles,
  Building2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

export const JobDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useCandidateAuth();

  const { data: job, isLoading, isError, refetch } = useQuery({
    queryKey: candidateQueryKeys.jobs.detail(id || ''),
    queryFn: () => candidateApi.get<CandidateJob>(`/candidate/jobs/${id}`),
    enabled: !!id,
  });

  const handleApplyClick = () => {
    if (!isAuthenticated) {
      navigate(`/login?next=/jobs/${id}`);
    } else {
      // In Phase 3, this opens the Quick-Apply modal. For Phase 2, placeholder feedback or navigate.
      navigate(`/login?next=/jobs/${id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        <PageSkeleton />
      </div>
    );
  }

  if (isError || !job) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-orange-500 mx-auto" />
        <h2 className="text-2xl font-bold text-slate-900">Position Not Found or Expired</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          The requested job posting may have been unlisted, closed by the hiring team, or does not exist.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button variant="secondary" onClick={() => refetch()} className="text-xs">
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Retry
          </Button>
          <Link to="/jobs">
            <Button variant="primary" className="text-xs bg-orange-600">
              Browse All Jobs
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isExpired = job.deadline ? new Date(job.deadline) < new Date() : false;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
      {/* Back breadcrumb */}
      <Link
        to="/jobs"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to all listings
      </Link>

      {/* Hero Banner Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex items-start gap-4 sm:gap-5">
            <CompanyMonogram name={job.companyName} size="xl" />
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {job.title}
              </h1>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-slate-700">{job.companyName}</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" /> Verified Partner
                </span>
              </div>
              <p className="text-xs text-slate-400">Posted {formatRelative(job.postedAt)}</p>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row md:flex-col items-stretch sm:items-center md:items-end gap-3 flex-shrink-0">
            {isExpired ? (
              <span className="px-4 py-2 bg-slate-100 text-slate-500 text-sm font-medium rounded-xl border border-slate-200 text-center">
                Applications Closed
              </span>
            ) : isAuthenticated ? (
              <Button
                variant="primary"
                onClick={handleApplyClick}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-8 py-3 rounded-xl shadow-sm text-sm"
              >
                Apply for this Position
              </Button>
            ) : (
              <Link to={`/login?next=/jobs/${job.id}`}>
                <Button
                  variant="primary"
                  className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-8 py-3 rounded-xl shadow-sm text-sm w-full"
                >
                  Sign In to Apply
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Highlight Meta Chips */}
        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-100 text-sm text-slate-700">
          <span className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg font-medium">
            <MapPin className="w-4 h-4 text-slate-400" />
            {job.location} ({job.workMode})
          </span>
          <span className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg font-medium">
            <Briefcase className="w-4 h-4 text-slate-400" />
            {job.employmentType}
          </span>
          {job.salary && job.salary !== 'Competitive' && (
            <span className="inline-flex items-center bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-lg font-bold">
              {job.salary}
            </span>
          )}
          {job.openings > 1 && (
            <span className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg font-medium text-xs">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              {job.openings} Openings
            </span>
          )}
          {job.deadline && (
            <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-lg font-medium text-xs">
              <Calendar className="w-3.5 h-3.5 text-amber-600" />
              Deadline: {formatDate(job.deadline)}
            </span>
          )}
        </div>
      </div>

      {/* Two Column Layout: Description & Company Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Main Details (2 cols) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-8 shadow-sm">
          {/* Skills Required */}
          {job.skills && job.skills.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-base font-bold text-slate-900">Required Skills & Expertise</h3>
              <div className="flex flex-wrap gap-2">
                {job.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-lg"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          <div className="space-y-3">
            <h3 className="text-base font-bold text-slate-900">About the Role</h3>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {job.description}
            </p>
          </div>

          {/* Responsibilities */}
          {job.responsibilities && job.responsibilities.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-base font-bold text-slate-900">Key Responsibilities</h3>
              <ul className="space-y-2">
                {job.responsibilities.map((resp, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-600 mt-2 flex-shrink-0" />
                    <span>{resp}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Requirements */}
          {job.requirements && job.requirements.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-base font-bold text-slate-900">Candidate Requirements</h3>
              <ul className="space-y-2">
                {job.requirements.map((req, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 flex-shrink-0" />
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Benefits */}
          {job.benefits && job.benefits.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-base font-bold text-slate-900">Perks & Benefits</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {job.benefits.map((benefit, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Apply bottom band */}
          <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-bold text-slate-900 text-sm">Ready to take the next step?</p>
              <p className="text-xs text-slate-500">Submit your application directly to the {job.companyName} hiring team.</p>
            </div>
            {isAuthenticated ? (
              <Button
                variant="primary"
                onClick={handleApplyClick}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm"
              >
                Apply Now
              </Button>
            ) : (
              <Link to={`/login?next=/jobs/${job.id}`}>
                <Button
                  variant="primary"
                  className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm"
                >
                  Sign In to Apply
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Sidebar: Company & Overview */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-base text-slate-900">Hiring Organization</h3>
            <div className="flex items-center gap-3">
              <CompanyMonogram name={job.companyName} size="lg" />
              <div>
                <p className="font-bold text-slate-900 text-sm">{job.companyName}</p>
                <p className="text-xs text-slate-500">{job.location}</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Verified corporate hiring partner on the Clyptus recruitment network.
            </p>
            <div className="pt-2 border-t border-slate-100">
              <Link
                to={`/jobs?search=${encodeURIComponent(job.companyName)}`}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <span>View all roles from {job.companyName}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Quick specs card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-3 text-xs">
            <h4 className="font-bold text-slate-900 text-sm mb-3">Position Overview</h4>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Employment Type</span>
              <span className="font-semibold text-slate-800">{job.employmentType}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Work Mode</span>
              <span className="font-semibold text-slate-800">{job.workMode}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Experience</span>
              <span className="font-semibold text-slate-800">{job.experience}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Department</span>
              <span className="font-semibold text-slate-800">{job.category || 'General'}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Openings</span>
              <span className="font-semibold text-slate-800">{job.openings}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
