// ============================================================
// Clyptus Job Portal - Platform Super Admin Layout
// Dedicated layout with navigation, system telemetry badge,
// breadcrumbs, quick search, and session controls.
// ============================================================

import React, { useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Users2,
  Coins,
  TrendingUp,
  ShieldCheck,
  Sliders,
  Bell,
  Search,
  LogOut,
  ChevronRight,
  Shield,
  Zap,
  Activity,
  Layers,
  FileText,
  KeyRound,
  Sparkles,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';

export const PlatformLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, notificationsCount } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');

  // Breadcrumbs builder
  const pathSnippets = location.pathname.split('/').filter((i) => i);
  const breadcrumbItems = pathSnippets.map((snippet, index) => {
    const url = `/${pathSnippets.slice(0, index + 1).join('/')}`;
    const formatted = snippet.charAt(0).toUpperCase() + snippet.slice(1).replace(/-/g, ' ');
    return { name: formatted, url };
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/platform/organisations?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const navGroups = [
    {
      label: 'CORE PLATFORM',
      items: [
        { name: 'Dashboard', path: '/platform', icon: LayoutDashboard },
        { name: 'Organisations', path: '/platform/organisations', icon: Building2 },
        { name: 'Platform Admins', path: '/platform/admins', icon: Users2 },
      ],
    },
    {
      label: 'TOKEN SYSTEM',
      items: [
        { name: 'Token Plans & Pricing', path: '/platform/token-plans', icon: Coins },
        { name: 'Ledger Transactions', path: '/platform/token-transactions', icon: FileText },
        { name: 'Usage & Allocations', path: '/platform/token-usage', icon: Layers },
      ],
    },
    {
      label: 'INTELLIGENCE & INSIGHTS',
      items: [{ name: 'Platform Analytics', path: '/platform/analytics', icon: TrendingUp }],
    },
    {
      label: 'GOVERNANCE & SECURITY',
      items: [
        { name: 'Central Audit Logs', path: '/platform/audit-logs', icon: Activity },
        { name: 'Security & Sessions', path: '/platform/security', icon: ShieldCheck },
        { name: 'System Settings', path: '/platform/settings', icon: Sliders },
      ],
    },
  ];

  return (
    <div className="flex h-screen w-full bg-[#080d1a] text-slate-100 overflow-hidden font-sans">
      {/* SIDEBAR */}
      <aside className="w-64 flex flex-col border-r border-slate-800 bg-[#0f172a]/95 backdrop-blur-xl z-30 select-none">
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 p-[1.5px] shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-[#0b0f19] rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <span className="text-base font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                CLYPTUS
              </span>
              <span className="block text-[10px] font-semibold tracking-wider text-emerald-400 uppercase">
                SUPER ADMIN
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navGroups.map((group) => (
            <div key={group.label}>
              <div className="px-3 mb-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                {group.label}
              </div>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.path === '/platform'
                      ? location.pathname === '/platform'
                      : location.pathname.startsWith(item.path);

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === '/platform'}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span>{item.name}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Security & User Badge */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-900/40">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 border border-indigo-500/30">
                {user?.firstName?.[0] || 'S'}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-slate-200 truncate leading-tight">
                  {user?.firstName} {user?.lastName}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-[10px] font-mono text-emerald-400 font-medium">SUPER ADMIN</span>
                </div>
              </div>
            </div>
            <button
              onClick={logout}
              title="End Secure Session"
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-800 bg-[#0c1222]/80 backdrop-blur-md px-6 flex items-center justify-between z-20">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="hover:text-slate-200 cursor-pointer">Platform</span>
            {breadcrumbItems.map((b, i) => (
              <React.Fragment key={b.url}>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                <span
                  className={`${
                    i === breadcrumbItems.length - 1
                      ? 'text-indigo-400 font-semibold'
                      : 'hover:text-slate-200'
                  }`}
                >
                  {b.name}
                </span>
              </React.Fragment>
            ))}
          </div>

          {/* Search & Actions */}
          <div className="flex items-center gap-4">
            <form onSubmit={handleSearchSubmit} className="relative w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search organisations, admins, tokens..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-slate-900/90 border border-slate-700/70 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
              />
            </form>

            {/* Platform Status Pulse */}
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>Cluster Online</span>
            </div>

            {/* Notifications */}
            <button
              onClick={() => navigate('/platform/security')}
              className="relative p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
              title="Security alerts & notifications"
            >
              <Bell className="w-4 h-4" />
              {notificationsCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-indigo-500 text-[10px] font-bold text-white rounded-full flex items-center justify-center">
                  {notificationsCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Page View Container */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#080d1a]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
