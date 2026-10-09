// ============================================================
// Clyptus Job Portal - Public Organisation Application Page
// Public entrypoint for organisations to register or track applications
// ============================================================

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Building2, Search, ArrowLeft } from 'lucide-react';
import { Brand } from '../../components/common/Brand';
import { OrganisationApplicationWizard } from '../../features/public/application/OrganisationApplicationWizard';
import { ApplicationStatusTracker } from '../../features/public/application/ApplicationStatusTracker';

export const OrganisationApplicationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'apply' | 'track'>('apply');

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col">
      {/* Public Header */}
      <header className="border-b border-line bg-surface py-3 px-6 shadow-sm sticky top-0 z-30">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Brand />
            <div className="hidden sm:flex items-center gap-1 bg-soft p-1 rounded-lg border border-line text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveTab('apply')}
                className={`px-3 py-1 rounded transition-colors ${
                  activeTab === 'apply' ? 'bg-surface text-ink font-semibold shadow-xs' : 'text-muted hover:text-ink'
                }`}
              >
                Apply for Onboarding
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('track')}
                className={`px-3 py-1 rounded transition-colors ${
                  activeTab === 'track' ? 'bg-surface text-ink font-semibold shadow-xs' : 'text-muted hover:text-ink'
                }`}
              >
                Check Application Status
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/platform/login"
              className="text-xs text-muted hover:text-ink flex items-center gap-1 transition-colors"
            >
              <Shield className="w-3.5 h-3.5" /> Platform Portal
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* Mobile Tab Toggle */}
        <div className="sm:hidden flex items-center gap-1 bg-soft p-1 rounded-lg border border-line text-xs font-medium mb-4">
          <button
            type="button"
            onClick={() => setActiveTab('apply')}
            className={`flex-1 py-1.5 rounded text-center transition-colors ${
              activeTab === 'apply' ? 'bg-surface text-ink font-semibold shadow-xs' : 'text-muted'
            }`}
          >
            Apply
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('track')}
            className={`flex-1 py-1.5 rounded text-center transition-colors ${
              activeTab === 'track' ? 'bg-surface text-ink font-semibold shadow-xs' : 'text-muted'
            }`}
          >
            Check Status
          </button>
        </div>

        {activeTab === 'apply' ? <OrganisationApplicationWizard /> : <ApplicationStatusTracker />}
      </main>

      {/* Clean Footer */}
      <footer className="border-t border-line bg-surface py-4 text-center text-xs text-muted">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} Clyptus Inc. Enterprise Recruitment Platform.</span>
          <div className="flex items-center gap-4">
            <Link to="/platform/login" className="hover:underline">
              Administrative Access
            </Link>
            <span>&middot;</span>
            <Link to="/org/login" className="hover:underline">
              Organisation Workspace
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default OrganisationApplicationPage;
