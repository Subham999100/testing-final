// ============================================================
// Clyptus Landing Page - Skeleton Card Component
// Accessible placeholder skeleton for lazy-loaded below-the-fold sections.
// ============================================================

import React from 'react';

export const SkeletonCard: React.FC<{ className?: string; height?: string }> = ({
  className = '',
  height = 'h-72',
}) => {
  return (
    <div
      role="status"
      aria-label="Loading section content..."
      className={`w-full ${height} rounded-2xl border border-[#E5D9CF] bg-[#FFFDF9] p-6 flex flex-col justify-between animate-pulse ${className}`}
    >
      <div className="space-y-3">
        <div className="h-4 bg-[#E5D9CF]/60 rounded-md w-1/4" />
        <div className="h-6 bg-[#E5D9CF] rounded-md w-3/4" />
        <div className="h-4 bg-[#E5D9CF]/40 rounded-md w-1/2" />
      </div>
      <div className="space-y-2 pt-6">
        <div className="h-3 bg-[#E5D9CF]/40 rounded-md w-full" />
        <div className="h-3 bg-[#E5D9CF]/40 rounded-md w-4/5" />
      </div>
    </div>
  );
};
