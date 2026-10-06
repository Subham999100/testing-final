// ============================================================
// Organisation portal — tokens (wallet, allocations, ledger, usage),
// billing (Razorpay checkout; credit only via verified webhook) and a
// printable invoice.
// ============================================================

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Coins, CreditCard, Printer, Receipt } from 'lucide-react';
import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, errorMessage, Wallet } from '../lib/api';
import { fmtDate, fmtDateTime, fmtMoney, fmtNum, label } from '../lib/format';
import { qk, STALE } from '../lib/queryKeys';
import { ROLE_LABEL, usePermissions, useWallet } from '../lib/session';
import { DataTable } from '../ui/DataTable';
import { toast } from '../ui/toast';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Input,
  KpiCard,
  PageHeader,
  PageSkeleton,
  Sheet,
  StatusBadge,
  Tabs,
} from '../ui/ui';

interface Allocation {
  userId: string;
  name: string;
  email: string;
  role: string;
  allocated: number;
  consumed: number;
  remaining: number;
  canManage: boolean;
}

interface LedgerRow {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  reason: string | null;
  feature: string | null;
  actor: { name: string };
  createdAt: string;
}

interface MemberEntry {
  id: string;
  type: string;
  amount: number;
  reason: string | null;
  createdAt: string;
}

type TokenTab = 'allocations' | 'ledger' | 'usage' | 'mine';

