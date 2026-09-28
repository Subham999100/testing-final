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
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Organisation Registration Velocity</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">6-Month Trajectory</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.organisationGrowthTrend || []}>
                <defs>
                  <linearGradient id="orgGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="newOrganisations"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#orgGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Transaction Volume Bar Chart */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">Token Velocity by Transaction Type</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">Volume breakdown</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.transactionVolumeByType || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="type" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="totalTokens" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* DISTRIBUTION MATRICES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <h3 className="text-sm font-bold text-white mb-3">Organisation Status Distribution</h3>
          <div className="space-y-2">
            {(data.statusDistribution || []).map((item: any) => (
              <div
                key={item.status}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/40 border border-slate-800 text-xs"
              >
                <span className="font-semibold text-slate-200">{item.status}</span>
                <span className="font-mono text-indigo-400 font-bold">{item.count} tenants</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tier Distribution */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <h3 className="text-sm font-bold text-white mb-3">Subscription Tier Distribution</h3>
          <div className="space-y-2">
            {(data.tierDistribution || []).map((item: any) => (
              <div
                key={item.tier}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/40 border border-slate-800 text-xs"
              >
                <span className="font-semibold text-slate-200">{item.tier}</span>
                <span className="font-mono text-emerald-400 font-bold">{item.count} organisations</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
