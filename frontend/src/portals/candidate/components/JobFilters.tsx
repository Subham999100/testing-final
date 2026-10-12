// ============================================================
// Clyptus Job Portal - Candidate Portal
// Component: JobFilters
// Filter controls synced with URL search params
// ============================================================

import React from 'react';
import { Search, MapPin, X, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/portals/org/ui/ui';

interface JobFiltersProps {
  search: string;
  location: string;
  workMode: string;
  employmentType: string;
  sort: string;
  onSearchChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onWorkModeChange: (value: string) => void;
  onEmploymentTypeChange: (value: string) => void;
  onSortChange: (value: string) => void;
  onClearFilters: () => void;
}

export const JobFilters: React.FC<JobFiltersProps> = ({
  search,
  location,
  workMode,
  employmentType,
  sort,
  onSearchChange,
  onLocationChange,
  onWorkModeChange,
  onEmploymentTypeChange,
  onSortChange,
  onClearFilters,
}) => {
  const hasActiveFilters = Boolean(search || location || workMode || employmentType || sort !== 'newest');

  const workModes = [
    { label: 'All Modes', value: '' },
    { label: 'Remote', value: 'REMOTE' },
    { label: 'Hybrid', value: 'HYBRID' },
    { label: 'On-site', value: 'ONSITE' },
  ];

  const employmentTypes = [
    { label: 'All Types', value: '' },
    { label: 'Full-time', value: 'FULL_TIME' },
    { label: 'Contract', value: 'CONTRACT' },
    { label: 'Internship', value: 'INTERNSHIP' },
    { label: 'Part-time', value: 'PART_TIME' },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-orange-600" />
          Filter Positions
        </h3>

        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="text-xs font-semibold text-slate-500 hover:text-red-600 flex items-center gap-1 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Reset All
          </button>
        )}
      </div>

      {/* Keyword search input */}
      <div className="space-y-1">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Keywords or Skill</label>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="e.g. React, Cloud, Security..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
          />
        </div>
      </div>

      {/* Location search input */}
      <div className="space-y-1">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Location</label>
        <div className="relative">
          <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={location}
            onChange={(e) => onLocationChange(e.target.value)}
            placeholder="e.g. Bengaluru, Mumbai, Remote..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
          />
        </div>
      </div>

      {/* Work mode chips */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Work Mode</label>
        <div className="flex flex-wrap gap-1.5">
          {workModes.map((wm) => {
            const active = workMode === wm.value;
            return (
              <button
                key={wm.value}
                onClick={() => onWorkModeChange(wm.value)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors border ${
                  active
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {wm.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Employment type */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Employment Type</label>
        <div className="flex flex-wrap gap-1.5">
          {employmentTypes.map((et) => {
            const active = employmentType === et.value;
            return (
              <button
                key={et.value}
                onClick={() => onEmploymentTypeChange(et.value)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors border ${
                  active
                    ? 'bg-orange-600 text-white border-orange-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {et.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sort By */}
      <div className="space-y-1 pt-2 border-t border-slate-100">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Sort By</label>
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value)}
          className="w-full py-2 px-3 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 text-slate-700"
        >
          <option value="newest">Newest First</option>
          <option value="salary">Highest Salary</option>
        </select>
      </div>
    </div>
  );
};
