import React from 'react';
import { Page } from '../../components/platform/OperationsUI';

// ============================================================
// Support page
//
// The frontend calls GET /platform/support — this route
// does NOT exist in the backend. No support case management
// endpoint is implemented.
// ============================================================

export function Support() {
  return (
    <Page
      title="Support operations"
      description="Platform-level support case management is not yet available."
    >
      <div className="p-6 border border-warning bg-warning-soft rounded-xl text-sm space-y-3">
        <p className="font-semibold text-ink">
          Support operations endpoint not yet available.
        </p>
        <p className="text-muted">
          The backend does not expose a{' '}
          <code className="font-mono text-xs bg-soft px-1 py-0.5 rounded">
            /platform/support
          </code>{' '}
          route. Support case management has not been implemented in the current
          backend. This feature requires a dedicated backend module.
        </p>
        <p className="text-muted">
          For security incidents and anomalies, use the{' '}
          <strong>Security</strong> page. For platform activity history, use{' '}
          <strong>Audit Logs</strong>.
        </p>
      </div>
    </Page>
  );
}
