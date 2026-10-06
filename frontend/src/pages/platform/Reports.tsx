import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Download,
  Building,
  Users,
  Briefcase,
  FileText,
  Calendar,
  Filter,
  RefreshCw,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Page, ErrorBox } from '../../components/platform/OperationsUI';
import { PlatformService } from '../../services/platform.service';
import { ReportsOverview, Organisation } from '../../types/platform.types';

export function Reports() {
  // Filter States
  const [timeframe, setTimeframe] = useState<string>('30d');
  const [organisationId, setOrganisationId] = useState<string>('');
  const [organisations, setOrganisations] = useState<Organisation[]>([]);

  // Data States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [data, setData] = useState<ReportsOverview | null>(null);
  const [exporting, setExporting] = useState(false);

  // Load Organisations for dropdown
  useEffect(() => {
    PlatformService.getOrganisations({ limit: 100 })
      .then((res) => setOrganisations(res.data || []))
      .catch(() => {});
  }, []);

  // Fetch Reports Data
  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await PlatformService.getReportsOverview({
        timeframe,
        organisationId: organisationId || undefined,
      });
      setData(res);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [timeframe, organisationId]);

  // Handle CSV Export
  const [exportMessage, setExportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeExportType, setActiveExportType] = useState<string | null>(null);

  const handleExport = async (type: 'overview' | 'organisations' | 'jobs' | 'applications') => {
    setExporting(true);
    setActiveExportType(type);
    setExportMessage(null);
    try {
      await PlatformService.exportReportsCsv({
        timeframe,
        organisationId: organisationId || undefined,
        type,
      });
      setExportMessage({
        type: 'success',
        text: `Real-time ${type.toUpperCase()} report successfully downloaded!`,
      });
      setTimeout(() => setExportMessage(null), 5000);
    } catch (err: any) {
      setExportMessage({
        type: 'error',
        text: `Export failed: ${err?.message || 'Unable to download report file.'}`,
      });
    } finally {
      setExporting(false);
      setActiveExportType(null);
    }
  };

  return (
    <Page
      title="Platform Reports & Analytics"
      description="Cross-platform telemetry, system-wide metrics, and real-time tabular reporting."
    >
      {exportMessage && (
        <div
          role="status"
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
            exportMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
          }`}
        >
          <span>{exportMessage.text}</span>
          <button
            onClick={() => setExportMessage(null)}
            className="text-xs hover:underline ml-4 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Filter and Export Bar */}
      <div className="bg-surface border border-line rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 mb-6 shadow-xs">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Timeframe Selector */}
          <div className="flex items-center gap-1.5 bg-soft border border-line rounded-lg px-2.5 py-1.5">
            <Calendar className="w-3.5 h-3.5 text-muted" />
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="bg-transparent text-xs font-semibold text-ink focus:outline-hidden cursor-pointer"
            >
              <option value="today">Today</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="this_year">This Year</option>
              <option value="all">All Time</option>
            </select>
          </div>

          {/* Organisation Selector */}
          {organisations.length > 0 && (
            <div className="flex items-center gap-1.5 bg-soft border border-line rounded-lg px-2.5 py-1.5">
              <Building className="w-3.5 h-3.5 text-muted" />
              <select
                value={organisationId}
                onChange={(e) => setOrganisationId(e.target.value)}
                className="bg-transparent text-xs font-semibold text-ink focus:outline-hidden cursor-pointer max-w-[200px] truncate"
              >
                <option value="">All Organisations</option>
                {organisations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Real-time Export Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={() => handleExport('overview')}
            disabled={exporting || loading}
            className="px-3 py-1.5 bg-soft border border-line rounded-lg text-xs font-semibold text-ink hover:bg-line flex items-center gap-1.5 disabled:opacity-50 transition-colors cursor-pointer"
            title="Download high-level executive metric summary"
          >
            {exporting && activeExportType === 'overview' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
            ) : (
              <Download className="w-3.5 h-3.5 text-muted" />
            )}
            <span>Export Overview CSV</span>
          </button>

          <button
            onClick={() => handleExport('organisations')}
            disabled={exporting || loading}
            className="px-3 py-1.5 bg-soft border border-line rounded-lg text-xs font-semibold text-ink hover:bg-line flex items-center gap-1.5 disabled:opacity-50 transition-colors cursor-pointer"
            title="Download all organizations breakdown"
          >
            {exporting && activeExportType === 'organisations' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
            ) : (
              <Download className="w-3.5 h-3.5 text-muted" />
            )}
            <span>Export Organisations</span>
          </button>

          <button
            onClick={() => handleExport('jobs')}
            disabled={exporting || loading}
            className="px-3 py-1.5 bg-soft border border-line rounded-lg text-xs font-semibold text-ink hover:bg-line flex items-center gap-1.5 disabled:opacity-50 transition-colors cursor-pointer"
            title="Download published jobs report"
          >
            {exporting && activeExportType === 'jobs' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
            ) : (
              <Download className="w-3.5 h-3.5 text-muted" />
            )}
            <span>Export Jobs</span>
          </button>

          <button
            onClick={() => handleExport('applications')}
            disabled={exporting || loading}
            className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary-hover flex items-center gap-1.5 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
            title="Download candidates & applications report"
          >
            {exporting && activeExportType === 'applications' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
            ) : (
              <Download className="w-3.5 h-3.5 text-white" />
            )}
            <span>Export Applications</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-surface border border-line rounded-xl p-12 text-center text-muted">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
          <p className="text-sm">Calculating real-time platform metrics...</p>
        </div>
      ) : error ? (
        <ErrorBox error={error} retry={fetchReports} />
      ) : !data ? (
        <div className="bg-surface border border-line rounded-xl p-8 text-center text-muted">
          No reporting data available.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Overview Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Organisations Card */}
            <div className="bg-surface border border-line rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between text-muted mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Organisations</span>
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <Building className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold tracking-tight text-ink">
                {data.organisations.total.toLocaleString()}
              </div>
              <div className="mt-2 text-xs text-muted flex items-center gap-2">
                <span className="text-emerald-600 font-semibold">
                  {data.organisations.active} active
                </span>
                <span>•</span>
                <span>+{data.organisations.createdInPeriod} in period</span>
              </div>
            </div>

            {/* Recruiters Card */}
            <div className="bg-surface border border-line rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between text-muted mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Recruiters</span>
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold tracking-tight text-ink">
                {data.recruiters.total.toLocaleString()}
              </div>
              <div className="mt-2 text-xs text-muted flex items-center gap-2">
                <span className="text-emerald-600 font-semibold">
                  {data.recruiters.active} active
                </span>
                <span>•</span>
                <span>{data.users.total} total platform users</span>
              </div>
            </div>

            {/* Jobs Card */}
            <div className="bg-surface border border-line rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between text-muted mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Jobs</span>
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Briefcase className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold tracking-tight text-ink">
                {data.jobs.total.toLocaleString()}
              </div>
              <div className="mt-2 text-xs text-muted flex items-center gap-2">
                <span className="text-emerald-600 font-semibold">{data.jobs.active} active</span>
                <span>•</span>
                <span>+{data.jobs.createdInPeriod} in period</span>
              </div>
            </div>

            {/* Applications Card */}
            <div className="bg-surface border border-line rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between text-muted mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Applications</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold tracking-tight text-ink">
                {data.applications.total.toLocaleString()}
              </div>
              <div className="mt-2 text-xs text-muted flex items-center gap-2">
                <span className="text-primary font-semibold">
                  +{data.applications.appliedInPeriod} in period
                </span>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Velocity / Trajectory Area Chart */}
            <div className="bg-surface border border-line rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold text-ink">Platform Activity Velocity</h3>
                </div>
                <span className="text-xs text-muted">6-Month Trend</span>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.trends || []}>
                    <defs>
                      <linearGradient id="orgTrendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="jobTrendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="appTrendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="month" stroke="var(--color-text-secondary)" fontSize={11} />
                    <YAxis stroke="var(--color-text-secondary)" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--color-surface)',
                        borderColor: 'var(--color-border)',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Area
                      type="monotone"
                      name="Organisations"
                      dataKey="organisations"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fill="url(#orgTrendGrad)"
                    />
                    <Area
                      type="monotone"
                      name="Jobs"
                      dataKey="jobs"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      fill="url(#jobTrendGrad)"
                    />
                    <Area
                      type="monotone"
                      name="Applications"
                      dataKey="applications"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#appTrendGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Application Stages Funnel Bar Chart */}
            <div className="bg-surface border border-line rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-ink">Application Pipeline by Stage</h3>
                </div>
                <span className="text-xs text-muted">All active records</span>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.applications.byStage || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="stage" stroke="var(--color-text-secondary)" fontSize={10} />
                    <YAxis stroke="var(--color-text-secondary)" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--color-surface)',
                        borderColor: 'var(--color-border)',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="count" name="Applications" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Top Organisations Table */}
          <div className="bg-surface border border-line rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-line flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-ink">Top Organisations</h3>
                <p className="text-xs text-muted">Activity and volume metrics across client tenants</p>
              </div>
              <button
                onClick={() => handleExport('organisations')}
                className="text-xs text-action hover:underline flex items-center gap-1"
              >
                <Download className="w-3 h-3" /> Export Table
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-soft text-muted font-medium text-xs border-b border-line">
                  <tr>
                    <th className="py-3 px-4">Organisation</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Tier</th>
                    <th className="py-3 px-4 text-right">Recruiters</th>
                    <th className="py-3 px-4 text-right">Jobs</th>
                    <th className="py-3 px-4 text-right">Applications</th>
                    <th className="py-3 px-4 text-right">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.topOrganisations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted">
                        No organisation records found.
                      </td>
                    </tr>
                  ) : (
                    data.topOrganisations.map((org) => (
                      <tr key={org.id} className="hover:bg-soft/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-medium text-ink">{org.name}</div>
                          <div className="text-[11px] text-muted font-mono">{org.slug}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                              org.status === 'ACTIVE'
                                ? 'bg-emerald-500/10 text-emerald-600'
                                : org.status === 'SUSPENDED'
                                ? 'bg-rose-500/10 text-rose-600'
                                : 'bg-amber-500/10 text-amber-600'
                            }`}
                          >
                            {org.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-xs font-mono uppercase bg-soft px-1.5 py-0.5 rounded border border-line">
                            {org.tier}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-ink">
                          {org.recruiters}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-ink">
                          {org.jobs}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-primary">
                          {org.applications}
                        </td>
                        <td className="py-3 px-4 text-right text-xs text-muted">
                          {new Date(org.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}