export function TokensPage() {
  const { can, role } = usePermissions();
  const isSuperAdmin = role === 'ORGANISATION_SUPER_ADMIN';
  const { data: wallet, isLoading } = useWallet();
  const admin = can('tokens.allocate');
  const [tab, setTab] = useState<TokenTab>(admin ? 'allocations' : 'mine');
  const [page, setPage] = useState(1);
  const [allocating, setAllocating] = useState<Allocation | null>(null);

  const allocations = useQuery({ queryKey: qk.tokens.allocations, queryFn: () => api.get<Allocation[]>('/org/tokens/allocations'), enabled: admin && tab === 'allocations' });
  const ledger = useQuery({
    queryKey: qk.tokens.ledger({ page }),
    queryFn: () => api.page<LedgerRow>('/org/tokens/ledger', { page, limit: 25 }),
    enabled: can('tokens.allocate', 'tokens.purchase') && tab === 'ledger',
    placeholderData: keepPreviousData,
  });
  const mine = useQuery({
    queryKey: qk.tokens.myLedger({ page }),
    queryFn: () => api.page<MemberEntry>('/org/tokens/my-ledger', { page, limit: 25 }),
    enabled: tab === 'mine',
    placeholderData: keepPreviousData,
  });
  const usage = useQuery({
    queryKey: qk.tokens.usage,
    queryFn: () => api.get<{ byFeature: { feature: string; tokens: number }[]; byMember: { userId: string; name: string; tokens: number }[] }>('/org/tokens/usage'),
    enabled: can('tokens.allocate', 'tokens.purchase') && tab === 'usage',
  });

  if (isLoading || !wallet) return <PageSkeleton />;

  return (
    <>
      <PageHeader
        title={isSuperAdmin ? 'Credits Allocation' : 'Tokens'}
        subtitle={
          isSuperAdmin
            ? 'Manage organisation credits, member allocations, and credit ledger.'
            : 'Tokens pay for publishing jobs, unlocking resumes and AI features.'
        }
        actions={
          can('tokens.purchase') && (
            <Link to="/org/billing">
              <Button icon={CreditCard}>{isSuperAdmin ? 'Billing & purchases' : 'Buy tokens'}</Button>
            </Link>
          )
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {wallet.myAllocation && !isSuperAdmin ? (
          <>
            <KpiCard label="My tokens left" value={fmtNum(wallet.myAllocation.remaining)} icon={Coins} tone="amber" />
            <KpiCard label="Allocated to me" value={fmtNum(wallet.myAllocation.allocated)} tone="indigo" />
            <KpiCard label="I have used" value={fmtNum(wallet.myAllocation.consumed)} tone="violet" />
            <KpiCard label="Organisation balance" value={fmtNum(wallet.balance)} tone="emerald" />
          </>
        ) : (
          <>
            <KpiCard
              label={isSuperAdmin ? 'Available credits' : 'Balance'}
              value={fmtNum(wallet.balance)}
              hint={wallet.balance < wallet.lowBalanceThreshold ? 'Running low' : undefined}
              icon={Coins}
              tone="amber"
            />
            <KpiCard
              label={isSuperAdmin ? 'Unallocated credits' : 'Unallocated (yours to spend)'}
              value={fmtNum(wallet.unallocated)}
              tone="emerald"
            />
            <KpiCard label="Allocated to members" value={fmtNum(wallet.allocatedToMembers)} tone="indigo" />
            <KpiCard
              label={isSuperAdmin ? 'Total credits consumed' : 'Used to date'}
              value={fmtNum(wallet.consumed)}
              hint={`${fmtNum(wallet.lifetimeReceived)} received in total`}
              tone="violet"
            />
          </>
        )}
      </div>

      <Card className="mb-6 p-4">
        <p className="mb-2 text-xs font-medium text-slate-500">Price list</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(wallet.costs).map(([k, v]) => (
            <Badge key={k} tone="amber">
              {label(k)}: {v}
            </Badge>
          ))}
        </div>
      </Card>

      <Tabs<TokenTab>
        value={tab}
        onChange={(t) => { setTab(t); setPage(1); }}
        tabs={[
          ...(admin ? [{ key: 'allocations' as const, label: isSuperAdmin ? 'Member allocations' : 'Allocations' }] : []),
          ...(can('tokens.allocate', 'tokens.purchase') ? [{ key: 'ledger' as const, label: 'Organisation ledger' }, { key: 'usage' as const, label: 'Usage breakdown' }] : []),
          ...(!isSuperAdmin ? [{ key: 'mine' as const, label: 'My activity' }] : []),
        ]}
      />

      {tab === 'allocations' && (
        <DataTable
          loading={allocations.isLoading}
          rows={(allocations.data ?? []).map((a) => ({ ...a, id: a.userId }))}
          empty={<EmptyState title="No members to allocate to" />}
          columns={[
            { key: 'name', header: 'Member', cell: (a) => <div><p className="font-medium text-slate-800">{a.name}</p><p className="text-xs text-slate-500">{ROLE_LABEL[a.role]}</p></div> },
            { key: 'alloc', header: 'Allocated', cell: (a) => fmtNum(a.allocated) },
            { key: 'used', header: 'Used', cell: (a) => fmtNum(a.consumed) },
            {
              key: 'left',
              header: 'Remaining',
              cell: (a) => (
                <div className="w-32">
                  <span className="text-sm font-medium">{fmtNum(a.remaining)}</span>
                  <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                    <div className="h-1.5 rounded-full bg-amber-400" style={{ width: `${a.allocated ? Math.round((a.consumed / a.allocated) * 100) : 0}%` }} />
                  </div>
                </div>
              ),
            },
            { key: 'act', header: '', className: 'text-right', cell: (a) => a.canManage && <Button size="sm" variant="secondary" onClick={() => setAllocating(a)}>Adjust</Button> },
          ]}
        />
      )}

      {tab === 'ledger' && (
        <DataTable
          loading={ledger.isLoading}
          rows={ledger.data?.data}
          meta={ledger.data?.meta}
          onPage={setPage}
          columns={[
            { key: 'when', header: 'When', cell: (r) => fmtDateTime(r.createdAt) },
            { key: 'type', header: 'Type', cell: (r) => <Badge tone={r.amount > 0 ? 'green' : 'amber'}>{label(r.type)}</Badge> },
            { key: 'amount', header: 'Amount', cell: (r) => <span className={r.amount > 0 ? 'text-emerald-600' : 'text-slate-700'}>{r.amount > 0 ? `+${r.amount}` : r.amount}</span> },
            { key: 'bal', header: 'Balance', hideOnMobile: true, cell: (r) => fmtNum(r.balanceAfter) },
            { key: 'reason', header: 'Details', hideOnMobile: true, cell: (r) => <span className="text-xs text-slate-500">{r.reason ?? label(r.feature)} · {r.actor.name}</span> },
          ]}
        />
      )}

      {tab === 'usage' && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader title="By feature" />
            <ul className="divide-y divide-slate-100">
              {(usage.data?.byFeature ?? []).map((f) => (
                <li key={f.feature} className="flex justify-between px-5 py-2.5 text-sm">
                  <span>{label(f.feature)}</span>
                  <span className="font-medium">{fmtNum(f.tokens)}</span>
                </li>
              ))}
              {usage.data && !usage.data.byFeature.length && <li className="px-5 py-4 text-sm text-slate-400">No usage yet.</li>}
            </ul>
          </Card>
          <Card>
            <CardHeader title="By member" />
            <ul className="divide-y divide-slate-100">
              {(usage.data?.byMember ?? []).map((m) => (
                <li key={m.userId} className="flex justify-between px-5 py-2.5 text-sm">
                  <span>{m.name}</span>
                  <span className="font-medium">{fmtNum(m.tokens)}</span>
                </li>
              ))}
              {usage.data && !usage.data.byMember.length && <li className="px-5 py-4 text-sm text-slate-400">No usage yet.</li>}
            </ul>
          </Card>
        </div>
      )}

      {tab === 'mine' && (
        <DataTable
          loading={mine.isLoading}
          rows={mine.data?.data}
          meta={mine.data?.meta}
          onPage={setPage}
          empty={<EmptyState icon={Coins} title="No token activity yet" />}
          columns={[
            { key: 'when', header: 'When', cell: (r) => fmtDateTime(r.createdAt) },
            { key: 'type', header: 'Type', cell: (r) => <Badge tone={r.type === 'ALLOCATE' || r.type === 'REFUND' ? 'green' : 'amber'}>{label(r.type)}</Badge> },
            { key: 'amount', header: 'Tokens', cell: (r) => fmtNum(r.amount) },
            { key: 'reason', header: 'Details', hideOnMobile: true, cell: (r) => <span className="text-xs text-slate-500">{r.reason ?? '—'}</span> },
          ]}
        />
      )}

      {allocating && <AllocateSheet member={allocating} wallet={wallet} onClose={() => setAllocating(null)} />}
    </>
  );
}

