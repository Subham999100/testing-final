// ============================================================
// Clyptus Job Portal - Shared Organisation Filters
// ============================================================

import React from 'react';
import { Search, Filter } from 'lucide-react';

interface Props {
  search: string;
  statusFilter: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (status: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
}

export const OrganisationFilters: React.FC<Props> = ({
  search,
  statusFilter,
  onSearchChange,
  onStatusChange,
  onSearchSubmit,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
      <form onSubmit={onSearchSubmit} className="relative flex-1">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Search by organisation name, slug, domain, or email..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-slate-800/80 border border-slate-700/60 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
      </form>

      <div className="flex items-center gap-2">
        <Filter className="w-3.5 h-3.5 text-slate-500" />
        <span className="text-xs text-slate-400 font-medium">Status:</span>
        <select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
          className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="PENDING_VERIFICATION">Pending Verification</option>
        </select>
      </div>
    </div>
  );
};
