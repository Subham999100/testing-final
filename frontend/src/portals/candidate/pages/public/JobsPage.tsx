// ============================================================
// Clyptus Job Portal - Candidate Portal
// Page: JobsPage (Search, Multi-Facet Filters, Pagination)
// ============================================================

import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { candidateApi } from '../../lib/api';
import { candidateQueryKeys } from '../../lib/queryKeys';
import { CandidateJobListResult } from '../../lib/types';
import { JobCard } from '../../components/JobCard';
import { JobFilters } from '../../components/JobFilters';
import { Button, PageSkeleton } from '@/portals/org/ui/ui';
import {
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
  AlertTriangle,
} from 'lucide-react';

export const JobsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Extract query parameters from URL
  const search = searchParams.get('search') || '';
  const location = searchParams.get('location') || '';
  const workMode = searchParams.get('workMode') || '';
  const employmentType = searchParams.get('employmentType') || '';
  const sort = searchParams.get('sort') || 'newest';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = 10;

  // Sync state changes with URL query parameters
  const updateParams = (newParams: Record<string, string | number | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([k, v]) => {
      if (v === null || v === '' || v === undefined) {
        next.delete(k);
      } else {
        next.set(k, String(v));
      }
    });
    // Reset to page 1 on filter changes unless page was explicitly set
    if (!('page' in newParams)) {
      next.delete('page');
    }
    setSearchParams(next, { replace: true });
  };

  const handleClearFilters = () => {
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  // Fetch jobs with active query params
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: candidateQueryKeys.jobs.list({
      search,
      location,
      workMode,
      employmentType,
      page,
      limit,
    }),
    queryFn: () =>
      candidateApi.get<CandidateJobListResult>('/candidate/jobs', {
        search: search || undefined,
        location: location || undefined,
        workMode: workMode || undefined,
        employmentType: employmentType || undefined,
        sort: (sort as any) || 'newest',
        page,
        limit,
      }),
  });

  const jobs = data?.items || [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages || 1;

  const hasActiveFilters = Boolean(search || location || workMode || employmentType || sort !== 'newest');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 flex flex-col">
      {/* Page Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Explore Careers
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isLoading ? 'Searching live listings...' : `Showing ${jobs.length} of ${total} verified positions`}
          </p>
        </div>

        {/* Mobile filter toggle button */}
        <div className="lg:hidden flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
            className="flex items-center gap-1.5 text-xs"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-orange-600" />
            <span>Filters {hasActiveFilters && '(Active)'}</span>
          </Button>
        </div>
      </div>

      {/* Active filter chips strip */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 mb-6 text-xs">
          <span className="font-semibold text-slate-500 mr-1">Active filters:</span>
          {search && (
            <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 px-2.5 py-1 rounded-full border border-slate-200">
              Keyword: "{search}"
              <X className="w-3 h-3 cursor-pointer text-slate-500 hover:text-slate-800" onClick={() => updateParams({ search: null })} />
            </span>
          )}
          {location && (
            <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 px-2.5 py-1 rounded-full border border-slate-200">
              Location: "{location}"
              <X className="w-3 h-3 cursor-pointer text-slate-500 hover:text-slate-800" onClick={() => updateParams({ location: null })} />
            </span>
          )}
          {workMode && (
            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 px-2.5 py-1 rounded-full border border-blue-200">
              Mode: {workMode}
              <X className="w-3 h-3 cursor-pointer text-blue-500 hover:text-blue-800" onClick={() => updateParams({ workMode: null })} />
            </span>
          )}
          {employmentType && (
            <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-800 px-2.5 py-1 rounded-full border border-orange-200">
              Type: {employmentType}
              <X className="w-3 h-3 cursor-pointer text-orange-500 hover:text-orange-800" onClick={() => updateParams({ employmentType: null })} />
            </span>
          )}
          <button
            onClick={handleClearFilters}
            className="text-orange-600 hover:text-orange-700 font-semibold underline ml-2"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Main Grid: Sidebar Filters + Jobs Catalog */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Desktop Filter Sidebar */}
        <div className="hidden lg:block lg:col-span-1 sticky top-24">
          <JobFilters
            search={search}
            location={location}
            workMode={workMode}
            employmentType={employmentType}
            sort={sort}
            onSearchChange={(v) => updateParams({ search: v })}
            onLocationChange={(v) => updateParams({ location: v })}
            onWorkModeChange={(v) => updateParams({ workMode: v })}
            onEmploymentTypeChange={(v) => updateParams({ employmentType: v })}
            onSortChange={(v) => updateParams({ sort: v })}
            onClearFilters={handleClearFilters}
          />
        </div>

        {/* Mobile Filter Drawer */}
        {mobileFiltersOpen && (
          <div className="lg:hidden col-span-1 mb-4">
            <JobFilters
              search={search}
              location={location}
              workMode={workMode}
              employmentType={employmentType}
              sort={sort}
              onSearchChange={(v) => updateParams({ search: v })}
              onLocationChange={(v) => updateParams({ location: v })}
              onWorkModeChange={(v) => updateParams({ workMode: v })}
              onEmploymentTypeChange={(v) => updateParams({ employmentType: v })}
              onSortChange={(v) => updateParams({ sort: v })}
              onClearFilters={handleClearFilters}
            />
          </div>
        )}

        {/* Jobs List Content */}
        <div className="lg:col-span-3 space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              <PageSkeleton />
            </div>
          ) : isError ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center space-y-3">
              <AlertTriangle className="w-8 h-8 text-red-600 mx-auto" />
              <h3 className="font-bold text-base text-red-900">Failed to load job listings</h3>
              <p className="text-xs text-red-600">Please check your network connection and try again.</p>
              <Button variant="secondary" onClick={() => refetch()} className="text-xs">
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Retry
              </Button>
            </div>
          ) : jobs.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-4">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">No positions match your criteria</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">
                Try loosening your search filters, checking for spelling variations, or clearing active keyword tags.
              </p>
              {hasActiveFilters && (
                <Button variant="primary" onClick={handleClearFilters} className="text-xs bg-orange-600">
                  Reset Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {jobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="pt-8 border-t border-slate-200 flex items-center justify-between">
                  <p className="text-xs text-slate-500">
                    Page <span className="font-bold text-slate-800">{page}</span> of{' '}
                    <span className="font-bold text-slate-800">{totalPages}</span>
                  </p>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      disabled={page <= 1}
                      onClick={() => updateParams({ page: Math.max(1, page - 1) })}
                      className="text-xs flex items-center gap-1"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      Previous
                    </Button>

                    <Button
                      variant="secondary"
                      disabled={page >= totalPages}
                      onClick={() => updateParams({ page: Math.min(totalPages, page + 1) })}
                      className="text-xs flex items-center gap-1"
                    >
                      Next
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
