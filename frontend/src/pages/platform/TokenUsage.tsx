import React from 'react';
import {
  Page,
  Action,
  columns,
  reason,
  Metrics,
  useResource,
  ErrorBox,
  Table,
} from '../../components/platform/OperationsUI';
import { usePermissions } from '../../hooks/usePermissions';

// ============================================================
// Token Operations page
//
// Backend token routes that ACTUALLY EXIST:
//   GET  /api/v1/platform/token-usage          → aggregate overview + topConsumingOrgs
//   GET  /api/v1/platform/token-transactions   → paginated ledger (all types)
//   POST /api/v1/platform/tokens/adjust        → ledger adjustment
//   PATCH /api/v1/platform/tokens/organisations/:orgId/limits → allocation limits
//
// Routes that DO NOT EXIST in the backend (never implemented):
//   GET /api/v1/platform/tokens/balances     ← was causing 404
//   GET /api/v1/platform/tokens/features     ← was causing 404
//   GET /api/v1/platform/tokens/discrepancies← was causing 404
//   GET /api/v1/platform/tokens/sales        ← was causing 404
//
// Fix: use token-usage for summary + top orgs; use token-transactions for ledger.
// Features, discrepancies, and sales sections render a "not yet available" notice.
// ============================================================

export function TokenUsage() {
  const { hasPermission: can } = usePermissions();

  // Aggregate platform token overview (exists: GET /platform/token-usage)
  const overview = useResource('token-usage');

  // Build metrics from the token-usage response
  function buildTokenMetrics(data: any): Record<string, number> {
    return {
      totalActiveTokens: data?.totalActiveTokens ?? 0,
      totalAllocated: data?.totalTokensAllocated ?? 0,
      totalConsumed: data?.totalTokensConsumed ?? 0,
      totalReserved: data?.totalTokensReserved ?? 0,
      ledgerTransactions: data?.totalLedgerTransactions ?? 0,
    };
  }

  return (
    <Page
      title="Token operations"
      description="Balances, consumption, allocation rules, and ledger reconciliation."
    >
      {/* ── Platform-wide token summary ── */}
      {overview.isError ? (
        <ErrorBox error={overview.error} retry={() => overview.refetch()} />
      ) : overview.data ? (
        <Metrics values={buildTokenMetrics(overview.data)} />
      ) : (
        <p className="text-muted text-sm">Loading token overview…</p>
      )}

      {/* ── Top consuming organisations (from token-usage) ── */}
      {overview.data?.topConsumingOrganisations?.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold">Top consuming organisations</h2>
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-sm text-left">
              <thead className="bg-surface text-muted">
                <tr>
                  <th className="p-3 font-medium">Organisation</th>
                  <th className="p-3 font-medium">Balance</th>
                  <th className="p-3 font-medium">Consumed</th>
                  <th className="p-3 font-medium">Allocated</th>
                  {can('platform.tokens.adjust') && <th className="p-3">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {overview.data.topConsumingOrganisations.map((row: any) => (
                  <tr key={row.organisationId} className="border-t border-line">
                    <td className="p-3">{row.organisationName}</td>
                    <td className="p-3 font-mono">{row.balance.toLocaleString()}</td>
                    <td className="p-3 font-mono">{row.consumedTokens.toLocaleString()}</td>
                    <td className="p-3 font-mono">{row.allocatedTokens.toLocaleString()}</td>
                    {can('platform.tokens.adjust') && (
                      <td className="p-3">
                        <div className="flex flex-wrap gap-2">
                          <Action
                            title="Adjust tokens"
                            path="tokens/adjust"
                            body={{ organisationId: row.organisationId }}
                            fields={[
                              {
                                name: 'type',
                                options: ['ADJUSTMENT', 'ALLOCATION', 'CONSUMPTION', 'EXPIRATION'],
                              },
                              {
                                name: 'amount',
                                label: 'Signed token amount (negative for debit)',
                                type: 'number',
                              },
                              reason,
                              { name: 'referenceId', required: false },
                            ]}
                          />
                          {can('platform.tokens.allocate') && (
                            <Action
                              title="Allocation rules"
                              path={`tokens/organisations/${row.organisationId}/limits`}
                              method="patch"
                              fields={[
                                { name: 'monthlyMaxAllocation', type: 'number', min: 0 },
                                { name: 'singleTxLimit', type: 'number', min: 0 },
                              ]}
                            />
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Full ledger (all transaction types) ── */}
      <h2 className="font-semibold">Ledger transactions</h2>
      <Table
        path="token-transactions"
        columns={columns('type', 'amount', 'balanceBefore', 'balanceAfter', 'reason', 'createdAt')}
        filters={{
          type: ['PURCHASE', 'ALLOCATION', 'ADJUSTMENT', 'CONSUMPTION', 'REFUND', 'EXPIRATION'],
        }}
        actions={(r) =>
          can('platform.tokens.adjust') ? (
            <Action
              title="Adjust"
              path="tokens/adjust"
              body={{ organisationId: r.organisationId }}
              fields={[
                {
                  name: 'type',
                  options: ['ADJUSTMENT', 'ALLOCATION', 'CONSUMPTION', 'EXPIRATION'],
                },
                {
                  name: 'amount',
                  label: 'Signed token amount (negative for debit)',
                  type: 'number',
                },
                reason,
                { name: 'referenceId', required: false },
              ]}
            />
          ) : null
        }
      />

      {/* ── Feature attribution — backend not yet implemented ── */}
      <h2 className="font-semibold">Usage by feature</h2>
      <p className="p-5 border border-warning bg-warning-soft rounded-xl text-sm">
        Feature attribution is not yet available. The backend does not currently store
        per-feature token consumption data.
      </p>
      <p className="text-xs text-muted">
        UNSPECIFIED means older ledger entries have no feature attribution.
      </p>

      {/* ── Reconciliation — backend not yet implemented ── */}
      <h2 className="font-semibold">Reconciliation</h2>
      <p className="text-sm text-muted">
        Compare stored balances with the sum of ledger transactions. Differences require
        investigation; this view never rewrites balances.
      </p>
      <p className="p-5 border border-warning bg-warning-soft rounded-xl text-sm">
        Automated reconciliation reporting is not yet available. Use the ledger table above to
        manually audit transactions.
      </p>

      {/* ── Token purchases (PURCHASE type transactions only) ── */}
      {can('platform.tokens.sales.read') && (
        <>
          <h2 className="font-semibold">Verified token purchases</h2>
          <Table
            path="token-transactions"
            params={{ type: 'PURCHASE' }}
            columns={columns('referenceId', 'amount', 'balanceBefore', 'balanceAfter', 'createdAt')}
            search={false}
          />
        </>
      )}
    </Page>
  );
}
