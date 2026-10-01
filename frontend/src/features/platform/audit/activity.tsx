import React from "react";
import { humanize, permissionLabel } from "../admins/permission-labels";
const names: Record<string, string> = {
  PLATFORM_LOGIN: "Signed in",
  PLATFORM_LOGOUT: "Signed out",
  PLATFORM_ADMIN_CREATED: "Admin account created",
  PLATFORM_ADMIN_UPDATED: "Admin account updated",
  PLATFORM_ADMIN_PERMISSIONS_UPDATED: "Admin permissions updated",
  ORGANISATION_CREATED: "Organization created",
  ORGANISATION_UPDATED: "Organization updated",
  ORGANISATION_VERIFICATION_APPROVE: "Organization verified",
  ORGANISATION_VERIFIED: "Organization verified",
  ORGANISATION_VERIFICATION_REJECT: "Verification rejected",
  ORGANISATION_VERIFICATION_REJECTED: "Verification rejected",
  ORGANISATION_VERIFICATION_REQUEST_INFO: "More information requested",
  ORGANISATION_VERIFICATION_INFORMATION_REQUESTED: "More information requested",
  ORGANISATION_SUSPENDED: "Organization suspended",
  ORGANISATION_REACTIVATED: "Organization reactivated",
};
export const activityLabel = (action: string) =>
  names[action] ||
  humanize(action || "Activity").replace(/organisation/gi, "organization");
export const actorLabel = (row: any) =>
  [row.actor?.firstName, row.actor?.lastName].filter(Boolean).join(" ") ||
  row.actor?.email ||
  humanize(row.actorRole || "System");
export const targetLabel = (row: any) =>
  row.organisation?.name ||
  row.metadata?.name ||
  row.metadata?.email ||
  humanize(row.entityType || "Platform");
export function ReadableValue({
  value,
  name = "",
}: {
  value: any;
  name?: string;
}) {
  if (value == null || value === "")
    return <span className="text-muted">Not provided</span>;
  if (typeof value === "boolean") return <span>{value ? "Yes" : "No"}</span>;
  if (Array.isArray(value))
    return value.length ? (
      <ul className="audit-values">
        {value.map((item, i) => (
          <li key={i}>
            <ReadableValue value={item} name={name} />
          </li>
        ))}
      </ul>
    ) : (
      <span>None</span>
    );
  if (typeof value === "object")
    return (
      <dl className="audit-details">
        {Object.entries(value).map(([key, item]) => (
          <div key={key}>
            <dt>{humanize(key)}</dt>
            <dd>
              <ReadableValue value={item} name={key} />
            </dd>
          </div>
        ))}
      </dl>
    );
  const text = String(value);
  return (
    <span>
      {text.startsWith("platform.")
        ? permissionLabel(text)
        : /^[A-Z][A-Z_]+$/.test(text)
          ? humanize(text)
          : text}
    </span>
  );
}
