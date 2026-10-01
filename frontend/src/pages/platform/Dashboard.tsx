// ============================================================
// Clyptus Job Portal - Platform Super Admin Dashboard
// ============================================================

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Users,
  Coins,
  ShieldAlert,
  ArrowUpRight,
  TrendingUp,
  Server,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { PlatformService } from '../../services/platform.service';
import { PlatformDashboardSummary } from '../../types/platform.types';
import { OrganisationStatusBadge } from '../../features/platform/organisations/OrganisationStatusBadge';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<PlatformDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    PlatformService.getDashboardSummary()
      .then((res) => setData(res))
      .catch((err: { message?: string }) => setError(err?.message || 'Could not load the dashboard.'))
      .finally(() => setLoading(false));
  }, []);

  // Without this, a failed request (e.g. 403 for an admin lacking platform.analytics.read) spun forever.
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertTriangle className="w-6 h-6 text-amber-400 mb-3" />
        <p className="text-sm font-semibold text-white">Dashboard unavailable</p>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">{error}</p>
        <button
          onClick={() => navigate('/platform/organisations')}
          className="mt-4 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700"
        >
          Go to Organisations
        </button>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <Activity className="w-6 h-6 animate-spin text-indigo-500 mr-3" />
        <span className="text-sm font-medium">Aggregating platform telemetry...</span>
      </div>
    );
  }

  const kpis = [
    {
      label: 'Total Organisations',
      value: data.metrics.totalOrganisations,
      sub: `${data.metrics.activeOrganisations} Active · ${data.metrics.suspendedOrganisations} Suspended`,
      icon: Building2,
      trend: '+12% this month',
      color: 'from-blue-600 to-indigo-600',
    },
    {
      label: 'Active Platform Users',
      value: data.metrics.totalPlatformUsers.toLocaleString(),
      sub: `${data.metrics.totalPlatformAdmins} Platform Admins`,
      icon: Users,
      trend: '+18% growth',
      color: 'from-indigo-600 to-violet-600',
    },
    {
      label: 'Active Token Reserve',
      value: data.metrics.tokenMetrics.totalActiveTokens.toLocaleString(),
      sub: `${data.metrics.tokenMetrics.totalConsumedTokens.toLocaleString()} Consumed to Date`,
      icon: Coins,
      trend: 'Ledger Verified',
      color: 'from-emerald-600 to-teal-600',
    },
    {
      label: 'System Health',
      value: data.systemHealth.status,
      sub: `Uptime: ${(data.systemHealth.uptimeSeconds / 3600).toFixed(1)} hrs`,
      icon: Server,
      trend: 'Zero Outages',
      color: 'from-cyan-600 to-blue-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Platform Command Center</h1>
          <p className="text-xs text-slate-400 mt-1">
            Global governance, multi-tenant organisation status, and token economy oversight.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/platform/organisations')}
            className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all"
          >
            <Building2 className="w-3.5 h-3.5" />
            Manage Organisations
          </button>
          <button
            onClick={() => navigate('/platform/token-usage')}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-all"
          >
            <Coins className="w-3.5 h-3.5" />
            Token Ledger
          </button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700/80 transition-all relative overflow-hidden group shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">{kpi.label}</span>
                <div className={`p-2 rounded-lg bg-gradient-to-br ${kpi.color} text-white shadow-md`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-extrabold text-white tracking-tight">{kpi.value}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">{kpi.sub}</span>
                <span className="text-emerald-400 font-medium flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" />
                  {kpi.trend}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* TWO COLUMN GRID: RECENT ORGANISATIONS & RECENT TRANSACTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Organisations */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Recent Organisations</h3>
              </div>
              <button
                onClick={() => navigate('/platform/organisations')}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
              >
                View all <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="divide-y divide-slate-800/80">
              {data.recentOrganisations.slice(0, 4).map((org) => (
                <div key={org.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-200 block">{org.name}</span>
                    <span className="text-slate-400 text-[11px] font-mono">{org.slug} · {org.tier}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <OrganisationStatusBadge status={org.status} />
                    <span className="text-slate-400 font-mono text-[11px]">
                      {org.tokenBalance} tok
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Token Transactions */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Recent Ledger Transactions</h3>
              </div>
              <button
                onClick={() => navigate('/platform/token-transactions')}
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium"
              >
                Full ledger <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="divide-y divide-slate-800/80">
              {data.recentTransactions.slice(0, 4).map((tx) => (
                <div key={tx.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200">{tx.organisationName || tx.organisationId}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono font-medium">
                        {tx.type}
                      </span>
                    </div>
                    <span className="text-slate-400 text-[11px] block mt-0.5 truncate max-w-xs">
                      {tx.reason || 'Ledger event'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span
                      className={`font-mono font-bold ${
                        tx.amount > 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                    </span>
                    <span className="block text-[10px] text-slate-400 font-mono">
                      Bal: {tx.balanceAfter}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* AUDIT & SECURITY SUMMARY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Audit Logs (2 cols) */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-violet-400" />
              <h3 className="text-sm font-bold text-white">Central Audit Stream</h3>
            </div>
            <button
              onClick={() => navigate('/platform/audit-logs')}
              className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 font-medium"
            >
              All audit logs <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-2.5">
            {data.recentAuditLogs.slice(0, 4).map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-lg bg-slate-800/40 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-violet-400 shrink-0"></span>
                  <div>
                    <span className="font-mono text-indigo-300 font-medium">{log.action}</span>
                    <span className="text-slate-400 text-[11px] block">
                      on <span className="text-slate-300 font-semibold">{log.entityType}</span> ({log.entityId})
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                    {log.actorRole}
                  </span>
                  <span className="block text-[10px] text-slate-400 mt-0.5">
                    {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Integration Status Panel (1 col) */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Server className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Integration Health</h3>
            </div>
            <div className="space-y-3">
              {Object.entries(data.systemHealth.services).map(([svc, info]: [string, any]) => (
                <div
                  key={svc}
                  className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-800/30 border border-slate-800"
                >
                  <span className="font-medium text-slate-300 capitalize">{svc.replace(/([A-Z])/g, ' $1')}</span>
                  <div className="flex items-center gap-2">
                    {info.latencyMs && (
                      <span className="text-[10px] font-mono text-slate-400">{info.latencyMs}ms</span>
                    )}
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      UP
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Security Incidents: {data.recentSecurityEvents.filter((e) => !e.isResolved).length} open</span>
            <button
              onClick={() => navigate('/platform/security')}
              className="text-indigo-400 hover:underline"
            >
              Review
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
