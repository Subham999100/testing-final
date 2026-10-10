import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, UserCircle2, LogOut } from "lucide-react";
import { NavLink, Link, useLocation, useNavigate } from "react-router-dom";
import { NAV } from "../layout/nav";
import { usePermissions, useLogout, useMe } from "../lib/session";
import { Avatar } from "../ui/ui";
import "./recruiter.css";
type Item = { label: string; to: string; perms: string[] };
function NavDropdown({ label, items }: { label: string; items: Item[] }) {
  const { can } = usePermissions();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const visible = items.filter((i) => can(...i.perms));
  useEffect(() => setOpen(false), [location.pathname, location.search]);
  useEffect(() => {
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  if (!visible.length) return null;
  return (
    <div
      className="r-nav-dropdown"
      ref={ref}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <button
        ref={trigger}
        className={
          visible.some(
            (i) =>
              i.to.split("?")[0] === location.pathname &&
              (!i.to.includes("?") ||
                i.to.split("?")[1] === location.search.slice(1)),
          )
            ? "active"
            : ""
        }
        aria-expanded={open}
        aria-controls={`nav-${label}`}
        onClick={() => setOpen((v) => !v)}
      >
        {label}
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="r-nav-menu" id={`nav-${label}`}>
          {visible.map((i) => (
            <NavLink key={i.to} to={i.to} onClick={() => setOpen(false)}>
              {i.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}
export function RecruiterNav() {
  const { can } = usePermissions();
  const { data: me } = useMe();
  const logout = useLogout();
  const [menu, setMenu] = useState(false);
  const navigate = useNavigate();
  const analytics = ["analytics.self", "analytics.recruiter", "analytics.org"];
  const apps = ["applications.read.all", "applications.read.assigned"];
  const primary = new Set([
    "/org",
    "/org/jobs",
    "/org/candidates",
    "/org/applications",
    "/org/interviews",
    "/org/offers",
    "/org/folders",
    "/org/reports",
  ]);
  const more = NAV.flatMap((s) => s.items).filter(
    (i) => !primary.has(i.path) && (!i.perms || can(...i.perms)),
  );
  return (
    <nav className="recruiter-topnav" aria-label="Recruiter workspace">
      <NavLink className="r-brand" to="/org">
        Clyptus Hiring
      </NavLink>
      <NavLink to="/org" end>
        Dashboard
      </NavLink>
      <NavDropdown
        label="Jobs"
        items={[
          { label: "Post a job", to: "/org/jobs/new", perms: ["jobs.create"] },
          {
            label: "Manage jobs",
            to: "/org/jobs",
            perms: ["jobs.read.all", "jobs.read.assigned"],
          },
          {
            label: "Message queries",
            to: "/org/messages",
            perms: ["messages.use", "messages.oversee"],
          },
          ...(can(...analytics)
            ? [
                {
                  label: "Job posting report",
                  to: "/org/reports?type=jobs",
                  perms: ["jobs.read.all", "jobs.read.assigned"],
                },
              ]
            : []),
        ]}
      />
      {can("candidates.search", "candidates.read") && (
        <NavLink to="/org/candidates">Search candidates</NavLink>
      )}
      {can(...apps) && <NavLink to="/org/applications">Applications</NavLink>}
      <NavDropdown
        label="Interviews"
        items={[
          ...(can(...apps)
            ? [
                {
                  label: "Schedule interview",
                  to: "/org/interviews/new",
                  perms: ["interviews.schedule"],
                },
              ]
            : []),
          {
            label: "Manage interviews",
            to: "/org/interviews",
            perms: ["interviews.read"],
          },
          {
            label: "Pending feedback",
            to: "/org/interviews?mine=true",
            perms: ["interviews.read"],
          },
          ...(can(...analytics)
            ? [
                {
                  label: "Interview report",
                  to: "/org/reports?type=interviews",
                  perms: ["interviews.read"],
                },
              ]
            : []),
        ]}
      />
      <NavDropdown
        label="Offers"
        items={[
          ...(can(...apps)
            ? [
                {
                  label: "Create offer",
                  to: "/org/offers/new",
                  perms: ["offers.create"],
                },
              ]
            : []),
          { label: "Manage offers", to: "/org/offers", perms: ["offers.read"] },
          {
            label: "Pending approvals",
            to: "/org/offers?status=PENDING_APPROVAL",
            perms: ["offers.read"],
          },
          ...(can(...analytics)
            ? [
                {
                  label: "Offer report",
                  to: "/org/reports?type=offers",
                  perms: ["offers.read"],
                },
              ]
            : []),
        ]}
      />
      {can("candidates.save") && <NavLink to="/org/folders">Folders</NavLink>}
      {can(...analytics) && <NavLink to="/org/reports">Reports</NavLink>}
      {!!more.length && (
        <select
          aria-label="More recruiter tools"
          value=""
          onChange={(e) => {
            if (e.target.value) navigate(e.target.value);
          }}
        >
          <option value="">More tools</option>
          {more.map((i) => (
            <option key={i.path} value={i.path}>
              {i.label}
            </option>
          ))}
        </select>
      )}

      <div style={{ marginLeft: "auto", position: "relative" }}>
        <button
          onClick={() => setMenu((v) => !v)}
          style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", cursor: "pointer", padding: "4px" }}
        >
          <Avatar name={me ? `${me.user.firstName} ${me.user.lastName}` : '?'} />
          <span style={{ fontSize: "14px", fontWeight: 500 }}>Hello, {me?.user.firstName}</span>
        </button>
        {menu && (
          <div
            className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
            role="menu"
            onMouseLeave={() => setMenu(false)}
          >
            <div className="border-b border-slate-100 px-4 py-2.5">
              <p className="truncate text-sm font-medium text-slate-800">
                {me?.user.firstName} {me?.user.lastName}
              </p>
              <p className="truncate text-xs text-slate-500">{me?.user.email}</p>
            </div>
            <Link
              to="/org/profile"
              onClick={() => setMenu(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
              role="menuitem"
            >
              <UserCircle2 className="h-4 w-4" /> Profile & settings
            </Link>
            <button
              onClick={logout}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50"
              role="menuitem"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}