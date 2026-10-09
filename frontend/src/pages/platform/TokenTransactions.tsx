import React from 'react';
import { Page, Table, columns } from '../../components/platform/OperationsUI';
export function TokenTransactions() {
  return (
    <Page
      title="Token transactions"
      description="Immutable ledger records. Purchases and refunds must originate from verified payment workflows."
    >
      <Table
        path="token-transactions"
        filters={{
          type: [
            'PURCHASE',
            'ALLOCATION',
            'ADJUSTMENT',
            'CONSUMPTION',
            'REFUND',
            'REVERSAL',
            'EXPIRATION',
          ],
        }}
        columns={columns(
          'organisation',
          'type',
          'amount',
          'balanceBefore',
          'balanceAfter',
          'referenceId',
          'reason',
          'createdAt',
        )}
      />
    </Page>
  );
}
