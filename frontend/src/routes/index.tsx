// ============================================================
// Clyptus Job Portal - Platform Super Admin Routes
// ============================================================

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PlatformLayout } from '../layouts/platform/PlatformLayout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { Login } from '../pages/platform/Login';
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

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* PUBLIC AUTH ROUTE */}
      <Route path="/platform/login" element={<Login />} />

      {/* PROTECTED PLATFORM ADMIN & SUPER ADMIN PORTAL */}
      <Route element={<ProtectedRoute />}>
        <Route path="/platform" element={<PlatformLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="organisations" element={<Organisations />} />
          <Route path="organisations/:id" element={<OrganisationDetails />} />
          <Route path="admins" element={<PlatformAdmins />} />
          <Route path="token-plans" element={<TokenPlans />} />
          <Route path="token-transactions" element={<TokenTransactions />} />
          <Route path="token-usage" element={<TokenUsage />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="audit-logs" element={<AuditLogs />} />
          <Route path="security" element={<Security />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Route>

      {/* Root & Fallback Redirects */}
      <Route path="/" element={<Navigate to="/platform" replace />} />
      <Route path="*" element={<Navigate to="/platform" replace />} />
    </Routes>
  );
};