function AllocateSheet({ member, wallet, onClose }: { member: Allocation; wallet: Wallet; onClose: () => void }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const n = Number(amount);
  const pool = wallet.myAllocation ? wallet.myAllocation.remaining : wallet.unallocated;
  const invalid = !Number.isInteger(n) || n === 0 || n > pool || -n > member.remaining;
  const save = useMutation({
    mutationFn: () => api.post('/org/tokens/allocations', { userId: member.userId, amount: n, reason: reason || undefined }),
    onSuccess: () => {
      toast.success(n > 0 ? `Allocated ${n} tokens to ${member.name}` : `Took back ${-n} tokens`);
      qc.invalidateQueries({ queryKey: qk.tokens.all });
      qc.invalidateQueries({ queryKey: qk.me });
      onClose();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <Sheet
      open
      onClose={onClose}
      title={`Adjust tokens · ${member.name}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={invalid} loading={save.isPending} onClick={() => save.mutate()}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Available to allocate: <b>{fmtNum(pool)}</b> · {member.name} has <b>{fmtNum(member.remaining)}</b> unused.
        </p>
        <Field label="Amount" hint="Positive to allocate, negative to take back unused tokens">
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        </Field>
        <Field label="Reason (optional)">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
      </div>
    </Sheet>
  );
}

// ---------------- billing ----------------

interface Plan {
  id: string;
  name: string;
  description: string | null;
  tokenAmount: number;
  priceCents: number;
  currency: string;
  billingCycle: string;
  features: string[];
}

interface Payment {
  id: string;
  planName: string;
  tokens: number;
  amount: number;
  currency: string;
  status: string;
  invoiceNumber: string | null;
  failureReason: string | null;
  createdAt: string;
  paidAt: string | null;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (e: string, cb: (r: unknown) => void) => void };
  }
}

function loadCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Could not load the payment window'));
    document.body.appendChild(s);
  });
}

export function BillingPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { can } = usePermissions();
  const [page, setPage] = useState(1);
  const plans = useQuery({ queryKey: qk.billing.plans, queryFn: () => api.get<Plan[]>('/org/billing/plans'), staleTime: STALE.reference });
  const payments = useQuery({
    queryKey: qk.billing.payments({ page }),
    queryFn: () => api.page<Payment>('/org/billing/payments', { page, limit: 20 }),
    placeholderData: keepPreviousData,
  });

  const buy = useMutation({
    mutationFn: async (plan: Plan) => {
      const order = await api.post<{ orderId: string; amount: number; currency: string; keyId: string; organisationName: string; email: string; name: string; planName: string }>(
        '/org/billing/orders',
        { planId: plan.id },
      );
      await loadCheckout();
      return order;
    },
    onSuccess: (order) => {
      const rzp = new window.Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: order.organisationName,
        description: order.planName,
        prefill: { email: order.email, name: order.name },
        theme: { color: '#4f46e5' },
        // Client "success" never credits tokens — the verified webhook does. We just refresh.
        handler: () => {
          toast.success('Payment received — tokens appear as soon as the payment is confirmed.');
          qc.invalidateQueries({ queryKey: qk.billing.all });
          qc.invalidateQueries({ queryKey: qk.tokens.all });
        },
        modal: { ondismiss: () => qc.invalidateQueries({ queryKey: qk.billing.all }) },
      });
      rzp.on('payment.failed', () => toast.error('Payment failed. You have not been charged tokens.'));
      rzp.open();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <>
      <PageHeader title="Billing" subtitle="Buy token packs. Prices are set by the platform." />
      {can('tokens.purchase') && (
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          {plans.isLoading && <PageSkeleton />}
          {plans.data?.map((p) => (
            <Card key={p.id} className="flex flex-col p-5">
              <p className="text-sm font-semibold text-slate-800">{p.name}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{fmtMoney(p.priceCents, p.currency)}</p>
              <p className="text-xs text-slate-500">
                {fmtNum(p.tokenAmount)} tokens · {label(p.billingCycle)}
              </p>
              {p.description && <p className="mt-3 text-sm text-slate-600">{p.description}</p>}
              <ul className="mt-3 flex-1 space-y-1 text-sm text-slate-600">
                {(Array.isArray(p.features) ? p.features : []).map((f) => (
                  <li key={f}>✓ {f}</li>
                ))}
              </ul>
              <Button className="mt-4" loading={buy.isPending && buy.variables?.id === p.id} onClick={() => buy.mutate(p)}>
                Buy
              </Button>
            </Card>
          ))}
        </div>
      )}
      <h2 className="mb-3 text-sm font-semibold text-slate-800">Payments & invoices</h2>
      <DataTable
        loading={payments.isLoading}
        rows={payments.data?.data}
        meta={payments.data?.meta}
        onPage={setPage}
        onRowClick={(p) => p.status === 'PAID' && navigate(`/org/billing/${p.id}`)}
        empty={<EmptyState icon={Receipt} title="No payments yet" />}
        columns={[
          { key: 'date', header: 'Date', cell: (p) => fmtDate(p.createdAt) },
          { key: 'plan', header: 'Plan', cell: (p) => `${p.planName} · ${fmtNum(p.tokens)} tokens` },
          { key: 'amount', header: 'Amount', cell: (p) => fmtMoney(p.amount, p.currency) },
          { key: 'status', header: 'Status', cell: (p) => <span title={p.failureReason ?? undefined}><StatusBadge status={p.status} /></span> },
          { key: 'inv', header: 'Invoice', hideOnMobile: true, cell: (p) => (p.invoiceNumber ? <span className="text-indigo-600">{p.invoiceNumber}</span> : '—') },
        ]}
      />
    </>
  );
}

export function InvoicePage() {
  const { id } = useParams();
  const { data: p, isLoading } = useQuery({
    queryKey: qk.billing.payment(id),
    queryFn: () => api.get<Payment & { billedTo: { name: string; email: string; address: string | null }; razorpayPaymentId: string | null }>(`/org/billing/payments/${id}`),
  });
  if (isLoading || !p) return <PageSkeleton />;
  return (
    <>
      <PageHeader
        back={{ to: '/org/billing', label: 'Billing' }}
        title={`Invoice ${p.invoiceNumber ?? ''}`}
        actions={
          <Button variant="secondary" icon={Printer} onClick={() => window.print()} className="no-print">
            Print / save PDF
          </Button>
        }
      />
      <Card className="mx-auto max-w-2xl p-8">
        <div className="flex justify-between">
          <div>
            <p className="text-lg font-semibold text-slate-900">Clyptus</p>
            <p className="text-xs text-slate-500">Token purchase receipt</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-medium text-slate-800">{p.invoiceNumber}</p>
            <p className="text-slate-500">Paid {fmtDate(p.paidAt)}</p>
          </div>
        </div>
        <div className="mt-8 text-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">Billed to</p>
          <p className="font-medium text-slate-800">{p.billedTo.name}</p>
          <p className="text-slate-500">{p.billedTo.email}</p>
          {p.billedTo.address && <p className="text-slate-500">{p.billedTo.address}</p>}
        </div>
        <table className="mt-8 w-full text-sm">
          <thead className="border-b border-slate-200 text-left text-xs text-slate-500">
            <tr>
              <th className="py-2">Item</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="py-3">
                {p.planName} — {fmtNum(p.tokens)} tokens
              </td>
              <td className="py-3 text-right">{fmtMoney(p.amount, p.currency)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td className="py-3 font-semibold">Total paid</td>
              <td className="py-3 text-right font-semibold">{fmtMoney(p.amount, p.currency)}</td>
            </tr>
          </tfoot>
        </table>
        {p.razorpayPaymentId && <p className="mt-6 text-xs text-slate-400">Payment reference: {p.razorpayPaymentId}</p>}
      </Card>
    </>
  );
}
