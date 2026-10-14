import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Briefcase,
  FileText,
  LayoutDashboard,
  LogOut,
  Search,
  User,
  Bookmark,
  Bell,
  Settings,
  MoreHorizontal,
  ChevronDown,
  X,
} from 'lucide-react';
import { useCandidateAuth } from '../lib/session';
import { NotificationPopover } from '../components/NotificationPopover';
import { Footer } from './Footer';
import '../candidate.css';

export const CandidateShell: React.FC = () => {
  const { user, logout } = useCandidateAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);

  const avatarRef = useRef<HTMLDivElement>(null);
  const mobileMoreRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click or Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAvatarMenuOpen(false);
        setIsMobileMoreOpen(false);
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setIsAvatarMenuOpen(false);
      }
      if (mobileMoreRef.current && !mobileMoreRef.current.contains(e.target as Node)) {
        setIsMobileMoreOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close mobile more sheet on route changes
  useEffect(() => {
    setIsMobileMoreOpen(false);
    setIsAvatarMenuOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { to: '/candidate/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/jobs', label: 'Find Jobs', icon: Briefcase },
    { to: '/candidate/saved-jobs', label: 'Saved Jobs', icon: Bookmark },
    { to: '/candidate/applications', label: 'My Applications', icon: FileText },
    { to: '/candidate/profile', label: 'Profile', icon: User },
    { to: '/candidate/resume', label: 'Resume', icon: FileText },
  ];

  const initials =
    user?.firstName && user?.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
      : 'C';

  return (
    <div className="candidate-portal flex flex-col min-h-screen bg-[#FAF6F1] text-[#1B1A17] font-sans">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E8DFD4] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4 sm:gap-6">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-xl bg-[#C2410C] flex items-center justify-center text-white font-bold text-base shadow-xs group-hover:bg-[#9A3412] transition-colors">
                C
              </div>
              <span className="font-serif font-bold text-lg text-[#1B1A17] tracking-tight hidden sm:inline">
                Clyptus <span className="text-[#C2410C] font-semibold text-xs tracking-wider uppercase ml-1">Careers</span>
              </span>
            </Link>

            <Link
              to="/jobs"
              className="text-xs font-semibold text-[#5C564E] hover:text-[#1B1A17] flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E8DFD4] hover:bg-[#FAF6F1] hover:border-[#D6CCC0] transition-colors"
            >
              <Search className="w-3.5 h-3.5 text-[#8C827A]" />
              <span className="hidden sm:inline">Browse Open Jobs</span>
              <span className="sm:hidden">Jobs</span>
            </Link>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* Saved Jobs Quick Button */}
            <Link
              to="/candidate/saved-jobs"
              className="p-2 text-[#5C564E] hover:text-[#C2410C] hover:bg-[#FAF6F1] rounded-xl transition-colors hidden sm:flex items-center"
              title="Saved Jobs"
              aria-label="Saved Jobs"
            >
              <Bookmark className="w-5 h-5" />
            </Link>

            {/* Notification Bell with Badge & Popover */}
            <NotificationPopover />

            {/* User Avatar Menu Dropdown */}
            <div className="relative" ref={avatarRef}>
              <button
                type="button"
                onClick={() => setIsAvatarMenuOpen((prev) => !prev)}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-[#FAF6F1] transition-colors focus:outline-hidden focus:ring-2 focus:ring-[#C2410C]"
                aria-expanded={isAvatarMenuOpen}
                aria-haspopup="true"
                id="user-avatar-menu-btn"
              >
                <div className="w-8 h-8 rounded-full bg-[#FFF1E6] border border-[#E8DFD4] text-[#C2410C] font-bold text-xs flex items-center justify-center shadow-xs">
                  {initials}
                </div>
                <div className="text-left hidden md:block">
                  <p className="text-xs font-semibold text-[#1B1A17] leading-tight">
                    {user ? `${user.firstName} ${user.lastName}` : 'Candidate'}
                  </p>
                  <p className="text-[10px] text-[#8C827A] truncate max-w-[120px]">{user?.email}</p>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-[#8C827A] transition-transform ${isAvatarMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isAvatarMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-[#E8DFD4] shadow-lg py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                  role="menu"
                  aria-labelledby="user-avatar-menu-btn"
                >
                  <div className="px-4 py-2 border-b border-[#FAF6F1]">
                    <p className="text-xs font-bold text-[#1B1A17]">
                      {user ? `${user.firstName} ${user.lastName}` : 'Candidate'}
                    </p>
                    <p className="text-[11px] text-[#8C827A] truncate">{user?.email}</p>
                  </div>

                  <div className="py-1">
                    <Link
                      to="/candidate/profile"
                      onClick={() => setIsAvatarMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-[#5C564E] hover:text-[#1B1A17] hover:bg-[#FAF6F1] transition-colors"
                      role="menuitem"
                    >
                      <User className="w-4 h-4 text-[#8C827A]" />
                      <span>My Profile</span>
                    </Link>

                    <Link
                      to="/candidate/saved-jobs"
                      onClick={() => setIsAvatarMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-[#5C564E] hover:text-[#1B1A17] hover:bg-[#FAF6F1] transition-colors"
                      role="menuitem"
                    >
                      <Bookmark className="w-4 h-4 text-[#8C827A]" />
                      <span>Saved Jobs</span>
                    </Link>

                    <Link
                      to="/candidate/notifications"
                      onClick={() => setIsAvatarMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-[#5C564E] hover:text-[#1B1A17] hover:bg-[#FAF6F1] transition-colors"
                      role="menuitem"
                    >
                      <Bell className="w-4 h-4 text-[#8C827A]" />
                      <span>Notifications</span>
                    </Link>

                    <Link
                      to="/candidate/resume"
                      onClick={() => setIsAvatarMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-[#5C564E] hover:text-[#1B1A17] hover:bg-[#FAF6F1] transition-colors"
                      role="menuitem"
                    >
                      <FileText className="w-4 h-4 text-[#8C827A]" />
                      <span>Resume Vault</span>
                    </Link>

                    <Link
                      to="/candidate/settings"
                      onClick={() => setIsAvatarMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-[#5C564E] hover:text-[#1B1A17] hover:bg-[#FAF6F1] transition-colors"
                      role="menuitem"
                    >
                      <Settings className="w-4 h-4 text-[#8C827A]" />
                      <span>Settings</span>
                    </Link>
                  </div>

                  <div className="pt-1 border-t border-[#FAF6F1]">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAvatarMenuOpen(false);
                        void logout();
                      }}
                      className="w-full text-left flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-[#DC2626] hover:bg-red-50 transition-colors"
                      role="menuitem"
                    >
                      <LogOut className="w-4 h-4 text-[#DC2626]" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Workspace Navigation Tabs (Desktop / Tablet) */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 hidden md:flex items-center gap-2 overflow-x-auto border-t border-[#FAF6F1]">
          {navLinks.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-[#C2410C] text-[#C2410C]'
                    : 'border-transparent text-[#5C564E] hover:text-[#1B1A17] hover:border-[#E8DFD4]'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
        <Outlet />
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E8DFD4] px-2 py-1.5 flex items-center justify-around shadow-lg"
        aria-label="Mobile Bottom Navigation"
      >
        <NavLink
          to="/candidate/dashboard"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center p-1.5 rounded-xl text-[10px] font-semibold transition-colors ${
              isActive ? 'text-[#C2410C]' : 'text-[#8C827A] hover:text-[#1B1A17]'
            }`
          }
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span>Home</span>
        </NavLink>

        <NavLink
          to="/jobs"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center p-1.5 rounded-xl text-[10px] font-semibold transition-colors ${
              isActive ? 'text-[#C2410C]' : 'text-[#8C827A] hover:text-[#1B1A17]'
            }`
          }
        >
          <Briefcase className="w-5 h-5 mb-0.5" />
          <span>Jobs</span>
        </NavLink>

        <NavLink
          to="/candidate/applications"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center p-1.5 rounded-xl text-[10px] font-semibold transition-colors ${
              isActive ? 'text-[#C2410C]' : 'text-[#8C827A] hover:text-[#1B1A17]'
            }`
          }
        >
          <FileText className="w-5 h-5 mb-0.5" />
          <span>Apps</span>
        </NavLink>

        <NavLink
          to="/candidate/profile"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center p-1.5 rounded-xl text-[10px] font-semibold transition-colors ${
              isActive ? 'text-[#C2410C]' : 'text-[#8C827A] hover:text-[#1B1A17]'
            }`
          }
        >
          <User className="w-5 h-5 mb-0.5" />
          <span>Profile</span>
        </NavLink>

        {/* More Tab Trigger */}
        <div className="relative" ref={mobileMoreRef}>
          <button
            type="button"
            onClick={() => setIsMobileMoreOpen((prev) => !prev)}
            className={`flex flex-col items-center justify-center p-1.5 rounded-xl text-[10px] font-semibold transition-colors ${
              isMobileMoreOpen ? 'text-[#C2410C]' : 'text-[#8C827A] hover:text-[#1B1A17]'
            }`}
            aria-expanded={isMobileMoreOpen}
            aria-label="More navigation options"
          >
            <MoreHorizontal className="w-5 h-5 mb-0.5" />
            <span>More</span>
          </button>

          {isMobileMoreOpen && (
            <div className="fixed inset-x-0 bottom-16 bg-white border-t border-[#E8DFD4] shadow-2xl rounded-t-2xl p-4 z-50 animate-in slide-in-from-bottom duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-[#FAF6F1] mb-2">
                <span className="text-xs font-bold text-[#1B1A17]">More Options</span>
                <button
                  type="button"
                  onClick={() => setIsMobileMoreOpen(false)}
                  className="p-1 rounded-lg text-[#8C827A] hover:text-[#1B1A17]"
                  aria-label="Close menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                <Link
                  to="/candidate/saved-jobs"
                  onClick={() => setIsMobileMoreOpen(false)}
                  className="flex items-center gap-2 p-3 rounded-xl bg-[#FAF6F1] hover:bg-[#F0EAE1] text-[#1B1A17]"
                >
                  <Bookmark className="w-4 h-4 text-[#C2410C]" />
                  <span>Saved Jobs</span>
                </Link>

                <Link
                  to="/candidate/notifications"
                  onClick={() => setIsMobileMoreOpen(false)}
                  className="flex items-center gap-2 p-3 rounded-xl bg-[#FAF6F1] hover:bg-[#F0EAE1] text-[#1B1A17]"
                >
                  <Bell className="w-4 h-4 text-[#C2410C]" />
                  <span>Notifications</span>
                </Link>

                <Link
                  to="/candidate/resume"
                  onClick={() => setIsMobileMoreOpen(false)}
                  className="flex items-center gap-2 p-3 rounded-xl bg-[#FAF6F1] hover:bg-[#F0EAE1] text-[#1B1A17]"
                >
                  <FileText className="w-4 h-4 text-[#C2410C]" />
                  <span>Resume Vault</span>
                </Link>

                <Link
                  to="/candidate/settings"
                  onClick={() => setIsMobileMoreOpen(false)}
                  className="flex items-center gap-2 p-3 rounded-xl bg-[#FAF6F1] hover:bg-[#F0EAE1] text-[#1B1A17]"
                >
                  <Settings className="w-4 h-4 text-[#C2410C]" />
                  <span>Settings</span>
                </Link>
              </div>

              <div className="mt-3 pt-3 border-t border-[#FAF6F1]">
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMoreOpen(false);
                    void logout();
                  }}
                  className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-red-50 text-red-600 font-semibold text-xs hover:bg-red-100 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      <Footer />
    </div>
  );
};
