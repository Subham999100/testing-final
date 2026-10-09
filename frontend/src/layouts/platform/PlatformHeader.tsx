// ============================================================
// Clyptus Job Portal - Shared Platform Header
// Reusable by both Platform Super Admin and Platform Admin.
// ============================================================

import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, Bell, Shield } from 'lucide-react';
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

  // Breadcrumbs builder
  const pathSnippets = location.pathname.split('/').filter((i) => i);
  const breadcrumbSnippets =
    pathSnippets[0] === 'platform' &&
    pathSnippets[1] === 'organisations' &&
    pathSnippets.length === 3
      ? pathSnippets.slice(0, 2)
      : pathSnippets;
  const breadcrumbItems = breadcrumbSnippets.map((snippet, index) => {
    const url = `/${pathSnippets.slice(0, index + 1).join('/')}`;
    const formatted = snippet.charAt(0).toUpperCase() + snippet.slice(1).replace(/-/g, ' ');
    return { name: formatted, url };
  });

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
