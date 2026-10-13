// ============================================================
// Clyptus Job Portal - Candidate Portal (Design B)
// Component: Chip
// Unified accessible chip for skills, locations, and preferences
// ============================================================

import React from 'react';
import { X } from 'lucide-react';

export interface ChipProps {
  label: string;
  onRemove?: () => void;
  removeAriaLabel?: string;
  variant?: 'default' | 'accent' | 'muted';
  className?: string;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  onRemove,
  removeAriaLabel,
  variant = 'default',
  className = '',
}) => {
  const variantStyles = {
    default: 'bg-[#FAF6F1] text-[#1B1A17] border-[#E8DFD4] hover:border-[#C2410C]/40',
    accent: 'bg-[#FFF1E6] text-[#C2410C] border-[#C2410C]/30',
    muted: 'bg-[#F2E9E0] text-[#5C564E] border-[#E8DFD4]',
  }[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${variantStyles} ${className}`}
    >
      <span className="truncate max-w-[200px]">{label}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={removeAriaLabel || `Remove ${label}`}
          className="p-0.5 rounded-full hover:bg-black/10 text-current focus-visible:outline-2 focus-visible:outline-[#C2410C] transition-colors"
        >
          <X className="w-3 h-3" aria-hidden="true" />
        </button>
      )}
    </span>
  );
};
export default Chip;
