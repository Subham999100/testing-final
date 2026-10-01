// ============================================================
// Clyptus Job Portal - Shared Platform Portal Layout
// Single layout housing both Platform Super Admin & Platform Admin roles.
// ============================================================

import React, { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import { Outlet, useLocation } from 'react-router-dom';
import { PlatformSidebar } from './PlatformSidebar';
import { PlatformHeader } from './PlatformHeader';
import { ErrorBoundary } from '../../components/common/ErrorBoundary';

export const PlatformLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [menu, setMenu] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenu(false);
  }, [location.pathname]);
  return (
    <div className="platform-shell">
      {/* SHARED PLATFORM SIDEBAR (Permission-Filtered) */}
      <div className={`${menu ? 'flex' : 'hidden'} md:flex fixed md:static inset-y-0 left-0 z-40`}>
        <PlatformSidebar />
      </div>
      {menu && (
        <button
          aria-label="Close navigation"
          onClick={() => setMenu(false)}
          className="fixed md:hidden inset-0 bg-overlay z-30"
        />
      )}

      {/* MAIN VIEWPORT */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* SHARED PLATFORM HEADER */}
        <div className="platform-topbar">
          <button
            aria-label="Open navigation"
            onClick={() => setMenu(!menu)}
            className="md:hidden p-3"
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
          </button>
          <div className="flex-1 min-w-0">
            <PlatformHeader />
          </div>
        </div>

        {/* PAGE CONTENT CONTAINER */}
        <main className="platform-content">
          <ErrorBoundary>
            {children || <Outlet />}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};

