// ============================================================
// Clyptus Job Portal - Shared Platform Portal Layout
// Single layout housing both Platform Super Admin & Platform Admin roles.
// ============================================================

import React from 'react';
import { Outlet } from 'react-router-dom';
import { PlatformSidebar } from './PlatformSidebar';
import { PlatformHeader } from './PlatformHeader';

export const PlatformLayout: React.FC = () => {
  return (
    <div className="flex h-screen w-full bg-[#080d1a] text-slate-100 overflow-hidden font-sans">
      {/* SHARED PLATFORM SIDEBAR (Permission-Filtered) */}
      <PlatformSidebar />

      {/* MAIN VIEWPORT */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* SHARED PLATFORM HEADER */}
        <PlatformHeader />

        {/* PAGE CONTENT CONTAINER */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#080d1a]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
