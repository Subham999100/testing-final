import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Server,
  Database,
  Zap,
  Layers,
  ShieldAlert,
  Users,
  FileText,
  RotateCw,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Cpu,
} from 'lucide-react';
import { ErrorBox } from '../../components/platform/OperationsUI';
import { PlatformService } from '../../services/platform.service';
import { PlatformMonitoringOverview, HealthStatus } from '../../types/platform.types';

function StatusDot({ status }: { status: HealthStatus }) {
  switch (status) {
    case 'HEALTHY':
      return <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />;
    case 'DEGRADED':
      return <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />;
    case 'DOWN':
      return <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />;
    case 'NOT_CONFIGURED':
    default:
      return <span className="h-2 w-2 rounded-full bg-slate-400 shrink-0" />;
  }
}

function StatusBadge({ status, label }: { status: HealthStatus; label?: string }) {
  const text = label || status;
  switch (status) {
    case 'HEALTHY':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <StatusDot status={status} />
          {text}
        </span>
      );
    case 'DEGRADED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <StatusDot status={status} />
          {text}
        </span>
      );
    case 'DOWN':
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <StatusDot status={status} />
          {text}
        </span>
      );
    case 'NOT_CONFIGURED':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
          <StatusDot status={status} />
          {text}
        </span>
      );
  }
}

