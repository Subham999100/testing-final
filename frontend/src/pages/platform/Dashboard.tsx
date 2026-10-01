import React from "react";
import { ArrowRight, Coins, Building2, Shield, Activity, Users, Settings, FileCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { usePermissions } from "../../hooks/usePermissions";
import {
  activityLabel,
  actorLabel,
  targetLabel,
} from "../../features/platform/audit/activity";
import {
  Page,
  useResource,
  ErrorBox,
  Metrics,
} from "../../components/platform/OperationsUI";

export function Dashboard() {
  const q = useResource("dashboard");
  const { isSuperAdmin, hasPermission } = usePermissions();

  const data = q.data || {};
  const metrics = data.metrics || {};
  const tokenMetrics = metrics.tokenMetrics || {};

  // Flattened scalar metrics for the Metrics component to prevent NaN
  const displayMetrics: Record<string, number> = {
    totalOrganisations: metrics.totalOrganisations ?? 0,
    activeOrganisations: metrics.activeOrganisations ?? 0,
    pendingOrganisations: metrics.pendingOrganisations ?? 0,
    suspendedOrganisations: metrics.suspendedOrganisations ?? 0,
    totalPlatformUsers: metrics.totalPlatformUsers ?? 0,
    totalPlatformAdmins: metrics.totalPlatformAdmins ?? 0,
    activeTokens: tokenMetrics.totalActiveTokens ?? 0,
    consumedTokens: tokenMetrics.totalConsumedTokens ?? 0,
  };

  // Safe reference to recent activities (backend returns recentAuditLogs)
  const recentActivities = data.recentAuditLogs || data.recentActivity || [];
  const recentTransactions = data.recentTransactions || [];
  const recentOrganisations = data.recentOrganisations || [];

  return (
    <Page
      title={isSuperAdmin ? "Platform Super Admin Dashboard" : "Platform Admin Operations Dashboard"}
      description={
        isSuperAdmin
          ? "Executive governance control plane: organization health, token economics, administrator management, and audit telemetry."
          : "Operational control plane: organization verification, tenant monitoring, job moderation, and platform support queues."
      }
    >
      {q.isPending ? (
        <div className="p-8 text-center text-muted flex items-center justify-center gap-2">
          <span className="h-5 w-5 rounded-full border-2 border-brand border-t-transparent animate-spin" />
          <span>Loading platform dashboard metrics…</span>
        </div>
      ) : q.isError ? (
        <ErrorBox error={q.error} retry={() => q.refetch()} />
      ) : (
        <>
          {/* Top KPI Metrics Cards */}
          <Metrics values={displayMetrics} />
          
          <p className="text-xs text-muted">
            Aggregated real-time metrics across registered organizations, active ledger balances, and platform personnel.
          </p>

          {/* Dual Operations / Economics Panels */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Token Economy / Sales */}
            <div className="p-5 rounded-xl border border-line bg-surface">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-500" aria-hidden="true" />
                  <h2 className="font-semibold text-sm">Token Economy & Circulation</h2>
                </div>
                {hasPermission("platform.tokens.read") && (
                  <Link to="/platform/token-transactions" className="text-xs text-link font-medium">
                    View ledger <ArrowRight className="w-3 h-3 inline" aria-hidden="true" />
                  </Link>
                )}
              </div>
              <div className="space-y-2 text-xs text-muted">
                <div className="flex justify-between items-center py-1 border-b border-line">
                  <span>Active Circulating Tokens</span>
                  <span className="font-semibold text-ink font-mono">
                    {(tokenMetrics.totalActiveTokens ?? 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-line">
                  <span>Total Allocated Tokens</span>
                  <span className="font-semibold text-ink font-mono">
                    {(tokenMetrics.totalAllocatedTokens ?? 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span>Total Consumed Tokens</span>
                  <span className="font-semibold text-ink font-mono">
                    {(tokenMetrics.totalConsumedTokens ?? 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Tenant Overview */}
            <div className="p-5 rounded-xl border border-line bg-surface">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-brand" aria-hidden="true" />
                  <h2 className="font-semibold text-sm">Tenants & Organization Status</h2>
                </div>
                {hasPermission("platform.organisations.read") && (
                  <Link to="/platform/organisations" className="text-xs text-link font-medium">
                    Manage <ArrowRight className="w-3 h-3 inline" aria-hidden="true" />
                  </Link>
                )}
              </div>
              <div className="space-y-2 text-xs text-muted">
                <div className="flex justify-between items-center py-1 border-b border-line">
                  <span>Active Organizations</span>
                  <span className="font-semibold text-ink font-mono">
                    {(metrics.activeOrganisations ?? 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-line">
                  <span>Pending Verification</span>
                  <span className="font-semibold text-amber-600 font-mono">
                    {(metrics.pendingOrganisations ?? 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span>Total Platform Users</span>
                  <span className="font-semibold text-ink font-mono">
                    {(metrics.totalPlatformUsers ?? 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Access Action Shortcuts depending on Role */}
          <div className="p-5 rounded-xl border border-line bg-surface">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">
              {isSuperAdmin ? "Super Admin Governance Controls" : "Admin Operations Quick Actions"}
            </h3>
            <div className="flex flex-wrap gap-3">
              {isSuperAdmin && (
                <>
                  <Link to="/platform/admins" className="button button-secondary button-small flex items-center gap-2">
                    <Users className="w-3.5 h-3.5" aria-hidden="true" />
                    Manage Platform Admins
                  </Link>
                  <Link to="/platform/settings" className="button button-secondary button-small flex items-center gap-2">
                    <Settings className="w-3.5 h-3.5" aria-hidden="true" />
                    System Settings
                  </Link>
                  <Link to="/platform/security" className="button button-secondary button-small flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5" aria-hidden="true" />
                    Security & Sessions
                  </Link>
                </>
              )}
              {hasPermission("platform.organisations.read") && (
                <Link to="/platform/verifications" className="button button-secondary button-small flex items-center gap-2">
                  <FileCheck className="w-3.5 h-3.5" aria-hidden="true" />
                  Organization Verifications
                </Link>
              )}
              {hasPermission("platform.audit.read") && (
                <Link to="/platform/audit-logs" className="button button-secondary button-small flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5" aria-hidden="true" />
                  Central Audit Logs
                </Link>
              )}
            </div>
          </div>

          {/* Recent Platform Activity Stream */}
          <section
            className="recent-activity"
            aria-labelledby="recent-activity-title"
          >
            <div className="activity-heading">
              <div>
                <h2 id="recent-activity-title">Recent Platform Activity</h2>
                <p className="text-sm text-muted">
                  Latest administrative events and security operations. Full history is accessible in Audit logs.
                </p>
              </div>
              {hasPermission("platform.audit.read") && (
                <Link to="/platform/audit-logs" className="text-link">
                  View all activity <ArrowRight aria-hidden="true" />
                </Link>
              )}
            </div>
            {recentActivities.length > 0 ? (
              <ul className="activity-list">
                {recentActivities.slice(0, 5).map((row: any) => (
                  <li key={row.id}>
                    <div>
                      <strong>{activityLabel(row.action)}</strong>
                      <p>
                        {actorLabel(row)} · {targetLabel(row)}
                      </p>
                    </div>
                    <time dateTime={row.createdAt}>
                      {new Date(row.createdAt).toLocaleString()}
                    </time>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted mt-4">
                No recent activity recorded for your assigned permissions.
              </p>
            )}
          </section>
        </>
      )}
    </Page>
  );
}
