import React from 'react';
import { Page } from '../../components/platform/OperationsUI';

// ============================================================
// Notifications page
//
// The frontend calls GET /platform/notifications — this route
// does NOT exist in the backend. No notification system
// endpoint is implemented for the platform admin.
// ============================================================

export function Notifications() {
  return (
    <Page
      title="Notifications"
      description="Platform notification inbox is not yet available."
    >
      <div className="p-6 border border-warning bg-warning-soft rounded-xl text-sm space-y-3">
        <p className="font-semibold text-ink">
          Notification system not yet available.
        </p>
        <p className="text-muted">
          The backend does not expose a{' '}
          <code className="font-mono text-xs bg-soft px-1 py-0.5 rounded">
            /platform/notifications
          </code>{' '}
          route. Platform notification delivery has not been implemented in the current
          backend.
        </p>
        <p className="text-muted">
          For security alerts and incidents, see the <strong>Security</strong> page.
          For all platform activity, see <strong>Audit Logs</strong>.
        </p>
      </div>
    </Page>
  );
}
