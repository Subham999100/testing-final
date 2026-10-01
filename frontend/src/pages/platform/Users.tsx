import React from 'react';
import { Page } from '../../components/platform/OperationsUI';

// ============================================================
// Users page
//
// The frontend calls GET /platform/users — this route
// does NOT exist in the backend. There is no platform-level
// user management endpoint. User accounts belong to
// organisations; platform admins are managed via /platform/admins.
// ============================================================

export function Users() {
  return (
    <Page
      title="User administration"
      description="Platform-level user administration is not yet available."
    >
      <div className="p-6 border border-warning bg-warning-soft rounded-xl text-sm space-y-3">
        <p className="font-semibold text-ink">
          User administration endpoint not yet available.
        </p>
        <p className="text-muted">
          The backend does not expose a{' '}
          <code className="font-mono text-xs bg-soft px-1 py-0.5 rounded">
            /platform/users
          </code>{' '}
          route. Platform administrator accounts are managed on the{' '}
          <strong>Platform Admins</strong> page. Organisation member accounts can be
          reviewed per-organisation via the <strong>Organisations</strong> detail view.
        </p>
        <div className="flex gap-3">
          <a
            href="/platform/admins"
            className="inline-block px-4 py-2 bg-action text-on-action rounded-lg text-xs font-semibold"
          >
            Platform Admins
          </a>
          <a
            href="/platform/organisations"
            className="inline-block px-4 py-2 border border-line text-ink rounded-lg text-xs font-semibold"
          >
            Organisations
          </a>
        </div>
      </div>
    </Page>
  );
}
