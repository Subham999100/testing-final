// ============================================================
// Clyptus Job Portal - Shared Platform Analytics Charts
// Visualizes platform-wide telemetry, velocity, and distributions.
// Reusable by Platform Super Admin & Platform Admin.
// ============================================================

import React from 'react';
import { TrendingUp, BarChart3 } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';

interface Props {
  data: {
    organisationGrowthTrend?: any[];
    transactionVolumeByType?: any[];
    statusDistribution?: any[];
    tierDistribution?: any[];
  };
}

export const AnalyticsCharts: React.FC<Props> = ({ data }) => {
  return (
    <div className="space-y-6">
      {/* CHARTS ROW 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Growth Trend Area Chart */}
        <div className="p-5 rounded-xl bg-surface border border-line">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-success" />
              <h3 className="text-sm font-bold text-ink">Organisation Registration Velocity</h3>
            </div>
            <span className="text-xs text-muted font-mono">6-Month Trajectory</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.organisationGrowthTrend || []}>
                <defs>
                  <linearGradient id="orgGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" stroke="var(--color-text-secondary)" fontSize={11} />
                <YAxis stroke="var(--color-text-secondary)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-surface)',
                    borderColor: 'var(--color-border-strong)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="newOrganisations"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#orgGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Transaction Volume Bar Chart */}
        <div className="p-5 rounded-xl bg-surface border border-line">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-action" />
              <h3 className="text-sm font-bold text-ink">Token Velocity by Transaction Type</h3>
            </div>
            <span className="text-xs text-muted font-mono">Volume breakdown</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.transactionVolumeByType || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="type" stroke="var(--color-text-secondary)" fontSize={10} />
                <YAxis stroke="var(--color-text-secondary)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-surface)',
                    borderColor: 'var(--color-border-strong)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="totalTokens" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* DISTRIBUTION MATRICES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="p-5 rounded-xl bg-surface border border-line">
          <h3 className="text-sm font-bold text-ink mb-3">Organisation Status Distribution</h3>
          <div className="space-y-2">
            {(data.statusDistribution || []).map((item: any) => (
              <div
                key={item.status}
                className="flex items-center justify-between p-2.5 rounded-lg bg-soft border border-line text-xs"
              >
                <span className="font-semibold text-ink">{item.status}</span>
                <span className="font-mono text-action font-bold">{item.count} tenants</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tier Distribution */}
        <div className="p-5 rounded-xl bg-surface border border-line">
          <h3 className="text-sm font-bold text-ink mb-3">Subscription Tier Distribution</h3>
          <div className="space-y-2">
            {(data.tierDistribution || []).map((item: any) => (
              <div
                key={item.tier}
                className="flex items-center justify-between p-2.5 rounded-lg bg-soft border border-line text-xs"
              >
                <span className="font-semibold text-ink">{item.tier}</span>
                <span className="font-mono text-success font-bold">{item.count} organisations</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
