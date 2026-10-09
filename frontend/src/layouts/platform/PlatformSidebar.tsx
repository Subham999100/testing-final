// ============================================================
// Clyptus Job Portal - Shared Platform Sidebar
// Reusable by both Platform Super Admin and Platform Admin.
// Navigation options are grouped into main category dropdowns
// and filtered strictly based on assigned permissions.
// ============================================================

import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Users2,
  Coins,
  TrendingUp,
  ShieldCheck,
  Sliders,
  LogOut,
  Layers,
  FileText,
  Activity,
  ChevronDown,
  ChevronRight,
  Shield,
  FileCheck,
  Bell,
  AlertTriangle,
  Receipt,
  UserCheck,
} from 'lucide-react';
import { Brand } from '../../components/common/Brand';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuthStore } from '../../store/auth.store';

export const PlatformSidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isSuperAdmin, hasPermission } = usePermissions();
  const { logout } = useAuthStore();

  const navGroups = [
    {
      label: 'CORE PLATFORM',
      icon: Layers,
      items: [
        { name: 'Dashboard', path: '/platform', icon: LayoutDashboard },
        {
          name: 'Verification',
          path: '/platform/verifications',
          icon: FileCheck,
          permission: 'platform.organisations.read',
        },
        {
          name: 'Monitoring',
          path: '/platform/monitoring',
          icon: Activity,
          permission: 'platform.organisations.read',
        },
        {
          name: 'Users',
          path: '/platform/users',
          icon: UserCheck,
          permission: 'platform.users.read',
        },
        {
          name: 'Support',
          path: '/platform/support',
          icon: FileText,
          permission: 'platform.support.read',
        },
        {
          name: 'Notifications',
          path: '/platform/notifications',
          icon: Bell,
          permission: 'platform.notifications.read',
        },
        {
          name: 'Moderation',
          path: '/platform/moderation/jobs',
          icon: AlertTriangle,
          permission: 'platform.moderation.read',
        },
        {
          name: 'Reports',
          path: '/platform/reports',
          icon: FileText,
          permission: 'platform.reports.generate',
        },
        {
          name: 'Organisations',
          path: '/platform/organisations',
          icon: Building2,
          permission: 'platform.organisations.read',
        },
      ],
    },
    {
      label: 'GOVERNANCE & ADMINS',
      icon: Users2,
      items: [
        {
          name: 'Platform Admins',
          path: '/platform/admins',
          icon: Users2,
          permission: 'platform.admins.read',
          superAdminOnly: true,
        },
      ],
    },
    {
      label: 'TOKEN SYSTEM & BILLING',
      icon: Coins,
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
          icon: Receipt,
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
      label: 'ANALYTICS & INSIGHTS',
      icon: TrendingUp,
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
      label: 'SECURITY & SYSTEM',
      icon: ShieldCheck,
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
          superAdminOnly: true,
        },
      ],
    },
  ];

  // Initialize category dropdown collapse state
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initialState: Record<string, boolean> = {};
    navGroups.forEach((group) => {
      // Open group by default if current path matches any item in group
      const hasActive = group.items.some((item) =>
        item.path === '/platform'
          ? location.pathname === '/platform'
          : location.pathname.startsWith(item.path)
      );
      initialState[group.label] = hasActive || true; // Keep open by default for easy scanning
    });
    return initialState;
  });

  // Auto-expand group when route changes
  useEffect(() => {
    navGroups.forEach((group) => {
      const hasActive = group.items.some((item) =>
        item.path === '/platform'
          ? location.pathname === '/platform'
          : location.pathname.startsWith(item.path)
      );
      if (hasActive) {
        setOpenGroups((prev) => ({ ...prev, [group.label]: true }));
      }
    });
  }, [location.pathname]);

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <aside className="platform-sidebar flex flex-col h-full bg-surface border-r border-line text-ink select-none">
      {/* Brand Header */}
      <div className="sidebar-brand p-4 border-b border-line">
        <Brand subtitle={isSuperAdmin ? 'Super Admin' : 'Platform Admin'} />
      </div>

      {/* Dropdown Nav List */}
      <nav aria-label="Platform navigation" className="sidebar-nav flex-1 overflow-y-auto p-3 space-y-3">
        {navGroups.map((group) => {
          // Filter items based on user role and permissions
          const visibleItems = group.items.filter((item) => {
            if ('superAdminOnly' in item && item.superAdminOnly && !isSuperAdmin) return false;
            return !item.permission || hasPermission(item.permission);
          });

          // If no permitted items in this group, hide the entire category dropdown
          if (!visibleItems.length) return null;

          const isOpen = !!openGroups[group.label];
          const hasActiveChild = visibleItems.some((item) =>
            item.path === '/platform'
              ? location.pathname === '/platform'
              : location.pathname.startsWith(item.path)
          );

          return (
            <div key={group.label} className="sidebar-group border border-line/50 rounded-xl overflow-hidden bg-soft/30 transition-all">
              {/* Category Dropdown Header Toggle Button */}
              <button
                type="button"
                onClick={() => toggleGroup(group.label)}
                className={`w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold tracking-wider uppercase transition-colors text-muted hover:text-ink ${
                  hasActiveChild ? 'text-orange-600 bg-orange-50/40' : 'hover:bg-soft/60'
                }`}
                aria-expanded={isOpen}
              >
                <div className="flex items-center gap-2">
                  <group.icon className="w-3.5 h-3.5 text-muted shrink-0" />
                  <span>{group.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface border border-line text-muted">
                    {visibleItems.length}
                  </span>
                  {isOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-muted transition-transform" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-muted transition-transform" />
                  )}
                </div>
              </button>

              {/* Collapsible Dropdown Items Container */}
              {isOpen && (
                <div className="p-1.5 space-y-0.5 bg-surface border-t border-line/40 animate-in fade-in duration-150">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const active =
                      item.path === '/platform'
                        ? location.pathname === '/platform'
                        : location.pathname.startsWith(item.path);

                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/platform'}
                        className={`sidebar-link flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          active
                            ? 'is-active bg-orange-600 text-white font-semibold shadow-2xs'
                            : 'text-ink hover:bg-soft hover:text-orange-600'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span className="truncate">{item.name}</span>
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User Footer & Logout */}
      <div className="p-3 border-t border-line bg-surface">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 border border-orange-200 flex items-center justify-center font-bold text-xs shrink-0">
            {user?.firstName?.[0] || 'A'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-ink truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-[10px] text-muted truncate font-mono">
              {isSuperAdmin ? 'Super Admin' : 'Platform Admin'}
            </p>
          </div>
          <button
            type="button"
            aria-label="Sign out"
            title="Sign out"
            className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger-soft transition-colors"
            onClick={async () => {
              await logout();
              navigate('/platform/login', { replace: true });
            }}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

