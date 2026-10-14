// ============================================================
// Clyptus Job Portal - Candidate Portal
// Page: NotificationsPage (/candidate/notifications)
// Full notification center with filter tabs, mark read, and direct links
// ============================================================

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, Briefcase, Video, Sparkles, Info, ExternalLink, ArrowRight } from 'lucide-react';
import { candidateApi } from '../../lib/api';
import { candidateQueryKeys } from '../../lib/queryKeys';
import { CandidateNotification } from '../../lib/types';
import { toast } from '@/portals/org/ui/toast';

export const NotificationsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'APPLICATIONS'>('ALL');

  const { data: notifications = [], isLoading } = useQuery<CandidateNotification[]>({
    queryKey: candidateQueryKeys.notifications,
    queryFn: () => candidateApi.getNotifications(),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => candidateApi.markNotificationRead(id),
    onSuccess: (updated) => {
      queryClient.setQueryData(candidateQueryKeys.notifications, updated);
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => candidateApi.markAllNotificationsRead(),
    onSuccess: (updated) => {
      queryClient.setQueryData(candidateQueryKeys.notifications, updated);
      toast.success('All notifications marked as read.');
    },
  });

  const filtered = notifications.filter((n) => {
    if (filter === 'UNREAD') return !n.read;
    if (filter === 'APPLICATIONS') return n.type === 'APPLICATION_STATUS';
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getIcon = (type: CandidateNotification['type']) => {
    switch (type) {
      case 'APPLICATION_STATUS':
        return <Briefcase className="w-4 h-4 text-[#C2410C]" />;
      case 'INTERVIEW_INVITE':
        return <Video className="w-4 h-4 text-[#16A34A]" />;
      case 'JOB_RECOMMENDATION':
        return <Sparkles className="w-4 h-4 text-[#D97706]" />;
      default:
        return <Info className="w-4 h-4 text-[#5C564E]" />;
    }
  };

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#1B1A17]">Notifications</h1>
          <p className="text-xs text-[#5C564E] mt-1">
            Stay updated on application progress, recruiter invitations, and recommended roles.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => markAllReadMutation.mutate()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#E8DFD4] hover:bg-[#FAF6F1] text-xs font-semibold text-[#1B1A17] transition-colors self-start sm:self-auto shadow-xs"
          >
            <CheckCheck className="w-3.5 h-3.5 text-[#C2410C]" />
            <span>Mark all as read</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E8DFD4] pb-2 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setFilter('ALL')}
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            filter === 'ALL'
              ? 'bg-[#C2410C] text-white'
              : 'text-[#5C564E] hover:text-[#1B1A17] hover:bg-white'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('UNREAD')}
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            filter === 'UNREAD'
              ? 'bg-[#C2410C] text-white'
              : 'text-[#5C564E] hover:text-[#1B1A17] hover:bg-white'
          }`}
        >
          Unread ({unreadCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter('APPLICATIONS')}
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            filter === 'APPLICATIONS'
              ? 'bg-[#C2410C] text-white'
              : 'text-[#5C564E] hover:text-[#1B1A17] hover:bg-white'
          }`}
        >
          Applications
        </button>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-2xl border border-[#E8DFD4] overflow-hidden shadow-xs divide-y divide-[#E8DFD4]/60">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-[#5C564E] animate-pulse">
            Loading notifications...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#FAF6F1] border border-[#E8DFD4] flex items-center justify-center mx-auto text-[#5C564E]">
              <Bell className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-[#1B1A17] font-serif">
              {filter === 'UNREAD' ? 'No unread notifications' : 'No notifications found'}
            </h3>
            <p className="text-xs text-[#5C564E] max-w-sm mx-auto">
              You are all caught up! Updates regarding your job applications and recruiter views will appear here.
            </p>
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                if (!item.read) markReadMutation.mutate(item.id);
              }}
              className={`p-4 sm:p-5 flex items-start justify-between gap-4 transition-colors hover:bg-[#FAF6F1]/50 ${
                !item.read ? 'bg-[#FFF1E6]/20' : ''
              }`}
            >
              <div className="flex items-start gap-3.5 flex-1 min-w-0">
                <div className="p-2.5 rounded-xl bg-[#FAF6F1] border border-[#E8DFD4] shrink-0 mt-0.5">
                  {getIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <h3 className={`text-xs sm:text-sm ${!item.read ? 'font-bold text-[#1B1A17]' : 'font-medium text-[#1B1A17]'}`}>
                      {item.title}
                    </h3>
                    <span className="text-[11px] text-[#5C564E]">
                      {formatDate(item.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-[#5C564E] mt-1 leading-relaxed">
                    {item.message}
                  </p>

                  {item.link && (
                    <Link
                      to={item.link}
                      className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-[#C2410C] hover:underline"
                    >
                      <span>View details</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>

              {!item.read && (
                <span className="w-2.5 h-2.5 rounded-full bg-[#C2410C] shrink-0 mt-2" title="Unread" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
export default NotificationsPage;
