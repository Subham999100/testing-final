import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';
import {
  Page,
  Action,
  columns,
  reason,
  useResource,
  ErrorBox,
  Metrics,
  Table,
} from '../../components/platform/OperationsUI';

// ============================================================
// OrganisationDetails page
//
// Backend routes that EXIST for organisations:
//   GET    /platform/organisations/:id  → full org record
//   PATCH  /platform/organisations/:id  → update org
//   POST   /platform/organisations/:id/suspend
//   POST   /platform/organisations/:id/activate
//   DELETE /platform/organisations/:id
//
// Backend routes that DO NOT EXIST (never implemented):
//   GET /platform/organisations/:id/verification  → 404
//   GET /platform/organisations/:id/members       → 404
//   GET /platform/organisations/:id/activity      → 404
//   GET /platform/organisations/:id/jobs          → 404
//   GET /platform/organisations/:id/onboarding    → 404
//   GET /platform/organisations/:id/monitoring    → 404
//   POST /platform/organisations/:id/invitations  → 404
//   POST /platform/organisations/:id/deactivate   → 404
//   GET /platform/tokens/features                 → 404
//
// Fix: only call routes that exist. Show "not yet available"
// notices for sub-sections backed by missing endpoints.
// Note: "deactivate" maps to DELETE /platform/organisations/:id
//       which DOES exist, use it via the existing suspend flow.
// ============================================================

export function OrganisationDetails() {
  const { id } = useParams();
  const { hasPermission: can } = usePermissions();
  const q = useResource(`organisations/${id}`);

  if (q.isPending) return <p>Loading…</p>;
  if (q.isError) return <ErrorBox error={q.error} retry={() => q.refetch()} />;

  const org = q.data;

  return (
    <Page title={org.name} description={`${org.status} · ${org.contactEmail}`}>
      <Link to="/platform/organisations" className="text-action">
        ← Organizations
      </Link>

      {/* Actions: only use routes that actually exist */}
      <div className="flex flex-wrap gap-2">
        {can('platform.organisations.update') && (
          <Action
            title="Edit information"
            path={`organisations/${id}`}
            method="patch"
            fields={[
              { name: 'name', type: 'text', value: org.name, required: true },
              { name: 'contactEmail', type: 'email', value: org.contactEmail, required: true },
              { name: 'domain', type: 'text', value: org.domain ?? '' },
              { name: 'contactPhone', type: 'text', value: org.contactPhone ?? '' },
              { name: 'tier', type: 'text', value: org.tier },
              {
                name: 'recruiterLimit',
                type: 'number',
                value: org.recruiterLimit ?? org.maxRecruiters ?? 25,
                min: 1,
              },
            ]}
          />
        )}{' '}
        {can('platform.organisations.suspend') && org.status === 'ACTIVE' && (
          <Action
            title="Suspend"
            path={`organisations/${id}/suspend`}
            fields={[{ ...reason, minLength: 10 }]}
          />
        )}{' '}
        {can('platform.organisations.reactivate') && org.status === 'SUSPENDED' && (
          <Action title="Reactivate" path={`organisations/${id}/activate`} />
        )}
      </div>

      {/* Metrics from what the /organisations/:id endpoint actually returns */}
      <Metrics
        values={{
          members: org.membersCount ?? 0,
          recruiterLimit: org.recruiterLimit ?? org.maxRecruiters ?? 25,
          recruitersUsed: org.recruitersUsed ?? 0,
          available: org.recruitersAvailable ?? Math.max(0, (org.recruiterLimit ?? org.maxRecruiters ?? 25) - (org.recruitersUsed ?? 0)),
          ...(can('platform.tokens.read') && org.tokenBalance != null
            ? {
                tokenBalance:
                  typeof org.tokenBalance === 'object'
                    ? org.tokenBalance?.balance ?? 0
                    : org.tokenBalance,
              }
            : {}),
        }}
      />

      {/* Organisation details panel */}
      <div className="p-4 rounded-xl bg-surface border border-line text-sm space-y-2">
        <h2 className="font-semibold text-ink">Organisation information</h2>
        <div className="grid grid-cols-2 gap-2 text-muted">
          <span>Slug</span><span className="text-ink font-mono">{org.slug}</span>
          <span>Domain</span><span className="text-ink">{org.domain || '—'}</span>
          <span>Tier</span><span className="text-ink">{org.tier}</span>
          <span>Recruiter Limit</span><span className="text-ink">{org.recruiterLimit ?? org.maxRecruiters ?? 25}</span>
          <span>Recruiters Used</span><span className="text-ink">{org.recruitersUsed ?? 0}</span>
          <span>Recruiters Available</span><span className="text-ink">{org.recruitersAvailable ?? Math.max(0, (org.recruiterLimit ?? org.maxRecruiters ?? 25) - (org.recruitersUsed ?? 0))}</span>
          <span>Status</span><span className="text-ink">{org.status}</span>
          <span>Contact</span><span className="text-ink">{org.contactEmail}</span>
          {org.contactPhone && <><span>Phone</span><span className="text-ink">{org.contactPhone}</span></>}
        </div>
      </div>

      {/* Token transactions for this organisation — DOES exist via token-transactions?organisationId= */}
      {can('platform.tokens.read') && (
        <>
          <h2 className="font-semibold">Token ledger transactions</h2>
          <Table
            path="token-transactions"
            params={{ organisationId: id }}
            columns={columns('type', 'amount', 'balanceBefore', 'balanceAfter', 'reason', 'createdAt')}
            search={false}
          />
        </>
      )}

      {/* Audit activity for this org — use audit-logs filtered by org */}
      {can('platform.audit.read') && (
        <>
          <h2 className="font-semibold">Organisation audit trail</h2>
          <Table
            path="audit-logs"
            params={{ organisationId: id }}
            columns={columns('action', 'actorRole', 'createdAt')}
            search={false}
          />
        </>
      )}

      {/* Sub-routes that are NOT implemented in the backend */}
      <div className="p-4 border border-line rounded-xl text-xs text-muted space-y-1">
        <p className="font-semibold text-ink">Features not yet available for this organisation:</p>
        <ul className="list-disc pl-4 space-y-0.5">
          <li>Member list (<code>/organisations/:id/members</code> — not implemented)</li>
          <li>Verification history (<code>/organisations/:id/verification</code> — not implemented)</li>
          <li>Job listings (<code>/organisations/:id/jobs</code> — not implemented)</li>
          <li>Onboarding status (<code>/organisations/:id/onboarding</code> — not implemented)</li>
          <li>Recruitment monitoring (<code>/organisations/:id/monitoring</code> — not implemented)</li>
          <li>Organisation invitations (<code>/organisations/:id/invitations</code> — not implemented)</li>
          <li>Feature token usage (<code>/tokens/features</code> — not implemented)</li>
        </ul>
      </div>
    </Page>
  );
}
