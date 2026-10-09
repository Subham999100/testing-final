// ============================================================
// Clyptus Job Portal - Shared Organisation Status Badge
// Reusable across all Platform views
// ============================================================

import React from 'react';
import { OrganisationStatus } from '../../../types/platform.types';

interface Props {
  status: OrganisationStatus;
}

export const OrganisationStatusBadge: React.FC<Props> = ({ status }) => {
  const getBadgeStyle = () => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'SUSPENDED':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'PENDING_VERIFICATION':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'ARCHIVED':
        return 'bg-slate-800 text-slate-400 border-slate-700';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getDotStyle = () => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-emerald-400';
      case 'SUSPENDED':
        return 'bg-rose-400';
      case 'PENDING_VERIFICATION':
        return 'bg-amber-400';
      default:
        return 'bg-slate-500';
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${getBadgeStyle()}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${getDotStyle()}`}></span>
      {status}
    </span>
  );
};
