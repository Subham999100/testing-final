import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Page, Table, Action, columns, reason, buttonClass } from '../../components/platform/OperationsUI';
import { usePermissions } from '../../hooks/usePermissions';
import {
  CreateOrganisationModal,
  CreateOrganisationFormData,
} from '../../features/platform/organisations/CreateOrganisationModal';
import { PlatformService } from '../../services/platform.service';

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
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const handleCreateOrganisation = async (formData: CreateOrganisationFormData) => {
    setIsSubmitting(true);
    try {
      await PlatformService.createOrganisation(formData);
      setCreateModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['platform'] });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Page title="Organizations" description="Manage organizations and their onboarding lifecycle.">
      <div className="flex items-center justify-between">
        {can('platform.organisations.create') && (
          <button
            type="button"
            className={buttonClass}
            onClick={() => setCreateModalOpen(true)}
          >
            Create organization
          </button>
        )}
      </div>

      {createModalOpen && (
        <CreateOrganisationModal
          isSubmitting={isSubmitting}
          onClose={() => setCreateModalOpen(false)}
          onSubmit={handleCreateOrganisation}
        />
      )}
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
          ...columns('status', 'contactEmail', 'tier'),
          {
            key: 'recruiters',
            render: (r: any) => {
              const limit = r.recruiterLimit ?? r.maxRecruiters ?? 25;
              const used = r.recruitersUsed ?? 0;
              const available = r.recruitersAvailable ?? Math.max(0, limit - used);
              return (
                <span className="font-mono text-xs">
                  {used} / {limit} ({available} avail)
                </span>
              );
            },
          },
          ...columns('membersCount'),
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
