import React, { useState } from 'react';
import { AnalyticsCharts } from '../../features/platform/analytics/AnalyticsCharts';
import {
  Page,
  Metrics,
  useResource,
  ErrorBox,
  inputClass,
} from '../../components/platform/OperationsUI';

// ============================================================
// Analytics page
//
// Backend returns (GET /api/v1/platform/analytics):
//   {
//     timeframe, statusDistribution, tierDistribution,
//     transactionVolumeByType, organisationGrowthTrend, aiExecutiveSummary
//   }
//
// There is NO .operations wrapper — the previous code crashed because
// it read q.data.operations.metrics which is always undefined.
// ============================================================

export function Analytics() {
  const [timeframe, setTimeframe] = useState('30d');
  const q = useResource('analytics', { timeframe });

  // Derive summary metrics from the flat backend payload
  function buildMetrics(data: any): Record<string, number> {
    const totalOrgs = (data.statusDistribution ?? []).reduce(
      (acc: number, s: any) => acc + (s.count ?? 0),
      0,
    );
    const tiers = (data.tierDistribution ?? []).length;
    const totalTokenVolume = (data.transactionVolumeByType ?? []).reduce(
      (acc: number, t: any) => acc + (t.totalTokens ?? 0),
      0,
    );
    const totalTxCount = (data.transactionVolumeByType ?? []).reduce(
      (acc: number, t: any) => acc + (t.count ?? 0),
      0,
    );
    return {
      totalOrganisations: totalOrgs,
      subscriptionTiers: tiers,
      tokenVolumeInPeriod: totalTokenVolume,
      transactionCount: totalTxCount,
    };
  }

  return (
    <Page
      title="Platform analytics"
      description="Shared organization, user, token, and subscription insights."
    >
      <select
        className={inputClass + ' max-w-xs'}
        aria-label="Timeframe"
        value={timeframe}
        onChange={(e) => setTimeframe(e.target.value)}
      >
        {['7d', '30d', '90d'].map((t) => (
          <option key={t}>{t}</option>
        ))}
      </select>

      {q.isPending ? (
        <p>Loading…</p>
      ) : q.isError ? (
        <ErrorBox error={q.error} retry={() => q.refetch()} />
      ) : (
        <>
          <Metrics values={buildMetrics(q.data)} />
          <p className="text-xs text-muted">
            Summary counts are current totals; token volumes use the selected period. Organization
            growth shows the last six months.
          </p>
          <AnalyticsCharts data={q.data} />
          {q.data.aiExecutiveSummary && (
            <div className="p-4 rounded-xl bg-surface border border-line text-sm text-muted whitespace-pre-wrap">
              <p className="font-semibold text-ink mb-1">AI Executive Summary</p>
              {q.data.aiExecutiveSummary}
            </div>
          )}
        </>
      )}
    </Page>
  );
}
