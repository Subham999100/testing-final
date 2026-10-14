// ============================================================
// Clyptus Job Portal - Candidate Portal
// Component: NotificationPopover
// Bell icon with live unread badge, quick preview popover,
// mark as read, and link to NotificationsPage
// ============================================================

import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, CheckCheck, ExternalLink, Briefcase, Sparkles, Video, Info } from 'lucide-react';
import { candidateApi } from '../lib/api';
import { candidateQueryKeys } from '../lib/queryKeys';
import { CandidateNotification } from '../lib/types';

export const NotificationPopover: React.FC = () => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: notifications = [] } = useQuery<CandidateNotification[]>({
    queryKey: candidateQueryKeys.notifications,
    queryFn: () => candidateApi.getNotifications(),
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Mark single as read
  const markReadMutation = useMutation({
    mutationFn: (id: string) => candidateApi.markNotificationRead(id),
    onSuccess: (updated) => {
      queryClient.setQueryData(candidateQueryKeys.notifications, updated);
    },
  });

  // Mark all as read
  const markAllReadMutation = useMutation({
    mutationFn: () => candidateApi.markAllNotificationsRead(),
    onSuccess: (updated) => {
      queryClient.setQueryData(candidateQueryKeys.notifications, updated);
    },
  });

  // Close on outside click or Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const getIcon = (type: CandidateNotification['type']) => {
    switch (type) {
      case 'APPLICATION_STATUS':
        return <Briefcase className="w-3.5 h-3.5 text-[#C2410C]" />;
      case 'INTERVIEW_INVITE':
        return <Video className="w-3.5 h-3.5 text-[#16A34A]" />;
      case 'JOB_RECOMMENDATION':
        return <Sparkles className="w-3.5 h-3.5 text-[#D97706]" />;
      default:
        return <Info className="w-3.5 h-3.5 text-[#5C564E]" />;
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${Math.floor(diffHours / 24)}d ago`;
    } catch {
      return '';
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
        aria-expanded={isOpen}
        className="relative p-2 rounded-xl text-[#5C564E] hover:text-[#1B1A17] hover:bg-[#FAF6F1] transition-colors focus-visible:outline-2 focus-visible:outline-[#C2410C]"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#C2410C] text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-[#E8DFD4] shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="px-4 py-3 border-b border-[#E8DFD4] bg-[#FAF6F1] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-serif font-bold text-[#1B1A17]">Notifications</h4>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold text-[#C2410C] bg-[#FFF1E6] px-1.5 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllReadMutation.mutate()}
                className="text-[11px] font-semibold text-[#C2410C] hover:underline flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-[#E8DFD4]/50">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#5C564E]">
                <Bell className="w-6 h-6 text-[#D7C9BA] mx-auto mb-2" />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.slice(0, 5).map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    if (!n.read) markReadMutation.mutate(n.id);
                  }}
                  className={`p-3.5 hover:bg-[#FAF6F1]/60 transition-colors flex items-start gap-3 cursor-pointer ${
                    !n.read ? 'bg-[#FFF1E6]/20' : ''
                  }`}
                >
                  <div className="p-2 rounded-xl bg-white border border-[#E8DFD4] shrink-0 mt-0.5">
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={`text-xs truncate ${!n.read ? 'font-bold text-[#1B1A17]' : 'font-semibold text-[#5C564E]'}`}>
                        {n.title}
                      </p>
                      <span className="text-[10px] text-[#5C564E] shrink-0">
                        {formatRelativeTime(n.createdAt)}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#5C564E] line-clamp-2 mt-0.5 leading-relaxed">
                      {n.message}
                    </p>
                  </div>
                  {!n.read && (
                    <span className="w-2 h-2 rounded-full bg-[#C2410C] shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer Link */}
          <div className="px-4 py-2.5 border-t border-[#E8DFD4] bg-[#FAF6F1] text-center">
            <Link
              to="/candidate/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs font-semibold text-[#C2410C] hover:underline inline-flex items-center gap-1"
            >
              <span>View all notifications</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
export default NotificationPopover;
