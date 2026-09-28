// ============================================================
// Clyptus Job Portal - Shared Platform Sidebar
// Reusable by both Platform Super Admin and Platform Admin.
// Navigation links are rendered conditionally based on permissions.
// ============================================================

import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Users2,
  Coins,
  TrendingUp,
  ShieldCheck,
  Sliders,
  LogOut,
  Sparkles,
  Layers,
  FileText,
  Activity,
  Lock,
} from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuthStore } from '../../store/auth.store';

export const PlatformSidebar: React.FC = () => {
  const location = useLocation();
  const { user, isSuperAdmin, hasPermission } = usePermissions();
  const { logout, loginAsSuperAdmin, loginAsPlatformAdmin } = useAuthStore();

  const navGroups = [
    {
      label: 'CORE PLATFORM',
      items: [
        { name: 'Dashboard', path: '/platform', icon: LayoutDashboard },
        {
          name: 'Organisations',
          path: '/platform/organisations',
          icon: Building2,
          permission: 'platform.organisations.read',
        },
        {
          name: 'Platform Admins',
          path: '/platform/admins',
          icon: Users2,
          permission: 'platform.admins.read', // Super Admin only
        },
      ],
    },
    {
      label: 'TOKEN SYSTEM',
      items: [
        {
          name: 'Token Plans & Pricing',
          path: '/platform/token-plans',
          icon: Coins,
          permission: 'platform.tokens.read',
        },
        {
          name: 'Ledger Transactions',
          path: '/platform/token-transactions',
          icon: FileText,
          permission: 'platform.tokens.read',
        },
        {
          name: 'Usage & Allocations',
          path: '/platform/token-usage',
          icon: Layers,
          permission: 'platform.tokens.read',
        },
      ],
    },
    {
      label: 'INTELLIGENCE & INSIGHTS',
      items: [
        {
          name: 'Platform Analytics',
          path: '/platform/analytics',
          icon: TrendingUp,
          permission: 'platform.analytics.read',
        },
      ],
    },
    {
      label: 'GOVERNANCE & SECURITY',
      items: [
        {
          name: 'Central Audit Logs',
          path: '/platform/audit-logs',
          icon: Activity,
          permission: 'platform.audit.read',
        },
        {
          name: 'Security & Sessions',
          path: '/platform/security',
          icon: ShieldCheck,
          permission: 'platform.security.read',
        },
        {
          name: 'System Settings',
          path: '/platform/settings',
          icon: Sliders,
          permission: 'platform.settings.read',
        },
      ],
    },
  ];

  return (
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
            <span
              className={`block text-[10px] font-semibold tracking-wider uppercase ${
                isSuperAdmin ? 'text-emerald-400' : 'text-indigo-400'
              }`}
            >
              {isSuperAdmin ? 'SUPER ADMIN' : 'PLATFORM ADMIN'}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Sections (Filtered by Permissions) */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter(
            (item) => !item.permission || hasPermission(item.permission),
          );

          if (visibleItems.length === 0) return null;

          return (
            <div key={group.label}>
              <div className="px-3 mb-2 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                {group.label}
              </div>
              <div className="space-y-1">
                {visibleItems.map((item) => {
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
          );
        })}
      </div>

      {/* Role Switcher in Dev / Session Badge */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-900/40 space-y-2">
        {/* Quick Role Toggle to test Platform Admin view vs Super Admin view */}
        <div className="flex items-center justify-between text-[10px] px-1 text-slate-400">
          <span>Dev Role Simulator:</span>
          <div className="flex gap-1 font-mono">
            <button
              onClick={loginAsSuperAdmin}
              className={`px-1.5 py-0.5 rounded ${
                isSuperAdmin ? 'bg-emerald-500/20 text-emerald-400 font-bold' : 'hover:text-white'
              }`}
            >
              Super
            </button>
            <span>/</span>
            <button
              onClick={() => loginAsPlatformAdmin()}
              className={`px-1.5 py-0.5 rounded ${
                !isSuperAdmin ? 'bg-indigo-500/20 text-indigo-400 font-bold' : 'hover:text-white'
              }`}
            >
              Admin
            </button>
          </div>
        </div>

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
                <span className="text-[10px] font-mono text-emerald-400 font-medium">
                  {user?.role === 'PLATFORM_SUPER_ADMIN' ? 'SUPER ADMIN' : 'PLATFORM ADMIN'}
                </span>
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
  );
};
