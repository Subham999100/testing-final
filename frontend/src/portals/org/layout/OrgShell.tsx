// ============================================================
// Organisation portal — app shell: permission-filtered sidebar
// (drawer on mobile), top bar with org, search (Ctrl/⌘+K), token chip,
// notifications and user menu. Owns the realtime connection.
// ============================================================

import { useQueryClient } from '@tanstack/react-query';
import { Bell, Coins, LogOut, Menu, Search, UserCircle2, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { isAuthError } from '../lib/api';
import { useRealtime } from '../lib/realtime';
import { ROLE_LABEL, TOKEN_KEY, clearToken, getToken, useLogout, useMe, usePermissions } from '../lib/session';
import { Toaster } from '../ui/toast';
import { Avatar, Skeleton, cn } from '../ui/ui';
import { getNav, loaders } from './nav';
import { RecruiterNav } from '../recruiter/RecruiterNav';

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { can, me, role } = usePermissions();
  const { pathname } = useLocation();
  const navSections = getNav(role);

  return (
    <nav className="flex h-full flex-col" aria-label="Main">
      <div className="flex h-14 items-center gap-2.5 border-b border-slate-100 px-4">
        {me?.organisation.logoUrl ? (
          <img src={me.organisation.logoUrl} alt="" className="h-8 w-8 rounded-lg object-cover" />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
            {me?.organisation.name?.[0] ?? 'C'}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-800">{me?.organisation.name ?? 'Clyptus'}</p>
          <p className="text-[11px] text-slate-500">{me ? ROLE_LABEL[me.user.role] : ' '}</p>
        </div>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {navSections.map((section) => {
          const items = section.items.filter((i) => !i.perms || can(...i.perms));
          if (!items.length) return null;
          return (
            <div key={section.title}>
              <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{section.title}</p>
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const active =
                    item.path === '/org'
                      ? pathname === '/org'
                      : pathname.startsWith(item.path) ||
                        (item.path === '/org/credits-allocation' && pathname.startsWith('/org/tokens')) ||
                        (item.path === '/org/recruiters' && (pathname.startsWith('/org/members') || pathname.startsWith('/org/recruiters')));
                  const Icon = item.icon;
                  return (
                    <li key={item.path}>
                      <NavLink
                        to={item.path}
                        end={item.path === '/org'}
                        onMouseEnter={() => void loaders[item.chunk]()}
                        onFocus={() => void loaders[item.chunk]()}
                        onClick={onNavigate}
                        className={cn(
                          'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
                          active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                        )}
                      >
                        <Icon className={cn('h-4 w-4', active ? 'text-indigo-600' : 'text-slate-400')} />
                        {item.label}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </nav>
  );
}

function Topbar({ onMenu }: { onMenu: () => void }) {
  const { me, can, role } = usePermissions();
  const logout = useLogout();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [menu, setMenu] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const isSuperAdmin = role === 'ORGANISATION_SUPER_ADMIN';

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    if (isSuperAdmin) {
      navigate(`/org/recruiters?search=${encodeURIComponent(term)}`);
    } else if (can('candidates.read', 'candidates.search')) {
      navigate(`/org/candidates?search=${encodeURIComponent(term)}`);
    } else {
      navigate(`/org/jobs?search=${encodeURIComponent(term)}`);
    }
  };

  return (
    <header className="flex h-14 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur">
      <button className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden" aria-label="Open menu" onClick={onMenu}>
        <Menu className="h-5 w-5" />
      </button>
      <form onSubmit={submit} className="relative max-w-md flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          ref={searchRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={isSuperAdmin ? 'Search recruiters…' : 'Search candidates or jobs…'}
          aria-label="Search"
          className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-14 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
        <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 text-[10px] text-slate-400 sm:block">Ctrl K</kbd>
      </form>
      <div className="ml-auto flex items-center gap-1.5">
        {me?.tokens && (
          <Link
            to={isSuperAdmin ? '/org/credits-allocation' : '/org/tokens'}
            className="hidden items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-200 sm:flex"
            title={isSuperAdmin ? 'Organisation Credits' : 'Tokens you can spend'}
          >
            <Coins className="h-3.5 w-3.5" />
            {(isSuperAdmin ? me.tokens.balance : me.tokens.spendable).toLocaleString()}
          </Link>
        )}
        <Link to="/org/notifications" className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {!!me?.unreadNotifications && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
              {me.unreadNotifications > 9 ? '9+' : me.unreadNotifications}
            </span>
          )}
        </Link>
        <div className="relative">
          <button onClick={() => setMenu((v) => !v)} className="flex items-center gap-2 rounded-lg p-1 hover:bg-slate-100" aria-haspopup="menu" aria-expanded={menu}>
            <Avatar name={me ? `${me.user.firstName} ${me.user.lastName}` : '?'} />
          </button>
          {menu && (
            <div className="absolute right-0 z-40 mt-2 w-56 rounded-xl border border-slate-200 bg-white py-1 shadow-lg" role="menu" onMouseLeave={() => setMenu(false)}>
              <div className="border-b border-slate-100 px-4 py-2.5">
                <p className="truncate text-sm font-medium text-slate-800">
                  {me?.user.firstName} {me?.user.lastName}
                </p>
                <p className="truncate text-xs text-slate-500">{me?.user.email}</p>
              </div>
              <Link to="/org/profile" onClick={() => setMenu(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50" role="menuitem">
                <UserCircle2 className="h-4 w-4" /> Profile & settings
              </Link>
              <button onClick={logout} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50" role="menuitem">
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export function OrgShell() {
  const token = getToken();
  const { data: me, error, isLoading, refetch, isFetching } = useMe();
  const [drawer, setDrawer] = useState(false);
  const qc = useQueryClient();
  const location = useLocation();
  useRealtime(!!me);

  // Any 401 anywhere means the session is gone: clear it and go to login.
  useEffect(() => {
    return qc.getQueryCache().subscribe((event) => {
      if (event.type === 'updated' && event.query.state.status === 'error' && isAuthError(event.query.state.error)) {
        clearToken();
        window.location.assign('/org/login');
      }
    });
  }, [qc]);

  useEffect(() => setDrawer(false), [location.pathname]);

  // index.html carries the platform admin title; the org portal names itself.
  useEffect(() => {
    const previous = document.title;
    document.title = me ? `${me.organisation.name} · Clyptus Hiring` : 'Clyptus Hiring';
    return () => {
      document.title = previous;
    };
  }, [me?.organisation.name]);

  if (!token) return <Navigate to="/org/login" replace state={{ from: location.pathname }} />;
  // Only a rejected session signs you out; a network blip (e.g. API restarting) offers a retry instead.
  const sessionRejected = !!error && (isAuthError(error) || (error as { code?: string }).code === 'Forbidden');
  if (error && !sessionRejected && !me) {
    return (
      <div className="org-portal flex h-screen items-center justify-center bg-slate-50 p-4">
        <div className="max-w-sm rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p className="font-semibold text-slate-800">Can't reach the server</p>
          <p className="mt-1 text-sm text-slate-500">Check your connection and try again. You're still signed in.</p>
          <button
            className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            disabled={isFetching}
            onClick={() => refetch()}
          >
            {isFetching ? 'Retrying…' : 'Try again'}
          </button>
        </div>
      </div>
    );
  }
  if (sessionRejected) {
    clearToken();
    return <Navigate to="/org/login" replace state={{ message: (error as { message?: string }).message }} />;
  }

  if (me?.user?.mustChangePassword) {
    return <Navigate to="/org/change-password" replace />;
  }

  const isRecruiter = me?.user.role === 'RECRUITER';
  return (
    <div className={`org-portal flex h-screen w-full bg-slate-50 text-slate-800 ${isRecruiter ? 'recruiter-shell' : ''}`}>
      {!isRecruiter && <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white lg:block">
        {isLoading ? <Skeleton className="m-4 h-8" /> : <Sidebar />}
      </aside>}
      {!isRecruiter && drawer && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/30" onClick={() => setDrawer(false)} />
          <aside className="relative h-full w-64 bg-white shadow-xl">
            <button className="absolute right-2 top-3 rounded-md p-1 text-slate-400" aria-label="Close menu" onClick={() => setDrawer(false)}>
              <X className="h-5 w-5" />
            </button>
            <Sidebar onNavigate={() => setDrawer(false)} />
          </aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        {isRecruiter ? <RecruiterNav /> : <Topbar onMenu={() => setDrawer(true)} />}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
            <Outlet />
          </div>
        </main>
      </div>
      <Toaster />
    </div>
  );
}
