// ============================================================
// Clyptus Job Portal - Shared Platform Portal Layout
// Single layout housing both Platform Super Admin & Platform Admin roles.
// ============================================================

import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { PlatformSidebar } from './PlatformSidebar';
import { PlatformHeader } from './PlatformHeader';

// Keeps a crash inside one page instead of blanking the whole portal; resets on navigation (keyed by path).
class PageErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-sm font-semibold text-white">This page failed to load</p>
        <p className="text-xs text-slate-400 mt-1">Try again, or open another section from the sidebar.</p>
        <button
          onClick={() => this.setState({ failed: false })}
          className="mt-4 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700"
        >
          Try again
        </button>
      </div>
    );
  }
}

export const PlatformLayout: React.FC = () => {
  const { pathname } = useLocation();
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
          <PageErrorBoundary key={pathname}>
            <Outlet />
          </PageErrorBoundary>
        </main>
      </div>
    </div>
  );
};
