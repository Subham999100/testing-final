import { platformPermissions } from "../../../types/platform-permissions";
const labels: Record<string, string> = {
  "organisations.read": "View organizations",
  "organisations.create": "Create organizations",
  "organisations.update": "Edit organization information",
  "organisations.verify": "Approve verification and request information",
  "organisations.reject": "Reject organization verification",
  "organisations.suspend": "Suspend organizations",
  "organisations.reactivate": "Reactivate organizations",
  "organisations.deactivate": "Deactivate organizations",
  "organisations.delete": "Archive organizations (legacy action)",
  "organisations.members.read": "View organization members",
  "organisations.activity.read": "View organization activity",
  "organisations.provision": "Invite the initial organization administrator",
  "users.read": "View and search users",
  "users.suspend": "Suspend user accounts",
  "users.reactivate": "Reactivate user accounts",
  "users.activity.read": "View user account activity",
  "tokens.read": "View tokens, balances and transactions",
  "tokens.manage": "Create and edit token packages",
  "tokens.allocate": "Manage token allocation limits",
  "tokens.adjust": "Adjust token balances",
  "tokens.sales.read": "View verified token sales",
  "jobs.read": "View jobs and recruitment data",
  "jobs.moderate": "Review and restrict jobs",
  "jobs.suspend": "Suspend job postings",
  "moderation.read": "View moderation queues and history",
  "support.read": "View support cases",
  "support.manage": "Create, assign and resolve support cases",
  "support.escalate": "Escalate and handle critical cases",
  "notifications.read": "Receive and view platform alerts",
  "reports.generate": "Generate permitted reports",
  "reports.export": "Export permitted report data",
  "analytics.read": "View platform analytics",
  "audit.read": "View audit logs",
  "security.read": "View security events and sessions",
  "security.manage": "Manage security incidents",
};
export const humanize = (text: string) =>
  text
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_.]/g, " ")
    .toLowerCase()
    .replace(/^./, (c) => c.toUpperCase());
export const permissionLabel = (key: string) =>
  labels[key.replace(/^platform\./, "")] ||
  humanize(key.replace(/^platform\./, ""));
export const AVAILABLE_PERMISSIONS = platformPermissions
  .filter(
    (key) =>
      !key.startsWith("platform.admins.") &&
      !key.startsWith("platform.settings.") &&
      !key.startsWith("platform.jobs.") &&
      !key.startsWith("platform.moderation."),
  )
  .map((key) => ({ key, label: permissionLabel(key) }));
export const permissionGroups: Record<string, string> = {
  organisations: "Organizations",
  users: "User accounts",
  tokens: "Tokens & billing",
  support: "Support",
  notifications: "Notifications",
  reports: "Reports & exports",
  analytics: "Analytics",
  audit: "Audit logs",
  security: "Security",
};
