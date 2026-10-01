// ============================================================
// Clyptus Job Portal - Organisation Detailed Overview
// Displays metadata, token balance breakdown, and platform activity.
// ============================================================

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Building2,
  ArrowLeft,
  Coins,
  Users,
  Globe,
  Mail,
  Phone,
  ShieldCheck,
  AlertOctagon,
  Calendar,
  Layers,
  KeyRound,
} from 'lucide-react';
import { PlatformService } from '../../services/platform.service';
import { Organisation } from '../../types/platform.types';
import { ResetSuperAdminPasswordModal } from '../../features/platform/organisations/ResetSuperAdminPasswordModal';

export const OrganisationDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [org, setOrg] = useState<Organisation | null>(null);
  const [loading, setLoading] = useState(true);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);

  useEffect(() => {
    if (id) {
      PlatformService.getOrganisationById(id)
        .then((data) => setOrg(data))
        .catch(() => navigate('/platform/organisations'))
        .finally(() => setLoading(false));
    }
  }, [id, navigate]);

  if (loading || !org) {
    return <div className="text-slate-400 text-sm">Loading organisation profile...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Back button & Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/platform/organisations')}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">{org.name}</h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                org.status === 'ACTIVE'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}
            >
              {org.status}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            ID: {org.id} · Slug: {org.slug}
          </p>
        </div>
      </div>

      {/* SUSPENSION ALERT BANNER */}
      {org.status === 'SUSPENDED' && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 flex items-start gap-3">
          <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold text-rose-300 block">Organisation Suspended</span>
            <p className="text-rose-200/90 mt-1 font-medium">{org.suspensionReason}</p>
            <span className="text-rose-400/80 text-[11px] block mt-1">
              Suspended At: {new Date(org.suspendedAt || '').toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* THREE CARDS: TOKEN METRICS, RECRUITER USAGE, METADATA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Token Balance */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Token Economy</span>
            <Coins className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-white font-mono">{org.tokenBalance}</span>
            <span className="text-xs text-slate-400 ml-1">tokens active</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1 text-xs text-slate-400">
            <div className="flex justify-between">
              <span>Lifetime Allocated:</span>
              <span className="font-mono text-slate-200">{org.allocatedTokens}</span>
            </div>
            <div className="flex justify-between">
              <span>Lifetime Consumed:</span>
              <span className="font-mono text-slate-200">{org.consumedTokens}</span>
            </div>
          </div>
        </div>

        {/* Member & Capacity */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Recruitment Capacity</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-white font-mono">{org.membersCount}</span>
            <span className="text-xs text-slate-400 ml-1">/ {org.maxRecruiters} seats</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1 text-xs text-slate-400">
            <div className="flex justify-between">
              <span>Plan Tier:</span>
              <span className="font-semibold text-indigo-300">{org.tier}</span>
            </div>
            <div className="flex justify-between">
              <span>Onboarded:</span>
              <span>{new Date(org.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Contact & Profile</span>
            <Building2 className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-3 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Mail className="w-3.5 h-3.5 text-slate-500" />
              <span>{org.contactEmail}</span>
            </div>
            {org.contactPhone && (
              <div className="flex items-center gap-2 text-slate-300">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                <span>{org.contactPhone}</span>
              </div>
            )}
            {org.domain && (
              <div className="flex items-center gap-2 text-slate-300">
                <Globe className="w-3.5 h-3.5 text-slate-500" />
                <a href={`https://${org.domain}`} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">
                  {org.domain}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ORGANISATION ACCESS / SUPER ADMIN */}
      <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Organisation Access</h2>
              <p className="text-[11px] text-slate-400">Tenant administrative credentials & recovery</p>
            </div>
          </div>
        </div>

        {org.superAdmin ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-slate-800/40 border border-slate-800">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs flex-1">
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-semibold block tracking-wider">
                  Super Admin
                </span>
                <span className="font-semibold text-white mt-0.5 block">{org.superAdmin.name}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-semibold block tracking-wider">
                  Email
                </span>
                <span className="font-mono text-slate-200 mt-0.5 block">{org.superAdmin.email}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-semibold block tracking-wider">
                  Role
                </span>
                <span className="font-mono text-indigo-300 mt-0.5 block">{org.superAdmin.role}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-semibold block tracking-wider">
                  Status
                </span>
                <span
                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold mt-0.5 ${
                    org.superAdmin.status === 'ACTIVE'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                  }`}
                >
                  {org.superAdmin.status}
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowResetPasswordModal(true)}
              className="px-3.5 py-2 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 hover:text-amber-200 text-xs font-semibold border border-amber-500/30 transition-colors flex items-center justify-center gap-1.5 shrink-0"
            >
              <KeyRound className="w-3.5 h-3.5" />
              Reset Password
            </button>
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-slate-800/20 border border-slate-800 text-slate-400 text-xs flex items-center justify-between">
            <span>No Organisation Super Admin configured for this organisation.</span>
          </div>
        )}
      </div>

      {/* QUICK ACTIONS */}
      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center justify-between">
        <span className="text-xs text-slate-400">
          Platform Super Admin Operations on <span className="text-white font-semibold">{org.name}</span>
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/platform/token-usage')}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
          >
            Adjust Tokens
          </button>
          <button
            onClick={() => navigate(`/platform/token-transactions?organisationId=${org.id}`)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700"
          >
            View Ledger
          </button>
        </div>
      </div>

      {/* RESET SUPER ADMIN PASSWORD MODAL */}
      {showResetPasswordModal && org.superAdmin && (
        <ResetSuperAdminPasswordModal
          organisationId={org.id}
          organisationName={org.name}
          superAdmin={org.superAdmin}
          onClose={() => setShowResetPasswordModal(false)}
        />
      )}
    </div>
  );
};
