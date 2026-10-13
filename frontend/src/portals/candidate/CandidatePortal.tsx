// ============================================================
// Clyptus Job Portal - Candidate Portal Main Router
// Mounts public candidate discovery and authenticated workspace
// ============================================================

import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import './candidate.css';
import { PublicLayout } from './layout/PublicLayout';
import { CandidateShell } from './layout/CandidateShell';
import { ProtectedCandidateRoute } from './components/ProtectedCandidateRoute';
import { HomePage as LegacyLanding } from './pages/public/HomePage';
// To restore legacy landing page, replace <LandingPage /> below with <LegacyLanding />
import { LandingPage } from '@/features/landing';
import { JobsPage } from './pages/public/JobsPage';
import { JobDetailPage } from './pages/public/JobDetailPage';
import { LoginPage } from './pages/public/LoginPage';
import { RegisterPage } from './pages/public/RegisterPage';
import { OnboardingPage } from './pages/onboarding/OnboardingPage';
import { DashboardPage } from './pages/workspace/DashboardPage';
import { ApplicationsPage } from './pages/workspace/ApplicationsPage';
import { ApplicationDetailPage } from './pages/workspace/ApplicationDetailPage';
import { ProfilePage } from './pages/workspace/ProfilePage';
import { ResumePage } from './pages/workspace/ResumePage';
import { PageSkeleton } from '@/portals/org/ui/ui';

export default function CandidatePortal() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        {/* Public Landing Page */}
        <Route index element={<LandingPage />} />

        {/* Public Discovery & Auth Pages */}
        <Route element={<PublicLayout />}>
          <Route path="jobs" element={<JobsPage />} />
          <Route path="jobs/:id" element={<JobDetailPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
        </Route>

        {/* Candidate 5-Step Onboarding */}
        <Route path="onboarding" element={<OnboardingPage />} />

        {/* Authenticated Candidate Workspace */}
        <Route
          path="candidate"
          element={
            <ProtectedCandidateRoute>
              <CandidateShell />
            </ProtectedCandidateRoute>
          }
        >
          <Route index element={<Navigate to="/candidate/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="applications" element={<ApplicationsPage />} />
          <Route path="applications/:id" element={<ApplicationDetailPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="resume" element={<ResumePage />} />
        </Route>

        {/* Fallback to candidate home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
