// ============================================================
// Clyptus Landing Page - Section Heading Component
// Eyebrow pill badge, Fraunces serif H2, and descriptive subtitle
// ============================================================

import React from 'react';

interface SectionHeadingProps {
  eyebrow: string;
  heading: string;
  subheading?: string;
  align?: 'left' | 'center';
  className?: string;
}

export const SectionHeading: React.FC<SectionHeadingProps> = ({
  eyebrow,
  heading,
  subheading,
  align = 'center',
  className = '',
}) => {
  const isCenter = align === 'center';

  return (
    <div
      className={`space-y-3 ${
        isCenter ? 'text-center mx-auto max-w-3xl' : 'text-left max-w-2xl'
      } ${className}`}
    >
      {/* Orange Pill Eyebrow */}
      <div className={`inline-flex items-center ${isCenter ? 'justify-center' : ''}`}>
        <span className="px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-[#FCEFE6] text-[#E8630A] border border-[#E8630A]/20 shadow-xs">
          {eyebrow}
        </span>
      </div>

      {/* Main Serif Display Heading */}
      <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-editorial font-bold text-[#171614] leading-[1.18] tracking-tight">
        {heading}
      </h2>

      {/* Supportive Subtitle */}
      {subheading && (
        <p className="text-base sm:text-lg text-[#62564E] leading-relaxed pt-1">
          {subheading}
        </p>
      )}
    </div>
  );
};
