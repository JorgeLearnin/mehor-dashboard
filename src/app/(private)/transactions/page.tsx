'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';

import { TransactionDetailsModal } from '@/components/modals/transaction-details-modal';

type DashboardActor = {
  id?: string | null;
  name?: string | null;
  username?: string | null;
  email?: string | null;
};

type DashboardTransaction = {
  id: string;
  orderId: string;
  orderNumber?: string | null;
  orderStatus?: string | null;
  transactionStatus: 'pending' | 'completed' | 'canceled' | 'part-refunded';
  createdAt?: string | null;
  paidAt?: string | null;
  updatedAt?: string | null;
  subtotalUsd: number;
  refundedSubtotalUsd: number;
  listing?: { id?: string | null; title?: string | null } | null;
  buyer?: DashboardActor | null;
  seller?: DashboardActor | null;
  dispute?: { openedAt?: string | null; resolvedAt?: string | null } | null;
};

type DashboardTransactionsResponse = {
  transactions?: Array<{
    id: string;
    orderNumber?: string | null;
    listingId?: string | null;
    listingTitle?: string | null;
    totalAmount?: number | null;
    totalAmountCents?: number | null;
    totalRefundedCents?: number | null;
    status?: 'pending' | 'completed' | 'canceled' | 'part-refunded';
    rawStatus?: string | null;
    paymentStatus?: string | null;
    buyer?: {
      id?: string | number | null;
      name?: string | null;
      username?: string | null;
      email?: string | null;
    } | null;
    seller?: {
      id?: string | number | null;
      name?: string | null;
      username?: string | null;
      email?: string | null;
    } | null;
    createdAt?: string | null;
    finalizedAt?: string | null;
    canceledAt?: string | null;
    refundedAt?: string | null;
  }>;
  error?: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL;

function usePagination({
  total,
  resetKey,
  pageSize = 10,
}: {
  total: number;
  resetKey: string;
  pageSize?: number;
}) {
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    setPage(1);
  }, [resetKey]);

  const totalPages = React.useMemo(
    () => Math.max(1, Math.ceil(Math.max(0, total) / pageSize)),
    [pageSize, total],
  );

  React.useEffect(() => {
    setPage((prev) => Math.min(Math.max(1, prev), totalPages));
  }, [totalPages]);

  return { page, setPage, pageSize, totalPages };
}

function PaginationControls({
  page,
  totalPages,
  disabled = false,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  disabled?: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between">
      <div className="text-xs text-black/50">
        Page <span className="font-semibold text-black/70">{page}</span> of{' '}
        <span className="font-semibold text-black/70">{totalPages}</span>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-2xl border border-black/10 bg-black/5 px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-black/10 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={disabled || page <= 1}
          onClick={onPrev}
        >
          Prev
        </button>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-2xl border border-black/10 bg-black/5 px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-black/10 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={disabled || page >= totalPages}
          onClick={onNext}
        >
          Next
        </button>
      </div>
    </div>
  );
}

function getDashboardOrderDisplay(
  orderNumber?: string | null,
  orderId?: string | null,
) {
  const rawNumber = String(orderNumber ?? '').trim();
  const rawId = String(orderId ?? '').trim();
  const shortSource = rawNumber || rawId;
  const short = shortSource ? shortSource.slice(-8) : '—';
  const full = short === '—' ? '—' : `#${short}`;
  return { full, short };
}

function formatDashboardActor(value: {
  username?: string | null;
  email?: string | null;
  name?: string | null;
}) {
  const username = String(value.username ?? '').trim();
  if (username) return username.startsWith('@') ? username : `@${username}`;

  const email = String(value.email ?? '').trim();
  if (email) return email;

  const name = String(value.name ?? '').trim();
  return name || '—';
}

