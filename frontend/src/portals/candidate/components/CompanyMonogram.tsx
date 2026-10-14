// ============================================================
// Clyptus Job Portal - Candidate Portal
// Component: CompanyMonogram
// Displays company initials monogram in an accessible avatar pill
// ============================================================

import React from 'react';
import { getCompanyInitials } from '../lib/format';

interface CompanyMonogramProps {
  name?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const CompanyMonogram: React.FC<CompanyMonogramProps> = ({
  name,
  size = 'md',
  className = '',
}) => {
  const initials = getCompanyInitials(name);

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-11 h-11 text-sm',
    lg: 'w-14 h-14 text-base font-bold',
    xl: 'w-16 h-16 text-lg font-bold',
  }[size];

  return (
    <div
      className={`inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 text-blue-700 font-bold select-none shadow-xs ${sizeClasses} ${className}`}
      aria-hidden="true"
      title={name || 'Company'}
    >
      {initials}
    </div>
  );
};
