// ============================================================
// Clyptus Job Portal - Platform Super Admin
// Real-time Platform Notification Center
// Monitors administrative updates, tenant support tickets,
// token actions, and security governance events.
// ============================================================

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Info,
  CheckCheck,
  Search,
  Filter,
  Trash2,
  ExternalLink,
  LifeBuoy,
  Shield,
  Building,
  Sliders,
  Coins,
  RefreshCw,
} from 'lucide-react';
import { Page, ErrorBox } from '../../components/platform/OperationsUI';
import { PlatformService } from '../../services/platform.service';
import { PlatformNotificationItem } from '../../types/platform.types';

export function Notifications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Filters & State
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [unreadOnly, setUnreadOnly] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);

  // Fetch Notifications with 5-second real-time poll
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['platform-notifications', filterType, filterSeverity, unreadOnly, search, page],
    queryFn: () =>
      PlatformService.getNotifications({
        page,
        limit: 20,
        unread: unreadOnly ? 'true' : undefined,
        type: filterType !== 'all' ? filterType : undefined,
        severity: filterSeverity !== 'all' ? filterSeverity : undefined,
        search: search.trim() || undefined,
      }),
    refetchInterval: 5000, // Real-time 5s polling for Super Admin
  });

  const notifications: PlatformNotificationItem[] = data?.data || [];
  const meta = data?.meta || { total: 0, totalPages: 1, page: 1, limit: 20 };
  const unreadCount = data?.unread || 0;

  // Mark single as read mutation
  const markReadMutation = useMutation({
    mutationFn: (id: string) => PlatformService.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['platform'] });
    },
  });

  // Mark all as read mutation
  const markAllReadMutation = useMutation({
    mutationFn: () => PlatformService.markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['platform'] });
    },
  });

  // Delete notification mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => PlatformService.deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['platform'] });
    },
  });

  const handleNotificationClick = (item: PlatformNotificationItem) => {
    if (!item.readAt) {
      markReadMutation.mutate(item.id);
    }
    if (item.link) {
      navigate(item.link);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case 'URGENT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">
            <AlertOctagon className="w-3 h-3 text-rose-600" />
            URGENT
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            WARNING
          </span>
        );
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            SUCCESS
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-600 border border-blue-500/20">
            <Info className="w-3 h-3 text-blue-600" />
            INFO
          </span>
        );
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'TICKET_RAISED':
      case 'TICKET_UPDATED':
        return <LifeBuoy className="w-4 h-4 text-emerald-600" />;
      case 'ADMIN_ACTION':
        return <Shield className="w-4 h-4 text-purple-600" />;
      case 'SETTINGS_UPDATED':
        return <Sliders className="w-4 h-4 text-amber-600" />;
      case 'TOKEN_ADJUSTMENT':
        return <Coins className="w-4 h-4 text-blue-600" />;
      default:
        return <Bell className="w-4 h-4 text-action" />;
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <Page
      title="Platform Notifications"
      description="Live administrative event stream, ticket escalation alerts, and system-wide modifications."
    >
      {/* Top Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-surface border border-line rounded-xl p-4 shadow-xs">
          <div className="text-xs text-muted font-medium mb-1">Total Notifications</div>
          <div className="text-2xl font-bold text-ink">{meta.total}</div>
        </div>

        <div className="bg-surface border border-line rounded-xl p-4 shadow-xs">
          <div className="text-xs text-muted font-medium mb-1">Unread Alerts</div>
          <div className="text-2xl font-bold text-primary flex items-center gap-2">
            <span>{unreadCount}</span>
            {unreadCount > 0 && (
              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
            )}
          </div>
        </div>

        <div className="bg-surface border border-line rounded-xl p-4 shadow-xs">
          <div className="text-xs text-muted font-medium mb-1">Filter Priority</div>
          <div className="text-sm font-semibold text-ink capitalize mt-1">
            {filterSeverity === 'all' ? 'All Severities' : filterSeverity}
          </div>
        </div>

        <div className="bg-surface border border-line rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-muted font-medium">Real-Time Sync</div>
            <div className="text-xs font-semibold text-emerald-600 mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Live Connected
            </div>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 hover:bg-soft text-muted hover:text-ink rounded-lg transition-colors cursor-pointer"
            title="Refresh stream"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-primary' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-surface border border-line rounded-xl p-4 mb-6 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search & Tabs */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 bg-soft border border-line rounded-lg text-xs text-ink placeholder-muted focus:outline-hidden focus:border-brand"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1.5 bg-soft border border-line rounded-lg px-2.5 py-1.5">
            <Filter className="w-3.5 h-3.5 text-muted" />
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-xs font-semibold text-ink focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="TICKET_RAISED">Support Tickets Raised</option>
              <option value="TICKET_UPDATED">Support Replies</option>
              <option value="ADMIN_ACTION">Admin Actions</option>
              <option value="SETTINGS_UPDATED">Settings Changes</option>
              <option value="TOKEN_ADJUSTMENT">Token Transactions</option>
            </select>
          </div>

          {/* Severity Filter */}
          <div className="flex items-center gap-1.5 bg-soft border border-line rounded-lg px-2.5 py-1.5">
            <select
              value={filterSeverity}
              onChange={(e) => {
                setFilterSeverity(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-xs font-semibold text-ink focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Severities</option>
              <option value="URGENT">Urgent Only</option>
              <option value="WARNING">Warning</option>
              <option value="INFO">Info</option>
              <option value="SUCCESS">Success</option>
            </select>
          </div>

          {/* Unread Only Toggle */}
          <button
            onClick={() => {
              setUnreadOnly(!unreadOnly);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              unreadOnly
                ? 'bg-primary text-white border-primary'
                : 'bg-soft border-line text-ink hover:bg-line'
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={() => markAllReadMutation.mutate()}
            disabled={unreadCount === 0 || markAllReadMutation.isPending}
            className="px-3 py-1.5 bg-soft border border-line rounded-lg text-xs font-semibold text-ink hover:bg-line flex items-center gap-1.5 disabled:opacity-40 transition-colors cursor-pointer"
            title="Mark all notifications as read"
          >
            <CheckCheck className="w-3.5 h-3.5 text-muted" />
            <span>Mark All Read</span>
          </button>
        </div>
      </div>

      {/* Notifications List */}
      {isLoading ? (
        <div className="bg-surface border border-line rounded-xl p-12 text-center text-muted">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
          <p className="text-sm">Fetching real-time notifications...</p>
        </div>
      ) : isError ? (
        <ErrorBox error={error} retry={refetch} />
      ) : notifications.length === 0 ? (
        <div className="bg-surface border border-line rounded-xl p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-soft text-muted flex items-center justify-center mx-auto mb-3">
            <Bell className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-ink mb-1">No notifications found</h3>
          <p className="text-xs text-muted max-w-sm mx-auto">
            {unreadOnly
              ? 'You are all caught up! No unread notifications.'
              : 'No administrative events or organization tickets match your active filter.'}
          </p>
        </div>
      ) : (
        <div className="bg-surface border border-line rounded-xl divide-y divide-line overflow-hidden shadow-xs">
          {notifications.map((item) => {
            const isUnread = !item.readAt;
            return (
              <div
                key={item.id}
                className={`p-4 flex items-start justify-between gap-4 transition-colors hover:bg-soft/50 ${
                  isUnread ? 'bg-primary/5 dark:bg-primary/10' : ''
                }`}
              >
                {/* Left: Icon & Content */}
                <div
                  className="flex items-start gap-3.5 flex-1 cursor-pointer"
                  onClick={() => handleNotificationClick(item)}
                >
                  <div className="w-8 h-8 rounded-lg bg-soft border border-line flex items-center justify-center shrink-0 mt-0.5">
                    {getTypeIcon(item.type)}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {isUnread && (
                        <span className="w-2 h-2 rounded-full bg-primary shrink-0" title="Unread" />
                      )}
                      <span className="text-sm font-bold text-ink">{item.title}</span>
                      {getSeverityBadge(item.severity)}
                      <span className="text-[11px] text-muted font-medium">
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs text-muted leading-relaxed">{item.message}</p>

                    {item.link && (
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-action hover:underline pt-1">
                        <span>Open Details</span>
                        <ExternalLink className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {isUnread && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markReadMutation.mutate(item.id);
                      }}
                      className="p-1.5 hover:bg-soft text-muted hover:text-emerald-600 rounded-lg transition-colors cursor-pointer"
                      title="Mark as read"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteMutation.mutate(item.id);
                    }}
                    className="p-1.5 hover:bg-soft text-muted hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                    title="Delete notification"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Bar */}
      {meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-xs text-muted">
          <div>
            Showing {(meta.page - 1) * meta.limit + 1}–
            {Math.min(meta.page * meta.limit, meta.total)} of {meta.total}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 bg-soft border border-line rounded-lg font-semibold disabled:opacity-40 cursor-pointer"
            >
              Previous
            </button>
            <span className="font-semibold text-ink">
              Page {meta.page} of {meta.totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(meta.totalPages, page + 1))}
              disabled={page >= meta.totalPages}
              className="px-3 py-1.5 bg-soft border border-line rounded-lg font-semibold disabled:opacity-40 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </Page>
  );
}
