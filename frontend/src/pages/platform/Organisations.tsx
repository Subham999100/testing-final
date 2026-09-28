// ============================================================
// Clyptus Job Portal - Platform Super Admin Organisations View
// Supports full oversight, creation modal, filtering, and
// destructive suspension dialog with mandatory justification.
// ============================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle,
  Eye,
  X,
  ExternalLink,
  ShieldAlert,
  Coins,
  Users,
} from 'lucide-react';
import { PlatformService } from '../../services/platform.service';
import { Organisation, OrganisationStatus } from '../../types/platform.types';

export const Organisations: React.FC = () => {
  const navigate = useNavigate();
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [suspendModalOrg, setSuspendModalOrg] = useState<Organisation | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State for Create
  const [newOrg, setNewOrg] = useState({
    name: '',
    slug: '',
    domain: '',
    contactEmail: '',
    tier: 'STANDARD',
    industry: 'Technology',
    initialTokenAllocation: 1000,
  });

  const loadOrganisations = () => {
    setLoading(true);
    PlatformService.getOrganisations({
      search: search || undefined,
      status: statusFilter !== 'ALL' ? statusFilter : undefined,
    })
      .then((res) => setOrganisations(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadOrganisations();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadOrganisations();
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await PlatformService.createOrganisation(newOrg);
      setShowCreateModal(false);
      setNewOrg({
        name: '',
        slug: '',
        domain: '',
        contactEmail: '',
        tier: 'STANDARD',
        industry: 'Technology',
        initialTokenAllocation: 1000,
      });
      loadOrganisations();
    } catch (err: any) {
      alert(`Error creating organisation: ${err.message || 'Operation failed'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuspendConfirm = async () => {
    if (!suspendModalOrg || suspendReason.trim().length < 10) return;
    setIsSubmitting(true);
    try {
      await PlatformService.suspendOrganisation(suspendModalOrg.id, suspendReason.trim());
      setSuspendModalOrg(null);
      setSuspendReason('');
      loadOrganisations();
    } catch (err: any) {
      alert(`Failed to suspend organisation: ${err.message || 'Operation failed'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivate = async (org: Organisation) => {
    if (confirm(`Are you sure you want to reactivate ${org.name}?`)) {
      try {
        await PlatformService.activateOrganisation(org.id);
        loadOrganisations();
      } catch (err: any) {
        alert(`Failed to activate organisation: ${err.message}`);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Organisation Management</h1>
          <p className="text-xs text-slate-400 mt-1">
            Oversee tenant organizations, audit compliance, token balances, and suspension state.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          Create Organisation
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by organisation name, slug, domain, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-800/80 border border-slate-700/60 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </form>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs text-slate-400 font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="PENDING_VERIFICATION">Pending Verification</option>
          </select>
        </div>
      </div>

      {/* ORGANISATIONS TABLE */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/50 text-slate-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Organisation</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Tier</th>
                <th className="py-3 px-4">Members</th>
                <th className="py-3 px-4">Token Balance</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Loading organisations...
                  </td>
                </tr>
              ) : organisations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No organisations found matching the current criteria.
                  </td>
                </tr>
              ) : (
                organisations.map((org) => (
                  <tr key={org.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-semibold text-white block text-sm">{org.name}</span>
                        <div className="flex items-center gap-2 mt-0.5 text-slate-400 text-[11px] font-mono">
                          <span>{org.slug}</span>
                          {org.domain && <span>· {org.domain}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                          org.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : org.status === 'SUSPENDED'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            org.status === 'ACTIVE'
                              ? 'bg-emerald-400'
                              : org.status === 'SUSPENDED'
                              ? 'bg-rose-400'
                              : 'bg-amber-400'
                          }`}
                        ></span>
                        {org.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[11px]">
                        {org.tier}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-slate-300 font-mono">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        <span>{org.membersCount}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-mono">
                        <span className="font-bold text-emerald-400">{org.tokenBalance}</span>
                        <span className="text-slate-400 text-[10px] block">
                          Used: {org.consumedTokens}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(org.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/platform/organisations/${org.id}`)}
                          className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-md transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {org.status === 'ACTIVE' ? (
                          <button
                            onClick={() => {
                              setSuspendModalOrg(org);
                              setSuspendReason('');
                            }}
                            className="px-2.5 py-1 text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 rounded text-[11px] font-semibold transition-colors"
                          >
                            Suspend
                          </button>
                        ) : org.status === 'SUSPENDED' ? (
                          <button
                            onClick={() => handleActivate(org)}
                            className="px-2.5 py-1 text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/30 rounded text-[11px] font-semibold transition-colors"
                          >
                            Reactivate
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SUSPEND CONFIRMATION MODAL */}
      {suspendModalOrg && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-rose-900/40 rounded-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <ShieldAlert className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Suspend Organisation</h3>
                <p className="text-xs text-slate-400">Mandatory compliance justification required</p>
              </div>
            </div>

            <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700/60 text-xs">
              <span className="text-slate-400 block text-[11px]">Target Organisation:</span>
              <span className="font-semibold text-white text-sm">{suspendModalOrg.name}</span>
              <span className="text-slate-500 block font-mono text-[11px] mt-0.5">
                ID: {suspendModalOrg.id}
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Formal Suspension Reason <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Detail policy breach, non-payment, or security concern (min 10 characters)..."
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
              <span className="text-[10px] text-slate-400 block">
                This action is audited permanently with your administrative identity.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSuspendModalOrg(null)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSuspendConfirm}
                disabled={suspendReason.trim().length < 10 || isSubmitting}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-rose-600/30"
              >
                {isSubmitting ? 'Recording Audit...' : 'Confirm Suspension'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE ORGANISATION MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Create Tenant Organisation</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Organisation Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Acme Inc"
                    value={newOrg.name}
                    onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })}
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">URL Slug (lowercase) *</label>
                  <input
                    type="text"
                    required
                    placeholder="acme-inc"
                    value={newOrg.slug}
                    onChange={(e) =>
                      setNewOrg({
                        ...newOrg,
                        slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                      })
                    }
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Domain</label>
                  <input
                    type="text"
                    placeholder="acme.com"
                    value={newOrg.domain}
                    onChange={(e) => setNewOrg({ ...newOrg, domain: e.target.value })}
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Contact Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="hr@acme.com"
                    value={newOrg.contactEmail}
                    onChange={(e) => setNewOrg({ ...newOrg, contactEmail: e.target.value })}
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Plan Tier</label>
                  <select
                    value={newOrg.tier}
                    onChange={(e) => setNewOrg({ ...newOrg, tier: e.target.value })}
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="STANDARD">Standard</option>
                    <option value="GROWTH">Growth</option>
                    <option value="ENTERPRISE">Enterprise</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Initial Token Allocation</label>
                  <input
                    type="number"
                    min="0"
                    value={newOrg.initialTokenAllocation}
                    onChange={(e) =>
                      setNewOrg({ ...newOrg, initialTokenAllocation: Number(e.target.value) })
                    }
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-md shadow-indigo-600/30"
                >
                  {isSubmitting ? 'Creating...' : 'Create Organisation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
