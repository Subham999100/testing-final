// ============================================================
// Clyptus Job Portal - Shared Platform Header
// Reusable by both Platform Super Admin and Platform Admin.
// ============================================================

import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, Search, Bell, Shield } from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';
import { useResource } from '../../components/platform/OperationsUI';

export const PlatformHeader: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const notifications = useResource(
    'notifications',
    { limit: 1 },
    hasPermission('platform.notifications.read'),
    5000,
  );
  const notificationsCount = notifications.data?.unread || 0;
  const [searchQuery, setSearchQuery] = useState('');

  // Breadcrumbs builder
  const pathSnippets = location.pathname.split('/').filter((i) => i);
  const breadcrumbItems = pathSnippets.map((snippet, index) => {
    const url = `/${pathSnippets.slice(0, index + 1).join('/')}`;
    const formatted = snippet.charAt(0).toUpperCase() + snippet.slice(1).replace(/-/g, ' ');
    return { name: formatted, url };
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/platform/organisations?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="platform-header">
      {/* Breadcrumbs */}
      <div className="breadcrumbs">
        {breadcrumbItems.map((b, i) => (
          <React.Fragment key={b.url}>
            {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted shrink-0" />}
            <span
              className={`${
                i === breadcrumbItems.length - 1
                  ? 'text-action font-semibold'
                  : 'hover:text-ink'
              }`}
            >
              {b.name}
            </span>
          </React.Fragment>
        ))}
      </div>

      {/* Search & Actions */}
      <div className="flex items-center gap-4 shrink-0">
        <form onSubmit={handleSearchSubmit} className="relative hidden lg:block w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            aria-label={location.pathname.includes('/monitoring') ? 'Search operations' : 'Search organizations'}
            placeholder={location.pathname.includes('/monitoring') ? 'Search operations…' : 'Search organizations…'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-surface border border-line-strong rounded-lg text-xs text-ink placeholder-muted focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all"
          />
        </form>

        {/* Notifications */}
        <button
          disabled={!hasPermission('platform.notifications.read')}
          onClick={() => navigate('/platform/notifications')}
          className="relative p-2 text-muted hover:text-ink hover:bg-soft rounded-lg transition-colors"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          {notificationsCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-action text-[10px] font-bold text-on-action rounded-full flex items-center justify-center">
              {notificationsCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
