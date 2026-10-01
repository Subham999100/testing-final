// ============================================================
// Organisation portal — one DataTable pattern for every list page:
// server pagination, row click, optional selection for bulk actions,
// skeleton rows while loading, empty state, and a stacked card layout
// on small screens.
// ============================================================

import React from 'react';
import { PageMeta } from '../lib/api';
import { Card, Pagination, Skeleton, cn } from './ui';

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
  hideOnMobile?: boolean;
}

interface Props<T extends { id: string }> {
  columns: Column<T>[];
  rows?: T[];
  loading?: boolean;
  meta?: PageMeta;
  onPage?: (p: number) => void;
  onRowClick?: (row: T) => void;
  empty?: React.ReactNode;
  selectable?: boolean;
  selected?: Set<string>;
  onSelectedChange?: (s: Set<string>) => void;
  toolbar?: React.ReactNode;
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  loading,
  meta,
  onPage,
  onRowClick,
  empty,
  selectable,
  selected,
  onSelectedChange,
  toolbar,
}: Props<T>) {
  const list = rows ?? [];
  const allSelected = selectable && list.length > 0 && list.every((r) => selected?.has(r.id));
  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    onSelectedChange?.(next);
  };
  const toggleAll = () => onSelectedChange?.(allSelected ? new Set() : new Set(list.map((r) => r.id)));

  return (
    <Card className="overflow-hidden">
      {toolbar && <div className="border-b border-slate-100 px-4 py-3">{toolbar}</div>}

      {/* Desktop table */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-medium text-slate-500">
            <tr>
              {selectable && (
                <th className="w-10 px-4 py-2.5">
                  <input type="checkbox" aria-label="Select all" checked={!!allSelected} onChange={toggleAll} className="rounded border-slate-300" />
                </th>
              )}
              {columns.map((c) => (
                <th key={c.key} className={cn('px-4 py-2.5 font-medium', c.className)}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && !list.length
              ? [0, 1, 2, 3, 4].map((i) => (
                  <tr key={i}>
                    {selectable && <td className="px-4 py-3" />}
                    {columns.map((c) => (
                      <td key={c.key} className="px-4 py-3">
                        <Skeleton className="h-4 w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              : list.map((row) => (
                  <tr
                    key={row.id}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    onKeyDown={onRowClick ? (e) => e.key === 'Enter' && onRowClick(row) : undefined}
                    tabIndex={onRowClick ? 0 : undefined}
                    className={cn('text-slate-700', onRowClick && 'cursor-pointer hover:bg-slate-50 focus:bg-indigo-50/40 focus:outline-none')}
                  >
                    {selectable && (
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" aria-label="Select row" checked={!!selected?.has(row.id)} onChange={() => toggle(row.id)} className="rounded border-slate-300" />
                      </td>
                    )}
                    {columns.map((c) => (
                      <td key={c.key} className={cn('px-4 py-3 align-middle', c.className)}>
                        {c.cell(row)}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="divide-y divide-slate-100 sm:hidden">
        {loading && !list.length
          ? [0, 1, 2].map((i) => <Skeleton key={i} className="m-4 h-16" />)
          : list.map((row) => (
              <div key={row.id} onClick={onRowClick ? () => onRowClick(row) : undefined} className={cn('space-y-1.5 px-4 py-3', onRowClick && 'cursor-pointer active:bg-slate-50')}>
                {columns
                  .filter((c) => !c.hideOnMobile)
                  .map((c, i) => (
                    <div key={c.key} className={cn('flex items-center justify-between gap-3 text-sm', i === 0 && 'font-medium text-slate-800')}>
                      {i > 0 && <span className="text-xs text-slate-400">{c.header}</span>}
                      <div className={cn(i > 0 && 'text-right')}>{c.cell(row)}</div>
                    </div>
                  ))}
              </div>
            ))}
      </div>

      {!loading && !list.length && (empty ?? <div className="px-6 py-10 text-center text-sm text-slate-500">Nothing here yet.</div>)}
      {onPage && <Pagination meta={meta} onPage={onPage} />}
    </Card>
  );
}
