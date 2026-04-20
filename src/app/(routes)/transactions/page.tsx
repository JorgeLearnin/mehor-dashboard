'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';

import { PaginationControls } from '../../../components/pagination-controls';
import {
  TransactionDetailsModal,
  type DashboardTransaction,
} from '../../../components/modals/transaction-details-modal';
import {
  formatDashboardActor,
  getDashboardOrderDisplay,
} from '../../../lib/dashboard-formatters';
import { getDashboardApiBaseUrl } from '../../../lib/api-base';
import { usePagination } from '../../../lib/use-pagination';

function Card({
  children,
  className = '',
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={`rounded-3xl border border-black/10 bg-white shadow-lg shadow-black/5 ${className}`}
    >
      {children}
    </div>
  );
}

type BadgeTone = 'neutral' | 'good' | 'warn' | 'bad';

function Badge({
  children,
  tone = 'neutral',
}: React.PropsWithChildren<{ tone?: BadgeTone }>) {
  const tones: Record<BadgeTone, string> = {
    neutral: 'bg-black/5 text-black/70 ring-black/10',
    good: 'bg-black text-white ring-black/15',
    warn: 'bg-black/5 text-black/80 ring-black/10',
    bad: 'bg-black/5 text-black/80 ring-black/10',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 backdrop-blur ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function Table({
  columns,
  children,
}: React.PropsWithChildren<{ columns: string }>) {
  const parts = React.Children.toArray(children);
  const header = parts[0];
  const rows = parts.slice(1);
  return (
    <div className="overflow-hidden rounded-3xl border border-black/10 bg-white">
      <div
        className="grid gap-0 border-b border-black/10 bg-black/5 px-4 py-3 text-xs font-semibold text-black/60"
        style={{ gridTemplateColumns: columns }}
      >
        {header}
      </div>
      <div>{rows}</div>
    </div>
  );
}

function Row({
  columns,
  children,
}: React.PropsWithChildren<{ columns: string }>) {
  return (
    <div
      className="grid items-center gap-0 px-4 py-3 text-sm text-black/80 hover:bg-black/5"
      style={{ gridTemplateColumns: columns }}
    >
      {children}
    </div>
  );
}

type TransactionsResponse = {
  transactions: DashboardTransaction[];
  total: number;
  page: number;
  limit: number;
};

export default function Page() {
  return (
    <React.Suspense fallback={null}>
      <TransactionsPage />
    </React.Suspense>
  );
}

function TransactionsPage() {
  const searchParams = useSearchParams();
  const search = searchParams.get('q') ?? '';
  return <Transactions search={search} />;
}

function Transactions({ search }: { search: string }) {
  const [rows, setRows] = React.useState<DashboardTransaction[] | null>(null);
  const [total, setTotal] = React.useState(0);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<DashboardTransaction | null>(
    null,
  );
  const { page, setPage, pageSize, totalPages } = usePagination({
    total,
    resetKey: search,
    pageSize: 10,
  });

  const baseUrl = getDashboardApiBaseUrl();

  const openTransaction = React.useCallback((t: DashboardTransaction) => {
    setSelected(t);
    setOpen(true);
  }, []);

  const closeModal = React.useCallback(() => {
    setOpen(false);
    setSelected(null);
  }, []);

  React.useEffect(() => {
    const ac = new AbortController();
    setLoadError(null);

    const qs = new URLSearchParams();
    if (search.trim()) qs.set('q', search.trim());
    qs.set('page', String(page));
    qs.set('limit', String(pageSize));

    fetch(`${baseUrl}/api/dashboard/transactions?${qs.toString()}`, {
      credentials: 'include',
      signal: ac.signal,
    })
      .then(async (resp) => {
        const raw = (await resp.json().catch(() => null)) as unknown;
        const maybeError = raw as { error?: unknown };
        const data = raw as Partial<TransactionsResponse>;

        if (!resp.ok) {
          const message =
            typeof maybeError?.error === 'string'
              ? maybeError.error
              : 'Could not load transactions';
          throw new Error(message);
        }

        setRows(Array.isArray(data?.transactions) ? data.transactions : []);
        setTotal(Number.isFinite(data?.total) ? Number(data.total) : 0);
      })
      .catch((e) => {
        if (e instanceof Error && e.name === 'AbortError') return;
        setRows([]);
        setTotal(0);
        setLoadError(
          e instanceof Error ? e.message : 'Could not load transactions',
        );
      });

    return () => ac.abort();
  }, [baseUrl, page, pageSize, search]);

  return (
    <div className="grid gap-4">
      <Card className="p-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Transactions</div>
            <div className="mt-1 text-xs text-black/50">
              Review settled orders and outcomes.
            </div>
          </div>
        </div>
      </Card>

      <TransactionDetailsModal
        open={open}
        transaction={selected}
        onClose={closeModal}
      />

      <Table columns="1.2fr 2.2fr 1fr 1.2fr 1fr 1fr">
        <>
          <div>Order #</div>
          <div>Listing</div>
          <div>Amount</div>
          <div>Status</div>
          <div>Buyer</div>
          <div className="text-right">Action</div>
        </>
        {rows?.map((t) => {
          const order = getDashboardOrderDisplay(t.orderNumber, t.orderId);
          const listingTitle = t.listing?.title ?? '—';
          const buyer = formatDashboardActor({
            username: t.buyer?.username,
            email: t.buyer?.email,
            name: t.buyer?.name,
          });
          const seller = formatDashboardActor({
            username: t.seller?.username,
            email: t.seller?.email,
            name: t.seller?.name,
          });

          const statusLabel =
            t.transactionStatus === 'part-refunded'
              ? 'Part-refunded'
              : t.transactionStatus === 'canceled'
                ? 'Canceled'
                : 'Completed';

          return (
            <Row key={t.orderId} columns="1.2fr 2.2fr 1fr 1.2fr 1fr 1fr">
              <div className="font-semibold text-black">{order.full}</div>
              <div className="min-w-0">
                <div className="truncate font-semibold text-black">
                  {listingTitle}
                </div>
                <div className="mt-1 text-xs text-black/50">
                  Seller: {seller}
                </div>
              </div>
              <div className="font-semibold text-black">
                ${Number(t.subtotalUsd ?? 0).toLocaleString()}
              </div>
              <div>
                <Badge>{statusLabel}</Badge>
              </div>
              <div>{buyer}</div>
              <div className="flex justify-end">
                <button
                  type="button"
                  className="inline-flex items-center rounded-2xl border border-black/10 bg-black/5 px-2.5 py-1.5 text-xs font-semibold text-black/70 transition hover:bg-black/10 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => openTransaction(t)}
                >
                  Open
                </button>
              </div>
            </Row>
          );
        })}
      </Table>

      {rows && !loadError && total > 0 ? (
        <PaginationControls
          page={page}
          totalPages={totalPages}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
        />
      ) : null}

      {loadError ? (
        <Card className="p-6 text-sm text-black/70">{loadError}</Card>
      ) : rows && total === 0 ? (
        <Card className="p-6 text-sm text-black/70">
          No transactions match your search.
        </Card>
      ) : null}
    </div>
  );
}