export function Monitoring() {
  const [data, setData] = useState<PlatformMonitoringOverview | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<any>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const overview = await PlatformService.getMonitoringOverview();
      setData(overview);
      setLastRefreshed(new Date());
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
    const interval = setInterval(fetchOverview, 30000);
    return () => clearInterval(interval);
  }, [fetchOverview]);

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  // Loading Skeletons
  if (loading && !data) {
    return (
      <div className="space-y-6 max-w-[1300px] mx-auto pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
          <div>
            <div className="h-7 w-48 bg-slate-200 rounded animate-pulse" />
            <div className="h-4 w-72 bg-slate-100 rounded mt-1.5 animate-pulse" />
          </div>
        </div>
        <div className="h-16 w-full bg-slate-100 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-6 max-w-[1300px] mx-auto pb-12">
        <div className="pb-4 border-b border-line">
          <h1 className="text-2xl font-bold tracking-tight text-ink">Platform Monitoring</h1>
          <p className="text-xs text-muted mt-1">System health, infrastructure status, and operational signals.</p>
        </div>
        <ErrorBox error={error} retry={fetchOverview} />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6 max-w-[1300px] mx-auto pb-12">
      {/* 1. Compact Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink font-sans">Platform Monitoring</h1>
          <p className="text-xs text-muted mt-0.5">
            System health, infrastructure status, and live operational signals.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="text-right hidden md:block">
            {lastRefreshed && (
              <p className="text-[11px] text-muted font-medium">
                Last checked {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
            )}
            <p className="text-[10px] text-muted">Auto-refreshing every 30s</p>
          </div>
          <button
            onClick={fetchOverview}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-surface border border-line-strong hover:bg-soft text-ink transition-colors shadow-xs disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-action' : 'text-muted'}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* 2. Platform Overall Status Banner */}
      <div
        className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          data.overallStatus === 'HEALTHY'
            ? 'bg-emerald-50/60 border-emerald-200/80 text-emerald-950'
            : data.overallStatus === 'DEGRADED'
            ? 'bg-amber-50/60 border-amber-200/80 text-amber-950'
            : 'bg-rose-50/60 border-rose-200/80 text-rose-950'
        }`}
      >
        <div className="flex items-center gap-3">
          <StatusDot status={data.overallStatus} />
          <div>
            <span className="text-xs font-bold uppercase tracking-wider">
              System Status: {data.overallStatus}
            </span>
            <p className="text-xs text-muted mt-0.5">
              {data.overallStatus === 'HEALTHY' && 'All monitored platform infrastructure services are operating normally.'}
              {data.overallStatus === 'DEGRADED' && 'Platform latency elevated or unresolved security events require administrative review.'}
              {data.overallStatus === 'DOWN' && 'Critical datastore or API connectivity disruption detected.'}
            </p>
          </div>
        </div>
        <div className="text-xs text-muted font-medium shrink-0">
          Environment: <span className="font-mono font-semibold text-ink uppercase">{data.process.environment}</span>
        </div>
      </div>

      {/* 3. Core Services 4-Column Grid */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">Core Infrastructure Services</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* API Gateway */}
          <div className="p-3.5 rounded-xl bg-surface border border-line shadow-2xs hover:border-line-strong transition-all">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-soft text-ink">
                  <Server className="w-4 h-4 text-action" />
                </div>
                <span className="text-xs font-semibold text-ink">API Gateway</span>
              </div>
              <StatusBadge status={data.services.api.status} />
            </div>
            <p className="text-xs font-medium text-ink">NestJS HTTP Server</p>
            <p className="text-[11px] text-muted mt-0.5">Status: Operational</p>
          </div>

          {/* PostgreSQL Database */}
          <div className="p-3.5 rounded-xl bg-surface border border-line shadow-2xs hover:border-line-strong transition-all">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-soft text-ink">
                  <Database className="w-4 h-4 text-action" />
                </div>
                <span className="text-xs font-semibold text-ink">PostgreSQL</span>
              </div>
              <StatusBadge status={data.services.postgresql.status} />
            </div>
            <p className="text-xs font-medium text-ink">
              {data.services.postgresql.status === 'HEALTHY'
                ? `Connected (${data.services.postgresql.latencyMs} ms ping)`
                : data.services.postgresql.error || 'Connection Failed'}
            </p>
            <p className="text-[11px] text-muted mt-0.5">Prisma ORM Primary Datastore</p>
          </div>

          {/* Redis Cache */}
          <div className="p-3.5 rounded-xl bg-surface border border-line shadow-2xs hover:border-line-strong transition-all">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-soft text-ink">
                  <Zap className="w-4 h-4 text-amber-500" />
                </div>
                <span className="text-xs font-semibold text-ink">Redis Cache</span>
              </div>
              <StatusBadge
                status={data.services.redis.status}
                label={data.services.redis.status === 'NOT_CONFIGURED' ? 'In-Memory Fallback' : data.services.redis.status}
              />
            </div>
            <p className="text-xs font-medium text-ink">{data.services.redis.info}</p>
            <p className="text-[11px] text-muted mt-0.5">Distributed State Cache</p>
          </div>

          {/* Background Workers */}
          <div className="p-3.5 rounded-xl bg-surface border border-line shadow-2xs hover:border-line-strong transition-all">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-soft text-ink">
                  <Layers className="w-4 h-4 text-slate-400" />
                </div>
                <span className="text-xs font-semibold text-ink">Workers</span>
              </div>
              <StatusBadge status={data.services.queues.status} label="Not Configured" />
            </div>
            <p className="text-xs font-medium text-ink">Not enabled in monolith</p>
            <p className="text-[11px] text-muted mt-0.5">BullMQ Job Queues</p>
          </div>
        </div>
      </div>

      {/* 4. Action Required / Needs Attention Banner */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">Attention & Operational Signals</h2>
        {data.security.unresolvedEvents > 0 || data.security.criticalIncidents > 0 ? (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <p className="text-xs font-bold">Unresolved Security Events Require Review</p>
                <p className="text-xs text-amber-800 mt-0.5">
                  There {data.security.unresolvedEvents === 1 ? 'is' : 'are'} {data.security.unresolvedEvents} unresolved security incident{data.security.unresolvedEvents === 1 ? '' : 's'} recorded in the log.
                </p>
              </div>
            </div>
            <Link
              to="/platform/security"
              className="inline-flex items-center gap-1 text-xs font-bold text-amber-900 hover:text-amber-950 underline shrink-0"
            >
              Review Security Events <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-surface border border-line flex items-center gap-3 text-xs text-muted">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>
              <strong className="text-ink font-semibold">No critical platform issues.</strong> All monitored infrastructure components are functioning within nominal parameters.
            </span>
          </div>
        )}
      </div>

      {/* 5. Operational Summary Cards (4 Columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-surface border border-line shadow-2xs">
          <div className="flex items-center justify-between text-muted mb-1.5">
            <span className="text-xs font-medium">Active Admin Sessions</span>
            <Users className="w-4 h-4 text-action" />
          </div>
          <div className="text-2xl font-semibold tracking-tight text-ink font-mono">{data.security.activeSessions}</div>
          <p className="text-[11px] text-muted mt-1">Authenticated platform admins</p>
        </div>

        <div className="p-3.5 rounded-xl bg-surface border border-line shadow-2xs">
          <div className="flex items-center justify-between text-muted mb-1.5">
            <span className="text-xs font-medium">Security Events</span>
            <ShieldAlert className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-semibold tracking-tight text-ink font-mono">{data.security.unresolvedEvents}</div>
          <p className="text-[11px] text-muted mt-1">Unresolved security logs</p>
        </div>

        <div className="p-3.5 rounded-xl bg-surface border border-line shadow-2xs">
          <div className="flex items-center justify-between text-muted mb-1.5">
            <span className="text-xs font-medium">Critical Incidents</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-semibold tracking-tight text-ink font-mono">{data.security.criticalIncidents}</div>
          <p className="text-[11px] text-muted mt-1">Active critical alerts</p>
        </div>

        <div className="p-3.5 rounded-xl bg-surface border border-line shadow-2xs">
          <div className="flex items-center justify-between text-muted mb-1.5">
            <span className="text-xs font-medium">Audit Events (24h)</span>
            <FileText className="w-4 h-4 text-action" />
          </div>
          <div className="text-2xl font-semibold tracking-tight text-ink font-mono">{data.operations.auditLogs24h}</div>
          <p className="text-[11px] text-muted mt-1">Recorded audit activity</p>
        </div>
      </div>

      {/* 6. Recent Platform Activity & Runtime Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity Table (2 Columns) */}
        <div className="lg:col-span-2 p-4 rounded-xl bg-surface border border-line space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted">Recent Platform Activity</h2>
            <Link to="/platform/security" className="text-xs font-semibold text-action hover:underline inline-flex items-center gap-1">
              Security Log <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {data.recentSecurityEvents.length === 0 ? (
            <p className="text-xs text-muted py-6 text-center">No recent security events recorded.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-ink">
                <thead>
                  <tr className="border-b border-line text-[11px] uppercase text-muted bg-soft">
                    <th className="py-2 px-3 font-semibold">Event</th>
                    <th className="py-2 px-3 font-semibold">Severity</th>
                    <th className="py-2 px-3 font-semibold">IP Address</th>
                    <th className="py-2 px-3 font-semibold">Status</th>
                    <th className="py-2 px-3 font-semibold text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.recentSecurityEvents.map((evt) => (
                    <tr key={evt.id} className="hover:bg-soft transition-colors">
                      <td className="py-2 px-3 font-mono font-medium text-ink">{evt.eventType}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            evt.severity === 'CRITICAL'
                              ? 'bg-rose-100 text-rose-700'
                              : evt.severity === 'HIGH'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {evt.severity}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono text-muted">{evt.ipAddress || '—'}</td>
                      <td className="py-2 px-3">
                        {evt.isResolved ? (
                          <span className="text-emerald-600 font-semibold">Resolved</span>
                        ) : (
                          <span className="text-amber-600 font-semibold">Unresolved</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right text-muted">
                        {new Date(evt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Runtime & Process Details Key-Value Box (1 Column) */}
        <div className="p-4 rounded-xl bg-surface border border-line space-y-3 shadow-2xs">
          <div className="flex items-center gap-2 pb-2 border-b border-line">
            <Cpu className="w-4 h-4 text-action" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted">Runtime Details</h2>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-line-strong/30">
              <span className="text-muted">Node.js Version</span>
              <span className="font-mono font-semibold text-ink">{data.process.nodeVersion}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-line-strong/30">
              <span className="text-muted">Process Uptime</span>
              <span className="font-mono font-semibold text-ink">{formatUptime(data.process.uptimeSeconds)}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-line-strong/30">
              <span className="text-muted">Heap Used</span>
              <span className="font-mono font-semibold text-ink">{data.process.memory.heapUsedMB} MB</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-line-strong/30">
              <span className="text-muted">Heap Allocated</span>
              <span className="font-mono font-semibold text-ink">{data.process.memory.heapTotalMB} MB</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-muted">RSS Memory</span>
              <span className="font-mono font-semibold text-ink">{data.process.memory.rssMB} MB</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
