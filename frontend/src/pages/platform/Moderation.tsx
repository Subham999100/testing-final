import React from 'react';
import { Page } from '../../components/platform/OperationsUI';

// ============================================================
// Moderation page
//
// The frontend calls:
//   GET /platform/moderation/jobs
//   GET /platform/moderation/history
//   POST /platform/moderation/jobs/:id/actions
//
// NONE of these routes exist in the backend.
// No moderation module is implemented.
// ============================================================

export function Moderation() {
  return (
    <Page
      title="Job moderation"
      description="Job moderation tools are not yet available."
    >
      <div className="p-6 border border-warning bg-warning-soft rounded-xl text-sm space-y-3">
        <p className="font-semibold text-ink">
          Job moderation endpoint not yet available.
        </p>
        <p className="text-muted">
          The backend does not expose{' '}
          <code className="font-mono text-xs bg-soft px-1 py-0.5 rounded">
            /platform/moderation/*
          </code>{' '}
          routes. Job moderation requires a dedicated backend module that has not been
          implemented in the current release.
        </p>
        <p className="text-muted">
          To review platform activity, use <strong>Audit Logs</strong>.
        </p>
      </div>
    </Page>
  );
}
