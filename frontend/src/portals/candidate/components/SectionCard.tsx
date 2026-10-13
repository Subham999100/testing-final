// ============================================================
// Clyptus Job Portal - Candidate Portal (Design B)
// Component: SectionCard
// Standard card wrapper with serif heading, badge, and accessible Edit action
// ============================================================

import React from 'react';
import { Pencil } from 'lucide-react';

export interface SectionCardProps {
  title: string;
  count?: number;
  fromResume?: boolean;
  onEdit?: () => void;
  editAriaLabel?: string;
  actionButton?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const SectionCard: React.FC<SectionCardProps> = ({
  title,
  count,
  fromResume,
  onEdit,
  editAriaLabel,
  actionButton,
  children,
  className = '',
}) => {
  return (
    <section
      className={`bg-white rounded-2xl border border-[#E8DFD4] p-5 sm:p-6 shadow-xs transition-shadow hover:shadow-sm ${className}`}
      aria-labelledby={`section-heading-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="flex items-center justify-between gap-3 mb-4 sm:mb-5 pb-3 border-b border-[#E8DFD4]/60">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h2
            id={`section-heading-${title.toLowerCase().replace(/\s+/g, '-')}`}
            className="text-lg sm:text-xl font-semibold text-[#1B1A17] font-serif tracking-tight"
          >
            {title}
          </h2>

          {typeof count === 'number' && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#FAF6F1] text-[#5C564E] border border-[#E8DFD4]">
              {count}
            </span>
          )}

          {fromResume && (
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#FFF1E6] text-[#C2410C] border border-[#C2410C]/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C2410C] inline-block" />
              From resume - review
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {actionButton}
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              aria-label={editAriaLabel || `Edit ${title}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#1B1A17] hover:text-[#C2410C] hover:bg-[#FAF6F1] border border-[#E8DFD4] transition-colors focus-visible:outline-2 focus-visible:outline-[#C2410C]"
            >
              <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Edit</span>
            </button>
          )}
        </div>
      </div>

      <div className="text-[#1B1A17] text-sm leading-relaxed">{children}</div>
    </section>
  );
};
export default SectionCard;
