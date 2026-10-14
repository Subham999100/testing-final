// ============================================================
// Clyptus Landing Page - Section 3.19: Footer
// Dark warm editorial footer, signature logo, social icons,
// 4-column link directory, copyright, and smooth back-to-top button.
// ============================================================

import React from 'react';
import { Logo } from '../shared/Logo';
import { Link } from 'react-router-dom';
import { ArrowUp, Github, Linkedin, Twitter, Globe, Shield } from 'lucide-react';

interface FooterProps {
  onOpenComingSoonModal: (featureName?: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenComingSoonModal }) => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLinkClick = (e: React.MouseEvent, title: string) => {
    e.preventDefault();
    onOpenComingSoonModal(title);
  };

  return (
    <footer className="bg-[#171614] text-[#D7C7B8] pt-16 pb-12 border-t border-[#2D2825]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Top Grid: Logo & Tagline + 4 Link Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10">
          {/* Brand & Mission (4 cols) */}
          <div className="lg:col-span-4 space-y-5">
            <Logo variant="dark" size="md" />

            <p className="text-xs sm:text-sm text-[#A8988B] leading-relaxed max-w-sm">
              A premium job platform for professionals who want meaningful work,
              better opportunities and a clearer path forward.
            </p>

            {/* Social Icons */}
            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-xl bg-[#2D2825] hover:bg-[#E8630A] text-white flex items-center justify-center transition-colors"
                aria-label="Clyptus LinkedIn"
              >
                <Linkedin className="w-4 h-4" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-xl bg-[#2D2825] hover:bg-[#E8630A] text-white flex items-center justify-center transition-colors"
                aria-label="Clyptus Twitter"
              >
                <Twitter className="w-4 h-4" />
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-xl bg-[#2D2825] hover:bg-[#E8630A] text-white flex items-center justify-center transition-colors"
                aria-label="Clyptus GitHub"
              >
                <Github className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Column 1: Candidate (2 cols) */}
          <div className="lg:col-span-2 space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-[#FAF7F2]">
              Candidate
            </h5>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="#jobs"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('jobs')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="hover:text-white transition-colors"
                >
                  Browse Jobs
                </a>
              </li>
              <li>
                <a
                  href="#map"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('map')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="hover:text-white transition-colors"
                >
                  Explore India Map
                </a>
              </li>
              <li>
                <a
                  href="#ats"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('ats')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="hover:text-white transition-colors"
                >
                  ATS Score Checker
                </a>
              </li>
              <li>
                <a
                  href="#resume-builder"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('resume-builder')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="hover:text-white transition-colors"
                >
                  Resume Builder
                </a>
              </li>
              <li>
                <Link to="/register" className="hover:text-white transition-colors">
                  Create Account
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Companies (2 cols) */}
          <div className="lg:col-span-2 space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-[#FAF7F2]">
              Companies
            </h5>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="#companies"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('companies')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="hover:text-white transition-colors"
                >
                  Featured Employers
                </a>
              </li>
              <li>
                <button
                  type="button"
                  onClick={(e) => handleLinkClick(e, 'Hiring Solutions')}
                  className="hover:text-white transition-colors text-left"
                >
                  Hiring Solutions
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={(e) => handleLinkClick(e, 'Post a Job')}
                  className="hover:text-white transition-colors text-left"
                >
                  Post a Job
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={(e) => handleLinkClick(e, 'Recruiter Search')}
                  className="hover:text-white transition-colors text-left"
                >
                  Talent Search
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Company (2 cols) */}
          <div className="lg:col-span-2 space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-[#FAF7F2]">
              Company
            </h5>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  type="button"
                  onClick={(e) => handleLinkClick(e, 'About Clyptus')}
                  className="hover:text-white transition-colors text-left"
                >
                  About Us
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={(e) => handleLinkClick(e, 'Engineering Blog')}
                  className="hover:text-white transition-colors text-left"
                >
                  Engineering Blog
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={(e) => handleLinkClick(e, 'Careers at Clyptus')}
                  className="hover:text-white transition-colors text-left"
                >
                  Careers
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={(e) => handleLinkClick(e, 'Platform Press')}
                  className="hover:text-white transition-colors text-left"
                >
                  Press & Media
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: Legal & Trust (2 cols) */}
          <div className="lg:col-span-2 space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-[#FAF7F2]">
              Legal & Trust
            </h5>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  type="button"
                  onClick={(e) => handleLinkClick(e, 'Privacy Policy')}
                  className="hover:text-white transition-colors text-left"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={(e) => handleLinkClick(e, 'Terms of Service')}
                  className="hover:text-white transition-colors text-left"
                >
                  Terms of Service
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={(e) => handleLinkClick(e, 'Candidate Data Protection')}
                  className="hover:text-white transition-colors text-left"
                >
                  Data Protection (DPDP)
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={(e) => handleLinkClick(e, 'Security Whitepaper')}
                  className="hover:text-white transition-colors text-left"
                >
                  Security Standards
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Back to Top */}
        <div className="pt-8 border-t border-[#2D2825] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#8C7E74]">
          <div>
            © 2026 Clyptus. All rights reserved.
          </div>

          <button
            type="button"
            onClick={scrollToTop}
            className="flex items-center gap-1.5 hover:text-white transition-colors"
          >
            <span>Back to top</span>
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </footer>
  );
};
