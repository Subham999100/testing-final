// ============================================================
// Clyptus Job Portal - Candidate Portal (Design B)
// Component: StrengthRing
// Accessible animated SVG ring with role="progressbar", aria-label and aria-live="polite"
// ============================================================

import React, { useEffect, useState } from 'react';

export interface StrengthRingProps {
  score: number; // 0 - 100
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export const StrengthRing: React.FC<StrengthRingProps> = ({
  score,
  size = 120,
  strokeWidth = 10,
  className = '',
}) => {
  const [animatedScore, setAnimatedScore] = useState(0);

  const clampedScore = Math.min(100, Math.max(0, Math.round(score)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clampedScore / 100) * circumference;

  useEffect(() => {
    // Animate smoothly to target score
    const timer = setTimeout(() => {
      setAnimatedScore(clampedScore);
    }, 50);
    return () => clearTimeout(timer);
  }, [clampedScore]);

  // Determine accent color by tier
  const strokeColor =
    clampedScore >= 80
      ? '#16A34A' // Green complete
      : clampedScore >= 50
      ? '#C2410C' // Design B Accent orange
      : '#D97706'; // Amber in progress

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      role="progressbar"
      aria-valuenow={clampedScore}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Profile strength ${clampedScore} percent`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
        aria-hidden="true"
      >
        {/* Track circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E8DFD4"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Animated Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (animatedScore / 100) * circumference}
          strokeLinecap="round"
          fill="none"
          style={{
            transition: 'stroke-dashoffset 800ms cubic-bezier(0.4, 0, 0.2, 1), stroke 400ms ease',
          }}
        />
      </svg>

      {/* Center percentage label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
        <span
          className="text-2xl font-bold text-[#1B1A17] font-serif tracking-tight"
          aria-live="polite"
        >
          {clampedScore}%
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5C564E] mt-0.5">
          Strength
        </span>
      </div>
    </div>
  );
};
export default StrengthRing;
