// ============================================================
// Platform Super Admin — Users (Organisation Super Admins)
// Lists organisation super administrators and enables transferring
// credentials while preserving the underlying user, organisation,
// and all tenant-owned data.
// ============================================================

import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Page, Table } from '../../components/platform/OperationsUI';
import { TransferSuperAdminModal } from '../../features/platform/users/TransferSuperAdminModal';
import { PlatformService } from '../../services/platform.service';

export function Users() {
  const [selectedOrg, setSelectedOrg] = useState<any | null>(null);
  const queryClient = useQueryClient();

  const handleTransfer = async (
    orgId: string,
    payload: { newEmail: string; newPassword: string; confirmPassword: string },
  ) => {
    return PlatformService.transferSuperAdmin(orgId, payload);
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['platform'] });
  };

  return (
    <Page
      title="Organisation Super Admins"
      description="Manage and transfer login credentials for Organisation Super Administrators across all organisations."
    >
      <Table
        path="organisations"
        columns={[
          {
            key: 'name',
            title: 'Organisation',
            render: (r: any) => (
              <span className="font-semibold text-slate-900">{r.name}</span>
            ),
          },
          {
            key: 'superAdminEmail',
            title: 'Super Admin Email',
            render: (r: any) => (
              <span className="font-mono text-xs text-slate-700">
                {r.superAdmin?.email || 'No Super Admin'}
              </span>
            ),
          },
          {
            key: 'status',
            title: 'Status',
            render: (r: any) => {
              const active = r.superAdmin ? r.superAdmin.isActive : r.status === 'ACTIVE';
              return (
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    active
                      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {active ? 'Active' : 'Inactive'}
                </span>
              );
            },
          },
        ]}
        actions={(r: any) => (
          <button
            type="button"
            className="button button-secondary button-small"
            onClick={() => setSelectedOrg(r)}
            disabled={!r.superAdmin}
            title={!r.superAdmin ? 'No Organisation Super Admin configured' : undefined}
          >
            Transfer
          </button>
        )}
      />

      {selectedOrg && (
        <TransferSuperAdminModal
          organisation={selectedOrg}
          onClose={() => setSelectedOrg(null)}
          onSuccess={handleSuccess}
          onSubmitTransfer={handleTransfer}
        />
      )}
    </Page>
  );
}

export default Users;
