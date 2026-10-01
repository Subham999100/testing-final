import React, { useState } from "react";
import { Shield, Key } from "lucide-react";
import { PlatformAdminUser } from "../../../types/platform.types";
import { PermissionMatrix } from "./PermissionMatrix";
import { PlatformService } from "../../../services/platform.service";
import { ErrorBox } from "../../../components/platform/OperationsUI";

export function AdminPermissions({
  admin,
  onSaved,
}: {
  admin: PlatformAdminUser;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  if (admin.role !== "PLATFORM_ADMIN") return null;

  return (
    <>
      <button
        type="button"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border border-line-strong bg-surface hover:bg-soft text-ink transition-colors"
        onClick={() => {
          setSelected(admin.platformAdminProfile?.permissions || []);
          setError(null);
          setOpen(true);
        }}
      >
        <Key className="w-3.5 h-3.5 text-orange-600" />
        Edit Permissions
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Edit Admin permissions"
            className="w-full max-w-4xl bg-surface border border-line rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[92vh]"
          >
            <div className="p-6 pb-4 border-b border-line flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold tracking-widest text-orange-600 uppercase">
                  Access Control
                </span>
                <h2 className="text-xl font-bold tracking-tight text-ink mt-0.5">
                  Assign Admin Permissions
                </h2>
                <p className="text-xs text-muted mt-0.5">
                  Update permissions for {admin.firstName} {admin.lastName} ({admin.email}).
                </p>
              </div>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                try {
                  await PlatformService.write(
                    `admins/${admin.id}`,
                    { permissions: selected },
                    "patch"
                  );
                  setOpen(false);
                  onSaved();
                } catch (err) {
                  setError(err);
                } finally {
                  setBusy(false);
                }
              }}
              className="p-6 overflow-y-auto space-y-4 flex-1"
            >
              <PermissionMatrix
                selected={selected}
                onChange={setSelected}
                disabled={busy}
              />
              {error && <ErrorBox error={error} />}

              <div className="flex justify-end gap-3 pt-4 border-t border-line">
                <button
                  type="button"
                  className="px-4 py-2 text-xs font-semibold text-muted hover:text-ink transition-colors"
                  disabled={busy}
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold transition-all disabled:opacity-50 shadow-xs"
                >
                  {busy ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

