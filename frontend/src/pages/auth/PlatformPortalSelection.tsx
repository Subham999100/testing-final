import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Crown,
  ShieldCheck,
  Users,
  SlidersHorizontal,
  Building2,
  CircleCheck,
  ArrowRight,
  Layers,
  Lock,
} from 'lucide-react';
import { Brand } from '../../components/common/Brand';
import { useAuthStore } from '../../store/auth.store';

export const PlatformPortalSelection: React.FC = () => {
  const location = useLocation();
  const { isHydrating } = useAuthStore();

  return (
    <div className="portal-landing">
      <header className="public-header">
        <div className="container public-header-inner">
          <Brand />
          <span className="header-caption">
            <ShieldCheck aria-hidden="true" />
            Authorized platform access
          </span>
        </div>
      </header>

      <main className="landing-main container">
        <div className="landing-heading">
          <p className="eyebrow">One platform. Shared possibilities.</p>
          <h1>Clyptus Platform Portal</h1>
          <p>
            Choose your administrative workspace to access platform governance or daily operations.
          </p>
        </div>

        {isHydrating && (
          <p role="status" className="text-center text-muted mb-4">
            Restoring your session...
          </p>
        )}

        <div className="narrow-container portal-choices">
          {/* Choice 1: Super Admin */}
          <section className="portal-choice" aria-labelledby="super-admin-choice">
            <div className="choice-header">
              <span className="icon-well">
                <Crown aria-hidden="true" />
              </span>
              <span className="choice-number">01 / GOVERNANCE</span>
            </div>
            <h2 id="super-admin-choice">Super Admin</h2>
            <p>
              Guide the platform, manage administrators and oversee system-wide governance.
            </p>
            <ul className="choice-details">
              <li>
                <Users aria-hidden="true" />
                Platform administrators & root control
              </li>
              <li>
                <SlidersHorizontal aria-hidden="true" />
                Global configuration & security policies
              </li>
              <li>
                <Layers aria-hidden="true" />
                Token economy & tenant tiering
              </li>
            </ul>
            <Link
              to="/platform/super-admin/login"
              state={location.state}
              className="button button-primary button-large"
            >
              Super Admin Login
              <ArrowRight aria-hidden="true" />
            </Link>
          </section>

          {/* Choice 2: Admin */}
          <section className="portal-choice" aria-labelledby="admin-choice">
            <div className="choice-header">
              <span className="icon-well">
                <ShieldCheck aria-hidden="true" />
              </span>
              <span className="choice-number">02 / OPERATIONS</span>
            </div>
            <h2 id="admin-choice">Admin</h2>
            <p>
              Keep daily operations moving, support organizations and review platform activity.
            </p>
            <ul className="choice-details">
              <li>
                <Building2 aria-hidden="true" />
                Organization onboarding & verification
              </li>
              <li>
                <CircleCheck aria-hidden="true" />
                Tenant support & platform operations
              </li>
              <li>
                <Lock aria-hidden="true" />
                Recruitment moderation & queues
              </li>
            </ul>
            <Link
              to="/platform/admin/login"
              state={location.state}
              className="button button-primary button-large"
            >
              Admin Login
              <ArrowRight aria-hidden="true" />
            </Link>
          </section>
        </div>

        <div className="mt-8 p-4 rounded-xl border border-line bg-surface max-w-xl mx-auto flex items-center justify-between text-xs">
          <div>
            <span className="font-semibold text-ink block">New to Clyptus?</span>
            <span className="text-muted">Register your organisation to access multi-tenant hiring tools.</span>
          </div>
          <Link
            to="/apply"
            className="button button-secondary button-small whitespace-nowrap ml-4 flex items-center gap-1"
          >
            Apply for Onboarding <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <p className="access-note">
          Use the login portal assigned to your role. All administrative actions are permission-controlled, cryptographically authenticated, and audited.
        </p>
      </main>

      <footer className="public-footer">
        <div className="container">
          <span>Clyptus Software Solutions</span>
          <span>People. Organizations. Opportunity.</span>
        </div>
      </footer>
    </div>
  );
};
