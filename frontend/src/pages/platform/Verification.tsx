import React from 'react';
import { Page } from '../../components/platform/OperationsUI';

// ============================================================
// Verification page
//
// The frontend calls GET /platform/verifications — this route
// does NOT exist in the backend. The backend manages
// verification state through the organisations endpoints:
//   GET /platform/organisations (filter by status)
//   PATCH /platform/organisations/:id  (update status)
//
// The dedicated /verifications endpoint was never implemented.
// Redirect users to Organisations filtered to pending states.
// ============================================================

export function Verification() {
  return (
    <Page
      title="Organisation verification"
      description="Approval queue for organisations pending verification. Use the Organisations page to review and action pending verifications."
    >
      <div className="p-6 border border-warning bg-warning-soft rounded-xl text-sm space-y-3">
        <p className="font-semibold text-ink">
          Verification queue not yet available as a standalone endpoint.
        </p>
        <p className="text-muted">
          The backend does not yet expose a dedicated{' '}
          <code className="font-mono text-xs bg-soft px-1 py-0.5 rounded">
            /platform/verifications
          </code>{' '}
          route. To manage organisation verifications, use the{' '}
          <strong>Organisations</strong> page and filter by status{' '}
          <em>PENDING_VERIFICATION</em>, <em>MORE_INFORMATION_REQUIRED</em>, or{' '}
          <em>REJECTED</em>.
        </p>
        <a
          href="/platform/organisations"
          className="inline-block px-4 py-2 bg-action text-on-action rounded-lg text-xs font-semibold"
        >
          Go to Organisations
        </a>
      </div>
    </Page>
  );
}