function formatMoney(value: number) {
  return `$${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatStatus(status: DashboardTransaction['transactionStatus']) {
  if (status === 'part-refunded') return 'Part-refunded';
  if (status === 'completed') return 'Completed';
  if (status === 'canceled') return 'Canceled';
  return 'Pending';
}

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

function Badge({ children }: React.PropsWithChildren) {
  return (
    <span className="inline-flex rounded-full border border-black/10 bg-black/5 px-2.5 py-1 text-xs font-semibold text-black/70">
      {children}
    </span>
  );
}

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
  const [allRows, setAllRows] = React.useState<DashboardTransaction[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<DashboardTransaction | null>(
    null,
  );

  const loadTransactions = React.useCallback(async () => {
    if (!API_URL) {
      setLoadError('Missing NEXT_PUBLIC_API_URL.');
      setLoading(false);
      return;
    }

    setLoadError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/dashboard/transactions`, {
        method: 'GET',
        credentials: 'include',
      });

      const data = (await res
        .json()
        .catch(() => ({}))) as DashboardTransactionsResponse;

      if (!res.ok) {
        setLoadError(data.error || 'Could not load transactions.');
        return;
      }

      const rows: DashboardTransaction[] = Array.isArray(data.transactions)
        ? data.transactions.map((transaction) => ({
            id: transaction.id,
            orderId: transaction.id,
            orderNumber: transaction.orderNumber ?? null,
            orderStatus: transaction.rawStatus ?? null,
            transactionStatus: transaction.status ?? 'pending',
            createdAt: transaction.createdAt ?? null,
            paidAt: transaction.createdAt ?? null,
            updatedAt:
              transaction.finalizedAt ??
              transaction.refundedAt ??
              transaction.canceledAt ??
              transaction.createdAt ??
              null,
            subtotalUsd:
              typeof transaction.totalAmount === 'number'
                ? transaction.totalAmount
                : Number(transaction.totalAmountCents || 0) / 100,
            refundedSubtotalUsd:
              Number(transaction.totalRefundedCents || 0) / 100,
            listing: {
              id: transaction.listingId ?? null,
              title: transaction.listingTitle ?? null,
            },
            buyer: transaction.buyer
              ? {
                  ...transaction.buyer,
                  id:
                    transaction.buyer.id == null
                      ? null
                      : String(transaction.buyer.id),
                }
              : null,
            seller: transaction.seller
              ? {
                  ...transaction.seller,
                  id:
                    transaction.seller.id == null
                      ? null
                      : String(transaction.seller.id),
                }
              : null,
            dispute: null,
          }))
        : [];

      setAllRows(rows);
    } catch {
      setLoadError('Could not load transactions.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadTransactions();
  }, [loadTransactions]);

  const filteredRows = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allRows;

    return allRows.filter((row) =>
      [
        row.orderId,
        row.orderNumber,
        row.listing?.title,
        row.buyer?.email,
        row.buyer?.username,
        row.seller?.email,
        row.seller?.username,
        row.transactionStatus,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [allRows, search]);

  const total = filteredRows.length;
  const { page, setPage, pageSize, totalPages } = usePagination({
    total,
    resetKey: search,
    pageSize: 10,
  });

  const rows = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  const openTransaction = React.useCallback(
    (transaction: DashboardTransaction) => {
      setSelected(transaction);
      setOpen(true);
    },
    [],
  );

  const closeModal = React.useCallback(() => {
    setOpen(false);
    setSelected(null);
  }, []);

  return (
    <div className="grid gap-4">
      <Card className="p-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Transactions</div>
            <div className="mt-1 text-xs text-black/50">
              Review orders and outcomes.
            </div>
          </div>
        </div>
      </Card>

      <TransactionDetailsModal
        open={open}
        transaction={selected}
        onClose={closeModal}
      />

      {loadError ? (
        <Card className="p-6 text-sm text-red-700">{loadError}</Card>
      ) : null}

      {loading ? (
        <Card className="p-6 text-sm text-black/70">
          Loading transactions...
        </Card>
      ) : (
        <>
          <Table columns="1.2fr 2.2fr 1fr 1.2fr 1fr 1fr">
            <>
              <div>Order #</div>
              <div>Listing</div>
              <div>Amount</div>
              <div>Status</div>
              <div>Buyer</div>
              <div className="text-right">Action</div>
            </>

            {rows.map((transaction) => {
              const order = getDashboardOrderDisplay(
                transaction.orderNumber,
                transaction.orderId,
              );
              const listingTitle = transaction.listing?.title ?? '—';
              const buyer = formatDashboardActor({
                username: transaction.buyer?.username,
                email: transaction.buyer?.email,
                name: transaction.buyer?.name,
              });
              const seller = formatDashboardActor({
                username: transaction.seller?.username,
                email: transaction.seller?.email,
                name: transaction.seller?.name,
              });

              return (
                <Row
                  key={transaction.orderId}
                  columns="1.2fr 2.2fr 1fr 1.2fr 1fr 1fr"
                >
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
                    {formatMoney(transaction.subtotalUsd)}
                  </div>
                  <div>
                    <Badge>{formatStatus(transaction.transactionStatus)}</Badge>
                  </div>
                  <div>{buyer}</div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="inline-flex items-center rounded-2xl border border-black/10 bg-black/5 px-2.5 py-1.5 text-xs font-semibold text-black/70 transition hover:bg-black/10 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => openTransaction(transaction)}
                    >
                      Open
                    </button>
                  </div>
                </Row>
              );
            })}
          </Table>

          {total > 0 ? (
            <PaginationControls
              page={page}
              totalPages={totalPages}
              onPrev={() => setPage((value) => Math.max(1, value - 1))}
              onNext={() => setPage((value) => Math.min(totalPages, value + 1))}
            />
          ) : null}

          {total === 0 ? (
            <Card className="p-6 text-sm text-black/70">
              No transactions match your search.
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
