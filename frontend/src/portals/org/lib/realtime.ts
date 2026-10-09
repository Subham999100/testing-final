// ============================================================
// Organisation portal — one socket per tab. Server events only carry
// ids; we invalidate the matching queries and TanStack refetches
// through the permission-checked API. No polling.
// ============================================================

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { qk } from './queryKeys';
import { getToken } from './session';

const EVENT_KEYS: Record<string, readonly (readonly unknown[])[]> = {
  'application.created': [qk.applications.all, qk.pipeline.all, qk.dashboard, qk.jobs.all],
  'application.stage_changed': [qk.applications.all, qk.pipeline.all, qk.dashboard, qk.candidates.all],
  'interview.updated': [qk.interviews.all, qk.applications.all, qk.dashboard],
  'offer.updated': [qk.offers.all, qk.applications.all, qk.dashboard],
  'job.updated': [qk.jobs.all, qk.dashboard],
  'token.balance_changed': [qk.tokens.all, qk.me, qk.dashboard],
  'payment.updated': [qk.billing.all, qk.dashboard],
  'notification.created': [qk.notifications.all, qk.me],
  'member.updated': [qk.members.all, qk.invitations.all, qk.dashboard],
  'me.updated': [qk.me],
  'task.updated': [qk.tasks.all, qk.dashboard],
  'message.created': [qk.messages.all],
};

function socketUrl() {
  const configured = import.meta.env.VITE_WS_URL as string | undefined;
  if (configured) return configured;
  return import.meta.env.DEV ? 'http://localhost:3000' : window.location.origin;
}

export function useRealtime(enabled: boolean) {
  const qc = useQueryClient();
  useEffect(() => {
    const token = getToken();
    if (!enabled || !token) return;
    const socket = io(`${socketUrl()}/org-realtime`, { auth: { token }, transports: ['websocket'], reconnectionDelayMax: 10_000 });
    Object.entries(EVENT_KEYS).forEach(([event, keys]) => {
      socket.on(event, () => keys.forEach((key) => qc.invalidateQueries({ queryKey: key as unknown[] })));
    });
    return () => {
      socket.disconnect();
    };
  }, [enabled, qc]);
}
