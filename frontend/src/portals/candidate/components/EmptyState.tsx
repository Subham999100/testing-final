// ============================================================
// Clyptus Job Portal - Candidate Portal (Design B)
// Component: EmptyState
// Unified empty state card with icon, message, and action CTA
// ============================================================

import React from 'react';
import { Plus } from 'lucide-react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-6 sm:p-8 text-center rounded-xl border border-dashed border-[#E8DFD4] bg-[#FAF6F1]/50 ${className}`}
    >
      {icon && <div className="text-[#5C564E] mb-3">{icon}</div>}
      <h3 className="text-sm font-semibold text-[#1B1A17] font-serif">{title}</h3>
      {description && <p className="text-xs text-[#5C564E] mt-1 max-w-sm">{description}</p>}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#C2410C] hover:bg-[#9A3412] shadow-xs transition-colors focus-visible:outline-2 focus-visible:outline-[#C2410C]"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
};
export default EmptyState;
