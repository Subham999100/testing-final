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
} from 'lucide-react';
import { PlatformService } from '../../services/platform.service';
import { Organisation } from '../../types/platform.types';

export const OrganisationDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [org, setOrg] = useState<Organisation | null>(null);
  const [loading, setLoading] = useState(true);

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
    </div>
  );
};
