// ============================================================
// Clyptus Job Portal - Platform Analytics View
// Unified View for Platform Super Admin & Platform Admin.
// Utilizes shared GeminiSummaryCard & AnalyticsCharts.
// ============================================================

import React, { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { PlatformService } from '../../services/platform.service';
import { GeminiSummaryCard } from '../../features/platform/analytics/GeminiSummaryCard';
import { AnalyticsCharts } from '../../features/platform/analytics/AnalyticsCharts';

export const Analytics: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('30d');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    PlatformService.getAnalytics(timeframe)
      .then((res) => setData(res))
      .catch((err: { message?: string }) => setError(err?.message || 'Could not load analytics.'))
      .finally(() => setLoading(false));
  }, [timeframe]);

  // A failed request used to leave this "loading" forever.
  if (error) {
    return <div className="text-amber-300 text-sm">Analytics unavailable: {error}</div>;
  }

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
      {data.aiExecutiveSummary && (
        <GeminiSummaryCard summary={data.aiExecutiveSummary} />
      )}

      {/* REUSABLE TELEMETRY CHARTS */}
      <AnalyticsCharts data={data} />
    </div>
  );
};
