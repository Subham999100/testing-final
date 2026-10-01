import React from 'react';
import { Link } from 'react-router-dom';
import { Page, Table, Action, columns, reason } from '../../components/platform/OperationsUI';
import { usePermissions } from '../../hooks/usePermissions';
export const organisationStatuses = [
  'ACTIVE',
  'PENDING_VERIFICATION',
  'MORE_INFORMATION_REQUIRED',
  'REJECTED',
  'SUSPENDED',
  'ARCHIVED',
];
export function Organisations() {
  const { hasPermission: can } = usePermissions();
  return (
    <Page title="Organizations" description="Manage organizations and their onboarding lifecycle.">
      <div>
        {can('platform.organisations.create') && (
          <Action
            title="Create organization"
            path="organisations"
            fields={[
              { name: 'name' },
              { name: 'slug' },
              { name: 'contactEmail', type: 'email' },
              { name: 'domain', required: false },
              { name: 'industry', required: false },
              { name: 'tier', options: ['STANDARD', 'GROWTH', 'ENTERPRISE'] },
              ...(can('platform.tokens.allocate')
                ? [{ name: 'initialTokenAllocation', type: 'number', min: 0, value: 0 }]
                : []),
            ]}
          />
        )}
      </div>
      <Table
        path="organisations"
        filters={{ status: organisationStatuses, tier: ['STANDARD', 'GROWTH', 'ENTERPRISE'] }}
        columns={[
          {
            key: 'name',
            render: (r) => (
              <Link className="text-action underline" to={`/platform/organisations/${r.id}`}>
                {r.name}
              </Link>
            ),
          },
          ...columns('status', 'contactEmail', 'tier', 'membersCount'),
        ]}
        actions={(r) => (
          <>
            {can('platform.organisations.suspend') && r.status === 'ACTIVE' && (
              <Action
                title="Suspend"
                path={`organisations/${r.id}/suspend`}
                fields={[{ ...reason, minLength: 10 }]}
              />
            )}{' '}
            {can('platform.organisations.reactivate') && r.status === 'SUSPENDED' && (
              <Action title="Reactivate" path={`organisations/${r.id}/activate`} />
            )}
          </>
        )}
      />
    </Page>
  );
}
