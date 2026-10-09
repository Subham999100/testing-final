// ============================================================
// Clyptus Job Portal - Shared Platform Portal Routes
// Platform Super Admin and Platform Admin use one route hierarchy.
// ============================================================

import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { PlatformProtectedRoute } from '../components/auth/PlatformProtectedRoute';
import { PermissionRoute } from '../components/auth/PermissionRoute';
import { PlatformLayout } from '../layouts/platform/PlatformLayout';
import { SuperAdminLogin } from '../pages/auth/SuperAdminLogin';
import { AdminLogin } from '../pages/auth/AdminLogin';
import { PlatformPortalSelection } from '../pages/auth/PlatformPortalSelection';
import { Dashboard } from '../pages/platform/Dashboard';
import { Organisations } from '../pages/platform/Organisations';
import { OrganisationDetails } from '../pages/platform/OrganisationDetails';
import { PlatformAdmins } from '../pages/platform/PlatformAdmins';
import { TokenPlans } from '../pages/platform/TokenPlans';
import { TokenTransactions } from '../pages/platform/TokenTransactions';
import { TokenUsage } from '../pages/platform/TokenUsage';
import { Analytics } from '../pages/platform/Analytics';
import { AuditLogs } from '../pages/platform/AuditLogs';
import { Security } from '../pages/platform/Security';
import { Settings } from '../pages/platform/Settings';
import { AccessDenied } from '../pages/platform/AccessDenied';

import { Verification } from '../pages/platform/Verification';
import { Monitoring } from '../pages/platform/Monitoring';
import { Users } from '../pages/platform/Users';
import { Support } from '../pages/platform/Support';
import { Notifications } from '../pages/platform/Notifications';
import { Moderation } from '../pages/platform/Moderation';
import { Reports } from '../pages/platform/Reports';
import { OrganisationInvitation } from '../pages/auth/OrganisationInvitation';
import { OrganisationApplicationPage } from '../pages/public/OrganisationApplicationPage';

// Organisation portal (Org Super Admin · Org Admin · Recruiter) — lazy-loaded, lives under /org/*
const OrgPortal = React.lazy(() => import('../portals/org/OrgPortal'));

export const AppRoutes: React.FC = () => (
  <Routes>
    {/* Public Routes */}
    <Route path="/apply" element={<OrganisationApplicationPage />} />
    <Route path="/apply/status" element={<OrganisationApplicationPage />} />
    <Route path="/organisation/apply" element={<Navigate to="/apply" replace />} />
    <Route path="/organisation-invitation" element={<OrganisationInvitation />} />
    <Route path="/" element={<PlatformPortalSelection />} />
    <Route path="/platform/login" element={<PlatformPortalSelection />} />

    {/* Separate, Distinct Role-Specific Login Routes */}
    <Route path="/platform/super-admin/login" element={<SuperAdminLogin />} />
    <Route path="/platform/admin/login" element={<AdminLogin />} />

    {/* Backward Compatibility Redirects */}
    <Route path="/platform/login/super-admin" element={<Navigate to="/platform/super-admin/login" replace />} />
    <Route path="/platform/login/admin" element={<Navigate to="/platform/admin/login" replace />} />

    {/* Protected Platform Routes (shows portal selection if unauthenticated, dashboard if authenticated) */}
    <Route
      path="/platform"
      element={
        <PlatformProtectedRoute fallback={<PlatformPortalSelection />}>
          <PlatformLayout />
        </PlatformProtectedRoute>
      }
    >
      <Route index element={<Dashboard />} />
      <Route path="super-admin" element={<Navigate to="/platform" replace />} />
      <Route path="admin" element={<Navigate to="/platform" replace />} />
      <Route
        path="verifications"
        element={
          <PermissionRoute permission="platform.organisations.read">
            <Verification />
          </PermissionRoute>
        }
      />
      <Route
        path="monitoring"
        element={
          <PermissionRoute permission="platform.organisations.read">
            <Monitoring />
          </PermissionRoute>
        }
      />
      <Route
        path="users"
        element={
          <PermissionRoute permission="platform.users.read">
            <Users />
          </PermissionRoute>
        }
      />
      <Route
        path="support"
        element={
          <PermissionRoute permission="platform.support.read">
            <Support />
          </PermissionRoute>
        }
      />
      <Route
        path="notifications"
        element={
          <PermissionRoute permission="platform.notifications.read">
            <Notifications />
          </PermissionRoute>
        }
      />
      <Route
        path="moderation/jobs"
        element={
          <PermissionRoute permission="platform.moderation.read">
            <Moderation />
          </PermissionRoute>
        }
      />
      <Route
        path="reports"
        element={
          <PermissionRoute permission="platform.reports.generate">
            <Reports />
          </PermissionRoute>
        }
      />

      <Route path="access-denied" element={<AccessDenied />} />

      <Route
        path="organisations"
        element={
          <PermissionRoute permission="platform.organisations.read">
            <Organisations />
          </PermissionRoute>
        }
      />
      <Route
        path="organisations/:id"
        element={
          <PermissionRoute permission="platform.organisations.read">
            <OrganisationDetails />
          </PermissionRoute>
        }
      />

      <Route
        path="admins"
        element={
          <PermissionRoute
            allowedRoles={['PLATFORM_SUPER_ADMIN']}
            permission="platform.admins.read"
          >
            <PlatformAdmins />
          </PermissionRoute>
        }
      />

      <Route
        path="token-plans"
        element={
          <PermissionRoute permission="platform.tokens.read">
            <TokenPlans />
          </PermissionRoute>
        }
      />
      <Route
        path="token-transactions"
        element={
          <PermissionRoute permission="platform.tokens.read">
            <TokenTransactions />
          </PermissionRoute>
        }
      />
      <Route
        path="token-usage"
        element={
          <PermissionRoute permission="platform.tokens.read">
            <TokenUsage />
          </PermissionRoute>
        }
      />

      <Route
        path="analytics"
        element={
          <PermissionRoute permission="platform.analytics.read">
            <Analytics />
          </PermissionRoute>
        }
      />
      <Route
        path="audit-logs"
        element={
          <PermissionRoute permission="platform.audit.read">
            <AuditLogs />
          </PermissionRoute>
        }
      />
      <Route
        path="security"
        element={
          <PermissionRoute permission="platform.security.read">
            <Security />
          </PermissionRoute>
        }
      />
      <Route
        path="settings"
        element={
          <PermissionRoute
            allowedRoles={['PLATFORM_SUPER_ADMIN']}
            permission="platform.settings.read"
          >
            <Settings />
          </PermissionRoute>
        }
      />
    </Route>

    {/* ORGANISATION PORTAL */}
    <Route path="/org/*" element={<React.Suspense fallback={null}><OrgPortal /></React.Suspense>} />

    <Route path="*" element={<Navigate to="/platform" replace />} />
  </Routes>
);
