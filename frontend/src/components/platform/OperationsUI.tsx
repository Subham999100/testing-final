import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '../../store/auth.store';
import { PlatformService } from '../../services/platform.service';
export const inputClass = 'field-input';
export const buttonClass = 'button button-primary button-small';
export const secondaryButtonClass = 'button button-secondary button-small';
export const label = (s: string) =>
  s
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/^./, (c) => c.toUpperCase());
export const show = (v: any): string =>
  v === null || v === undefined
    ? '—'
    : typeof v === 'object'
      ? v.name || JSON.stringify(v)
      : typeof v === 'boolean'
        ? v
          ? 'Yes'
          : 'No'
        : String(v);
export function Page({
  title,
  description,
  children,
}: React.PropsWithChildren<{ title: string; description?: string }>) {
  return (
    <section className="portal-page space-y-5">
      <div className="portal-page-header">
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && <p className="text-muted mt-2 text-sm">{description}</p>}
      </div>
      {children}
    </section>
  );
}
export function ErrorBox({ error, retry }: { error: any; retry?: () => void }) {
  return (
    <div role="alert" className="p-4 rounded-xl bg-danger-soft border border-danger text-danger">
      {error?.message || 'Unable to load data'}{' '}
      {retry && (
        <button className="underline ml-3" onClick={retry}>
          Retry
        </button>
      )}
    </div>
  );
}
export function useResource(
  path: string,
  params: Record<string, unknown> = {},
  enabled = true,
  refetchInterval?: number,
) {
  const principal = useAuthStore((s) => s.user?.userId);
  return useQuery({
    queryKey: ['platform', principal, path, params],
    queryFn: () => PlatformService.read(path, params),
    enabled,
    retry: 1,
    refetchInterval,
  });
}
export type Column = { key: string; title?: string; render?: (row: any) => React.ReactNode };
export function Table({
  path,
  columns,
  filters = {},
  params = {},
  actions,
  search = true,
}: {
  path: string;
  columns: Column[];
  filters?: Record<string, string[]>;
  params?: Record<string, unknown>;
  actions?: (row: any) => React.ReactNode;
  search?: boolean;
}) {
  const [page, setPage] = useState(1),
    [draft, setDraft] = useState(''),
    [term, setTerm] = useState(''),
    [selected, setSelected] = useState<Record<string, string>>({});
  const query = useResource(path, {
    page,
    limit: 20,
    ...params,
    ...Object.fromEntries(Object.entries(selected).filter(([, v]) => v)),
    ...(term ? { search: term } : {}),
  });
  const result = query.data;
  const rows = Array.isArray(result) ? result : result?.data || [];
  return (
    <div className="space-y-3">
      <form
        className="flex flex-wrap gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setTerm(draft);
          setPage(1);
        }}
      >
        {search && (
          <>
            <input
              className={inputClass + ' max-w-xs'}
              aria-label="Search"
              placeholder="Search…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button className={buttonClass}>Search</button>
          </>
        )}
        {Object.entries(filters).map(([key, values]) => (
          <select
            key={key}
            aria-label={label(key)}
            className={inputClass + ' max-w-xs'}
            value={selected[key] || ''}
            onChange={(e) => {
              setSelected({ ...selected, [key]: e.target.value });
              setPage(1);
            }}
          >
            <option value="">All {label(key)}</option>
            {values.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        ))}
      </form>
      {query.isPending ? (
        <p role="status" className="text-muted p-6">
          Loading…
        </p>
      ) : query.isError ? (
        <ErrorBox error={query.error} retry={() => query.refetch()} />
      ) : result?.available === false ? (
        <p className="p-5 border border-warning bg-warning-soft rounded-xl">{result.reason}</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-sm text-left">
              <thead className="bg-surface text-muted">
                <tr>
                  {columns.map((c) => (
                    <th key={c.key} className="p-3 font-medium">
                      {c.title || label(c.key)}
                    </th>
                  ))}
                  {actions && <th className="p-3">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((row: any, i: number) => (
                  <tr key={row.id || row.organisationId || i} className="border-t border-line">
                    {columns.map((c) => (
                      <td key={c.key} className="p-3 max-w-xs break-words">
                        {c.render ? c.render(row) : show(row[c.key])}
                      </td>
                    ))}
                    {actions && (
                      <td className="p-3">
                        <div className="flex flex-wrap gap-2">{actions(row)}</div>
                      </td>
                    )}
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td
                      colSpan={columns.length + (actions ? 1 : 0)}
                      className="p-8 text-center text-muted"
                    >
                      No records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {result?.meta && (
            <div className="table-pagination">
              <span>
                {result.meta.total} records · Page {page} of {Math.max(1, result.meta.totalPages)}
              </span>
              <div className="flex gap-2">
                <button
                  className={secondaryButtonClass}
                  disabled={page <= 1 || query.isFetching}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </button>
                <button
                  className={secondaryButtonClass}
                  disabled={page >= result.meta.totalPages || query.isFetching}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
export type Field = {
  name: string;
  label?: string;
  type?: string;
  options?: string[];
  required?: boolean;
  min?: number;
  minLength?: number;
  value?: any;
};
export function Action({
  title,
  path,
  fields = [],
  method = 'post',
  body = {},
  onResult,
}: {
  title: string;
  path: string;
  fields?: Field[];
  method?: 'post' | 'patch';
  body?: Record<string, unknown>;
  onResult?: (v: any) => void;
}) {
  const [open, setOpen] = useState(false),
    [notice, setNotice] = useState('');
  const client = useQueryClient();
  const form = useForm<Record<string, any>>();
  const mutation = useMutation({
    mutationFn: (values: Record<string, any>) =>
      PlatformService.write(path, { ...body, ...values }, method),
    onSuccess: (result) => {
      setOpen(false);
      setNotice('Saved');
      client.invalidateQueries({ queryKey: ['platform'] });
      onResult?.(result);
    },
  });
  return (
    <>
      <button
        className={buttonClass}
        onClick={() => {
          form.reset(
            Object.fromEntries(fields.map((f) => [f.name, f.value ?? f.options?.[0] ?? ''])),
          );
          mutation.reset();
          setOpen(true);
          setNotice('');
        }}
      >
        {title}
      </button>
      {notice && (
        <span role="status" className="text-success text-xs">
          {notice}
        </span>
      )}
      {open && (
        <div className="fixed inset-0 z-50 bg-overlay p-4 flex items-center justify-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="bg-surface border border-line-strong rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-auto"
          >
            <h2 className="font-bold text-lg mb-4">{title}</h2>
            <form className="space-y-4" onSubmit={form.handleSubmit((v) => mutation.mutate(v))}>
              {fields.length === 0 && <p>Confirm this action?</p>}
              {fields.map((f) => (
                <label key={f.name} className="block text-sm space-y-2">
                  <span>
                    {f.label || label(f.name)}
                    {f.required !== false ? ' *' : ''}
                  </span>
                  {f.options ? (
                    <select
                      className={inputClass}
                      {...form.register(f.name, { required: f.required !== false })}
                    >
                      {f.options.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className={inputClass}
                      type={f.type || 'text'}
                      min={f.min}
                      minLength={f.minLength}
                      maxLength={f.type === 'password' ? 72 : 1000}
                      {...form.register(f.name, {
                        required: f.required !== false,
                        minLength: f.minLength,
                        min: f.min,
                        valueAsNumber: f.type === 'number',
                        setValueAs:
                          f.type !== 'number'
                            ? (v) => (v === '' && f.required === false ? undefined : v)
                            : undefined,
                      })}
                    />
                  )}{' '}
                  {form.formState.errors[f.name] && (
                    <span className="text-danger">
                      Please enter a valid {f.label || label(f.name)}.
                    </span>
                  )}
                </label>
              ))}
              {mutation.isError && <ErrorBox error={mutation.error} />}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  className={secondaryButtonClass}
                  disabled={mutation.isPending}
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </button>
                <button disabled={mutation.isPending} className={buttonClass}>
                  {mutation.isPending ? 'Saving…' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
export const reason: Field = { name: 'reason', minLength: 5, label: 'Reason' };
export const columns = (...keys: string[]): Column[] => keys.map((key) => ({ key }));
export function Metrics({ values }: { values: Record<string, any> }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {Object.entries(values).map(([k, v]) => (
        <div key={k} className="metric-card">
          <p className="text-xs text-muted">{label(k)}</p>
          <p className="metric-value">
            {v == null ? '—' : Number(v).toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
}
