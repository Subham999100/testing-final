// ============================================================
// Clyptus Landing Page - Section 3.1: Sticky Navbar
// Blurred translucent backdrop on scroll, dropdown for Career Tools,
// accessible mobile drawer sheet, login/register CTAs.
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../shared/Logo';
import {
  ChevronDown,
  Menu,
  X,
  FileCheck2,
  FileEdit,
  Video,
  Bot,
  Briefcase,
  Building2,
  MapPin,
  BookOpen,
  Info,
  Sparkles,
} from 'lucide-react';

interface NavbarProps {
  onOpenSignInModal: (title?: string) => void;
  onOpenComingSoonModal: (featureName?: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenSignInModal: _onOpenSignInModal,
  onOpenComingSoonModal,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [toolsDropdownOpen, setToolsDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Monitor scroll for blurred backdrop
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setToolsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Smooth scroll handler for anchor links
  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    setToolsDropdownOpen(false);
    setMobileMenuOpen(false);
    const elem = document.getElementById(targetId);
    if (elem) {
      const offset = 80;
      const elementPosition = elem.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  const careerTools = [
    {
      id: 'ats',
      name: 'ATS Score Checker',
      desc: 'Analyze resume parsing compatibility',
      icon: FileCheck2,
    },
    {
      id: 'resume-builder',
      name: 'ATS Resume Builder',
      desc: 'Live formatted A4 resume editor',
      icon: FileEdit,
    },
    {
      id: 'video-profile',
      name: 'AI Video Profile',
      desc: '3-minute structured video pitch',
      icon: Video,
    },
    {
      id: 'video-interview',
      name: 'AI Video Interview',
      desc: '15-minute verification showcase',
      icon: Bot,
    },
  ];

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-200 ${
        isScrolled
          ? 'bg-[#FAF7F2]/90 backdrop-blur-md border-b border-[#E5D9CF] shadow-xs'
          : 'bg-[#FAF7F2] border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand */}
        <Logo size="md" />

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-7" aria-label="Main Navigation">
          <a
            href="#jobs"
            onClick={(e) => handleAnchorClick(e, 'jobs')}
            className="text-sm font-medium text-[#171614] hover:text-[#E8630A] transition-colors"
          >
            Jobs
          </a>

          <a
            href="#companies"
            onClick={(e) => handleAnchorClick(e, 'companies')}
            className="text-sm font-medium text-[#171614] hover:text-[#E8630A] transition-colors"
          >
            Companies
          </a>

          <a
            href="#map"
            onClick={(e) => handleAnchorClick(e, 'map')}
            className="text-sm font-medium text-[#171614] hover:text-[#E8630A] transition-colors flex items-center gap-1.5"
          >
            <MapPin className="w-3.5 h-3.5 text-[#E8630A]" />
            <span>Map</span>
          </a>

          {/* Career Tools Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setToolsDropdownOpen(!toolsDropdownOpen)}
              className="text-sm font-medium text-[#171614] hover:text-[#E8630A] transition-colors flex items-center gap-1 py-2 focus:outline-none"
              aria-expanded={toolsDropdownOpen}
              aria-haspopup="true"
            >
              <span>Career Tools</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  toolsDropdownOpen ? 'rotate-180 text-[#E8630A]' : 'text-[#62564E]'
                }`}
              />
            </button>

            {toolsDropdownOpen && (
              <div
                className="absolute left-0 mt-2 w-80 rounded-2xl bg-[#FFFDF9] border border-[#E5D9CF] shadow-xl p-3 z-50 animate-in fade-in zoom-in-95 duration-100"
                role="menu"
              >
                <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[#8C7E74] border-b border-[#E5D9CF]/60">
                  Interactive AI & ATS Tools
                </div>
                <div className="py-1 space-y-1">
                  {careerTools.map((tool) => {
                    const Icon = tool.icon;
                    return (
                      <a
                        key={tool.id}
                        href={`#${tool.id}`}
                        onClick={(e) => handleAnchorClick(e, tool.id)}
                        className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-[#FAF7F2] transition-colors text-decoration-none group"
                        role="menuitem"
                      >
                        <div className="p-2 rounded-lg bg-[#FCEFE6] text-[#E8630A] group-hover:bg-[#E8630A] group-hover:text-white transition-colors shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-[#171614] group-hover:text-[#E8630A] transition-colors">
                            {tool.name}
                          </div>
                          <div className="text-[11px] text-[#62564E]">
                            {tool.desc}
                          </div>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <a
            href="#swipe"
            onClick={(e) => handleAnchorClick(e, 'swipe')}
            className="text-sm font-medium text-[#171614] hover:text-[#E8630A] transition-colors flex items-center gap-1"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#E8630A]" />
            <span>Swipe Deck</span>
          </a>

          <a
            href="#faq"
            onClick={(e) => handleAnchorClick(e, 'faq')}
            className="text-sm font-medium text-[#171614] hover:text-[#E8630A] transition-colors"
          >
            Resources & FAQ
          </a>
        </nav>

        {/* Right Action CTAs */}
        <div className="hidden lg:flex items-center gap-5">
          <button
            onClick={() => onOpenComingSoonModal('Recruiter & Employer Workspace')}
            className="text-xs font-medium text-[#62564E] hover:text-[#E8630A] transition-colors"
          >
            For Recruiters
          </button>

          <div className="h-4 w-px bg-[#E5D9CF]" />

          <Link
            to="/login"
            className="text-sm font-semibold text-[#171614] hover:text-[#E8630A] transition-colors px-2 py-1"
          >
            Sign In
          </Link>

          <Link
            to="/register"
            className="px-5 py-2.5 rounded-xl bg-[#E8630A] hover:bg-[#D05300] text-white font-semibold text-sm transition-all duration-150 shadow-sm hover:shadow text-decoration-none"
          >
            Register Free
          </Link>
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex lg:hidden items-center gap-2">
          <Link
            to="/register"
            className="px-3.5 py-1.5 rounded-lg bg-[#E8630A] text-white font-semibold text-xs text-decoration-none"
          >
            Register
          </Link>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-[#171614] hover:bg-[#FAF7F2] transition-colors"
            aria-label="Toggle mobile menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Slide-Over Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#FAF7F2] border-b border-[#E5D9CF] px-6 py-6 space-y-5 animate-in slide-in-from-top-4 duration-150 shadow-lg">
          <div className="grid grid-cols-2 gap-3 text-sm font-medium">
            <a
              href="#jobs"
              onClick={(e) => handleAnchorClick(e, 'jobs')}
              className="p-3 rounded-xl bg-[#FFFDF9] border border-[#E5D9CF] text-[#171614] flex items-center gap-2"
            >
              <Briefcase className="w-4 h-4 text-[#E8630A]" />
              <span>Jobs</span>
            </a>
            <a
              href="#companies"
              onClick={(e) => handleAnchorClick(e, 'companies')}
              className="p-3 rounded-xl bg-[#FFFDF9] border border-[#E5D9CF] text-[#171614] flex items-center gap-2"
            >
              <Building2 className="w-4 h-4 text-[#E8630A]" />
              <span>Companies</span>
            </a>
            <a
              href="#map"
              onClick={(e) => handleAnchorClick(e, 'map')}
              className="p-3 rounded-xl bg-[#FFFDF9] border border-[#E5D9CF] text-[#171614] flex items-center gap-2"
            >
              <MapPin className="w-4 h-4 text-[#E8630A]" />
              <span>India Map</span>
            </a>
            <a
              href="#swipe"
              onClick={(e) => handleAnchorClick(e, 'swipe')}
              className="p-3 rounded-xl bg-[#FFFDF9] border border-[#E5D9CF] text-[#171614] flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-[#E8630A]" />
              <span>Swipe Deck</span>
            </a>
          </div>

          <div className="space-y-2 pt-2 border-t border-[#E5D9CF]">
            <div className="text-xs font-bold uppercase tracking-wider text-[#8C7E74]">
              Career Tools
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {careerTools.map((t) => (
                <a
                  key={t.id}
                  href={`#${t.id}`}
                  onClick={(e) => handleAnchorClick(e, t.id)}
                  className="p-2.5 rounded-lg text-xs font-medium text-[#171614] hover:bg-[#FFFDF9] flex items-center gap-2"
                >
                  <t.icon className="w-3.5 h-3.5 text-[#E8630A]" />
                  <span>{t.name}</span>
                </a>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-[#E5D9CF] flex flex-col gap-2.5">
            <Link
              to="/login"
              className="w-full py-2.5 text-center rounded-xl bg-[#FFFDF9] border border-[#E5D9CF] text-sm font-semibold text-[#171614]"
            >
              Sign In to Account
            </Link>
            <Link
              to="/register"
              className="w-full py-2.5 text-center rounded-xl bg-[#E8630A] text-white text-sm font-semibold"
            >
              Create Free Profile
            </Link>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenComingSoonModal('Recruiter & Employer Workspace');
              }}
              className="text-xs text-center text-[#62564E] py-1"
            >
              Are you an employer? Post a job
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
