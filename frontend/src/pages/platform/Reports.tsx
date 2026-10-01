import React from 'react';
import { Page } from '../../components/platform/OperationsUI';

// ============================================================
// Reports page
//
// The frontend calls:
//   GET /platform/reports/organisations
//   GET /platform/reports/users
//   GET /platform/reports/tokens
//   GET /platform/reports/moderation
//   GET /platform/reports/recruitment
//   GET /platform/reports/{kind}/export
//
// NONE of these routes exist in the backend.
// No reports or export module is implemented.
//
// The existing data is already accessible via:
//   GET /platform/organisations     (organisation data)
//   GET /platform/token-transactions (ledger data)
//   GET /platform/audit-logs        (audit data)
//   GET /platform/analytics         (aggregated analytics)
// ============================================================

export function Reports() {
  return (
    <Page
      title="Reports and exports"
      description="Dedicated reports and export generation is not yet available."
    >
      <div className="p-6 border border-warning bg-warning-soft rounded-xl text-sm space-y-3">
        <p className="font-semibold text-ink">
          Reports and export endpoints not yet available.
        </p>
        <p className="text-muted">
          The backend does not expose{' '}
          <code className="font-mono text-xs bg-soft px-1 py-0.5 rounded">
            /platform/reports/*
          </code>{' '}
          routes. A dedicated reporting module has not been implemented.
        </p>
        <p className="text-muted">
          The following pages provide the underlying data currently available:
        </p>
        <ul className="list-disc pl-5 text-muted space-y-1">
          <li>
            <a href="/platform/organisations" className="text-action underline">
              Organisations
            </a>{' '}
            — organisation list and status
          </li>
          <li>
            <a href="/platform/token-transactions" className="text-action underline">
              Ledger Transactions
            </a>{' '}
            — token transaction history
          </li>
          <li>
            <a href="/platform/analytics" className="text-action underline">
              Analytics
            </a>{' '}
            — aggregated platform metrics
          </li>
          <li>
            <a href="/platform/audit-logs" className="text-action underline">
              Audit Logs
            </a>{' '}
            — full platform activity history
          </li>
        </ul>
      </div>
    </Page>
  );
}
