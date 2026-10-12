// ============================================================
// Clyptus Job Portal - Candidate Portal
// Page: HomePage (Public Discovery Landing Page)
// ============================================================

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { candidateApi } from '../../lib/api';
import { candidateQueryKeys } from '../../lib/queryKeys';
import { CandidateJobListResult } from '../../lib/types';
import { JobCard } from '../../components/JobCard';
import { CompanyMonogram } from '../../components/CompanyMonogram';
import { Button, PageSkeleton } from '@/portals/org/ui/ui';
import {
  Search,
  MapPin,
  Briefcase,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Send,
  LineChart,
  Building2,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');
  const [workMode, setWorkMode] = useState('');

  // Fetch real published jobs
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: candidateQueryKeys.jobs.list({ limit: 50, sort: 'newest' }),
    queryFn: () => candidateApi.get<CandidateJobListResult>('/candidate/jobs', { limit: 50, sort: 'newest' }),
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (keyword.trim()) params.set('search', keyword.trim());
    if (location.trim()) params.set('location', location.trim());
    if (workMode) params.set('workMode', workMode);
    navigate(`/jobs?${params.toString()}`);
  };

  const allJobs = data?.items || [];

  // Derive unique skills from real jobs (top 8)
  const derivedSkills = Array.from(
    new Set(allJobs.flatMap((j) => j.skills || [])),
  ).slice(0, 8);

  // Derive top hiring companies from real jobs (open job count)
  const companyMap = new Map<string, { name: string; count: number; location: string }>();
  allJobs.forEach((job) => {
    const existing = companyMap.get(job.companyName) || {
      name: job.companyName,
      count: 0,
      location: job.location,
    };
    existing.count += 1;
    companyMap.set(job.companyName, existing);
  });
  const topCompanies = Array.from(companyMap.values());

  return (
    <div className="w-full">
      {/* 1. Hero Section */}
      <section className="relative bg-gradient-to-b from-white via-slate-50 to-slate-100 border-b border-slate-200 py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-xs font-semibold shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-orange-600" />
            <span>Direct Hiring from Verified Organizations</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Connect with verified roles that match your{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-amber-600">
              ambition
            </span>
          </h1>

          <p className="text-base sm:text-xl text-slate-600 max-w-2xl mx-auto">
            Discover verified tech, product, and enterprise opportunities. No ghost listings—apply directly and track every stage in real time.
          </p>

          {/* Hero Search Box */}
          <form
            onSubmit={handleSearchSubmit}
            className="bg-white p-3 sm:p-4 rounded-2xl shadow-lg border border-slate-200 max-w-4xl mx-auto flex flex-col md:flex-row gap-3 text-left"
          >
            <div className="flex-1 flex items-center gap-2.5 px-3 py-2 border border-slate-200 md:border-transparent rounded-xl focus-within:border-orange-500">
              <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Job title, keywords, or skills..."
                className="w-full text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
              />
            </div>

            <div className="h-px md:h-8 w-full md:w-px bg-slate-200 self-center" />

            <div className="flex-1 flex items-center gap-2.5 px-3 py-2 border border-slate-200 md:border-transparent rounded-xl focus-within:border-orange-500">
              <MapPin className="w-5 h-5 text-slate-400 flex-shrink-0" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, region, or 'Remote'..."
                className="w-full text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
              />
            </div>

            <div className="h-px md:h-8 w-full md:w-px bg-slate-200 self-center" />

            <div className="flex items-center px-3 py-2 border border-slate-200 md:border-transparent rounded-xl">
              <select
                value={workMode}
                onChange={(e) => setWorkMode(e.target.value)}
                className="w-full md:w-auto text-sm text-slate-700 bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="">Any Work Mode</option>
                <option value="REMOTE">Remote</option>
                <option value="HYBRID">Hybrid</option>
                <option value="ONSITE">On-site</option>
              </select>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="bg-orange-600 hover:bg-orange-700 text-white font-semibold px-6 py-3 rounded-xl shadow-sm text-sm"
            >
              Search Jobs
            </Button>
          </form>

          {/* Skill chips derived from real jobs */}
          {derivedSkills.length > 0 && (
            <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-700">Trending in demand:</span>
              {derivedSkills.map((skill) => (
                <button
                  key={skill}
                  onClick={() => navigate(`/jobs?search=${encodeURIComponent(skill)}`)}
                  className="px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-700 hover:border-orange-500 hover:text-orange-600 transition-colors shadow-2xs"
                >
                  {skill}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 2. Latest Jobs Section */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Featured & Recent Positions</h2>
            <p className="text-sm text-slate-500 mt-1">
              Active openings verified by our recruitment platform partners.
            </p>
          </div>
          <Link
            to="/jobs"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            <span>View All ({data?.total ?? 0})</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {isLoading ? (
          <div className="py-6">
            <PageSkeleton />
          </div>
        ) : isError ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-red-600 mx-auto" />
            <h3 className="font-bold text-base text-red-900">Failed to load open positions</h3>
            <p className="text-xs text-red-600">Please check your network connection and try again.</p>
            <Button variant="secondary" onClick={() => refetch()} className="text-xs">
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Retry
            </Button>
          </div>
        ) : allJobs.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500">
            <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-base font-semibold text-slate-800">No published roles found</p>
            <p className="text-xs text-slate-400 mt-1">Check back soon as hiring managers post new opportunities.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {allJobs.slice(0, 6).map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </section>

      {/* 3. Top Hiring Companies (Derived from real jobs) */}
      {topCompanies.length > 0 && (
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-8">
              <h2 className="text-2xl font-bold text-slate-900">Actively Hiring Organizations</h2>
              <p className="text-sm text-slate-500 mt-1">
                Verified employers currently reviewing applications on Clyptus.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {topCompanies.map((c) => (
                <div
                  key={c.name}
                  onClick={() => navigate(`/jobs?search=${encodeURIComponent(c.name)}`)}
                  className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4 hover:border-slate-300 hover:shadow-md transition-all cursor-pointer group"
                >
                  <CompanyMonogram name={c.name} size="lg" />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-base text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                      {c.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">{c.location}</p>
                    <span className="inline-block mt-2 text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                      {c.count} open {c.count === 1 ? 'position' : 'positions'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 4. How It Works */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">How Clyptus Works for Candidates</h2>
          <p className="text-sm text-slate-500 mt-2">
            A transparent and respectful recruitment experience designed for professionals.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-4 shadow-xs">
            <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center mx-auto font-bold text-lg">
              1
            </div>
            <h3 className="text-lg font-bold text-slate-900">Discover Verified Openings</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Every job is published directly by active hiring teams. Filter by work mode, location, and required technical skills.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-4 shadow-xs">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mx-auto font-bold text-lg">
              2
            </div>
            <h3 className="text-lg font-bold text-slate-900">Direct 1-Click Application</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Upload your resume once into your private candidate vault. Apply instantly without repetitive external questionnaires.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-4 shadow-xs">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mx-auto font-bold text-lg">
              3
            </div>
            <h3 className="text-lg font-bold text-slate-900">Live Stage Timeline</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Watch your application advance through Screening, Shortlisted, Interview, and Offer stages in your personal dashboard.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Recruiter CTA Band */}
      <section className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white py-14 px-4 sm:px-6 lg:px-8 border-t border-slate-800">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div className="space-y-2">
            <span className="text-xs uppercase font-bold tracking-wider text-orange-400">For Employers & Recruiters</span>
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Hiring top talent for your team?</h3>
            <p className="text-sm text-slate-300 max-w-xl">
              Post verified openings, manage pipelines with Kanban boards, and review candidate applications with built-in token credits.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/org/login"
              className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-sm transition-colors shadow-sm"
            >
              Recruiter Sign In
            </Link>
            <Link
              to="/apply"
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 transition-colors"
            >
              Register Organisation
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
