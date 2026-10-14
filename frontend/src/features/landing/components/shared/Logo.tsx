// ============================================================
// Clyptus Landing Page - Logo Component
// Renders the signature swirl emblem and warm editorial wordmark.
// ============================================================

import React from 'react';
import { Link } from 'react-router-dom';

interface LogoProps {
  className?: string;
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  variant = 'light',
  size = 'md',
}) => {
  const isDark = variant === 'dark';

  const markSize = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-11 h-11' : 'w-9 h-9';
  const textSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl';

  return (
    <Link
      to="/"
      className={`inline-flex items-center gap-2.5 group text-decoration-none select-none ${className}`}
      aria-label="Clyptus Careers Home"
    >
      {/* Signature Swirl / Dynamic Curve Emblem */}
      <div
        className={`${markSize} rounded-xl bg-gradient-to-br from-[#E8630A] to-[#D97706] flex items-center justify-center text-white shadow-sm transition-transform duration-200 group-hover:scale-105 shrink-0`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5 text-white"
          aria-hidden="true"
        >
          {/* Stylized geometric swirl */}
          <path
            d="M12 2C6.48 2 2 6.48 2 12C2 16.5 4.98 20.3 9.08 21.57C8.75 20.5 8.5 19.3 8.5 18C8.5 13.5 12 10.5 16 10.5C17.5 10.5 18.9 10.9 20 11.64C21.25 8.9 20.8 5.6 18.7 3.5C16.8 1.6 14.4 2 12 2Z"
            fill="currentColor"
            fillOpacity="0.9"
          />
          <path
            d="M12 22C17.52 22 22 17.52 22 12C22 10.7 21.75 9.46 21.3 8.33C20.2 9.5 18.2 10.5 16 10.5C12 10.5 8.5 13.5 8.5 18C8.5 19.4 8.9 20.8 9.5 22H12Z"
            fill="#FFF"
            fillOpacity="0.9"
          />
        </svg>
      </div>

      <div className="flex flex-col leading-none">
        <span
          className={`font-editorial font-extrabold tracking-tight transition-colors duration-150 ${textSize} ${
            isDark ? 'text-white' : 'text-[#171614] group-hover:text-[#E8630A]'
          }`}
        >
          Clyptus
        </span>
        <span
          className={`text-[10px] uppercase font-bold tracking-widest mt-0.5 ${
            isDark ? 'text-[#D7C7B8]' : 'text-[#E8630A]'
          }`}
        >
          Careers
        </span>
      </div>
    </Link>
  );
};
