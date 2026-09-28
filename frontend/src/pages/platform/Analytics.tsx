// ============================================================
// Clyptus Job Portal - Platform Super Admin Analytics View
// Interactive telemetry with Recharts and Gemini AI summary.
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Sparkles,
  Layers,
  PieChart as PieChartIcon,
  BarChart3,
  Calendar,
} from 'lucide-react';
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
import { PlatformService } from '../../services/platform.service';

export const Analytics: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('30d');

  useEffect(() => {
    setLoading(true);
    PlatformService.getAnalytics(timeframe)
      .then((res) => setData(res))
      .finally(() => setLoading(false));
  }, [timeframe]);

  if (loading || !data) {
    return <div className="text-slate-400 text-sm">Aggregating platform telemetry...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Platform Analytics & Intelligence</h1>
          <p className="text-xs text-slate-400 mt-1">
            Macro-level multi-tenant velocity, consumption distribution, and AI intelligence synthesis.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>
      </div>

      {/* GEMINI AI PLATFORM EXECUTIVE SUMMARY */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-slate-900 border border-indigo-800/40 shadow-xl relative overflow-hidden">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-indigo-300" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Gemini AI Platform Synthesis</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold font-mono">
                GENERATIVE INSIGHTS
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed max-w-4xl">
              {data.aiExecutiveSummary}
            </p>
          </div>
        </div>
      </div>

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
              <AreaChart data={data.organisationGrowthTrend}>
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
              <BarChart data={data.transactionVolumeByType}>
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
            {data.statusDistribution.map((item: any) => (
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
            {data.tierDistribution.map((item: any) => (
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
