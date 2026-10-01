import React, { useRef, useState } from "react";
import { Page, Table } from "../../components/platform/OperationsUI";
import {
  activityLabel,
  actorLabel,
  targetLabel,
  ReadableValue,
} from "../../features/platform/audit/activity";
const categories: Record<string, string> = {
  ORGANISATION: "Organizations",
  PLATFORM_ADMIN: "Admin accounts",
  PLATFORM_SESSION: "Sign-ins and sign-outs",
  TOKEN_LEDGER: "Token transactions",
  TOKEN_PLAN: "Token packages",
  USER: "Users",
  JOB: "Job moderation",
  SUPPORT: "Support",
  SECURITY: "Security",
};
export function AuditLogs() {
  const [category, setCategory] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <Page
      title="Audit logs"
      description="See who did what and when. Search by person, organization, action or reference. History is shown 20 events at a time."
    >
      <label className="audit-category">
        Activity type
        <select
          className="field-input"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All activity</option>
          {Object.entries(categories).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <Table
        key={category}
        path="audit-logs"
        params={category ? { entityType: category } : {}}
        columns={[
          {
            key: "action",
            title: "Activity",
            render: (row) => <strong>{activityLabel(row.action)}</strong>,
          },
          {
            key: "actor",
            title: "Performed by",
            render: (row) => (
              <>
                <span>{actorLabel(row)}</span>
                {row.actor?.email && (
                  <small className="block text-muted">{row.actor.email}</small>
                )}
              </>
            ),
          },
          {
            key: "entityType",
            title: "Organization / item",
            render: (row) => targetLabel(row),
          },
          {
            key: "createdAt",
            title: "When",
            render: (row) => (
              <time dateTime={row.createdAt}>
                {new Date(row.createdAt).toLocaleString()}
              </time>
            ),
          },
        ]}
        actions={(row) => (
          <button
            className="button button-secondary button-small"
            onClick={() => {
              setSelected(row);
              dialog.current?.showModal();
            }}
          >
            View details
          </button>
        )}
      />
      <dialog
        ref={dialog}
        className="audit-dialog"
        aria-labelledby="activity-details-title"
        onClose={() => setSelected(null)}
      >
        {selected && (
          <>
            <div className="activity-heading">
              <div>
                <p className="eyebrow">Activity details</p>
                <h2 id="activity-details-title">
                  {activityLabel(selected.action)}
                </h2>
              </div>
              <button
                autoFocus
                className="button button-secondary button-small"
                onClick={() => dialog.current?.close()}
              >
                Close
              </button>
            </div>
            <dl className="audit-details">
              <div>
                <dt>Performed by</dt>
                <dd>{actorLabel(selected)}</dd>
              </div>
              <div>
                <dt>Organization / item</dt>
                <dd>{targetLabel(selected)}</dd>
              </div>
              <div>
                <dt>When</dt>
                <dd>{new Date(selected.createdAt).toLocaleString()}</dd>
              </div>
            </dl>
            <h3 className="font-semibold mt-5 mb-3">What happened</h3>
            {selected.metadata && Object.keys(selected.metadata).length ? (
              <ReadableValue value={selected.metadata} />
            ) : (
              <p className="text-muted">
                No additional details were recorded for this activity.
              </p>
            )}
            <details className="audit-technical">
              <summary>Technical references</summary>
              <ReadableValue
                value={{
                  activityReference: selected.id,
                  itemReference: selected.entityId,
                  actionCode: selected.action,
                  ipAddress: selected.ipAddress,
                  browser: selected.userAgent,
                }}
              />
            </details>
          </>
        )}
      </dialog>
    </Page>
  );
}
