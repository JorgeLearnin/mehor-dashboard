'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';

import { ConfirmationModal } from '@/components/modals/confirmation-modal';

type ListingRow = {
  id: string;
  title: string;
  seller: {
    id: number;
    username: string;
    name: string;
    email: string;
  };
  basePriceCents: number;
  basePrice: number;
  status: 'published' | 'disabled';
  visible: boolean;
};

type ListingsResponse = {
  listings?: ListingRow[];
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

function formatSeller(seller: ListingRow['seller']) {
  const username = String(seller?.username ?? '').trim();
  if (username) return username.startsWith('@') ? username : `@${username}`;

  const name = String(seller?.name ?? '').trim();
  if (name) return name;

  return String(seller?.email ?? '').trim() || '—';
}

function formatPrice(value: number) {
  return `$${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export default function Page() {
  return (
    <React.Suspense fallback={null}>
      <ListingsPage />
    </React.Suspense>
  );
}

function ListingsPage() {
  const searchParams = useSearchParams();
  const search = searchParams.get('q') ?? '';
  return <Listings search={search} />;
}

function Listings({ search }: { search: string }) {
  const [allRows, setAllRows] = React.useState<ListingRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirmBusy, setConfirmBusy] = React.useState(false);
  const [confirmState, setConfirmState] = React.useState<null | {
    id: string;
    title: string;
    visible: boolean;
  }>(null);

  const loadListings = React.useCallback(async () => {
    if (!API_URL) {
      setError('Missing NEXT_PUBLIC_API_URL.');
      setLoading(false);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/dashboard/listings`, {
        method: 'GET',
        credentials: 'include',
      });

      const data = (await res.json().catch(() => ({}))) as ListingsResponse;

      if (!res.ok) {
        setError(data.error || 'Could not load listings.');
        return;
      }

      setAllRows(Array.isArray(data.listings) ? data.listings : []);
    } catch {
      setError('Could not load listings.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadListings();
  }, [loadListings]);

  const filteredRows = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allRows;

    return allRows.filter((row) =>
      [
        row.id,
        row.title,
        row.seller?.username,
        row.seller?.name,
        row.seller?.email,
        row.status,
        String(row.basePrice),
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

  const closeConfirm = React.useCallback(() => {
    if (confirmBusy) return;
    setConfirmOpen(false);
    setConfirmState(null);
  }, [confirmBusy]);

  const openToggleConfirm = React.useCallback((row: ListingRow) => {
    setConfirmState({
      id: row.id,
      title: row.title,
      visible: row.visible,
    });
    setConfirmOpen(true);
  }, []);

  const confirmAction = React.useCallback(async () => {
    if (!confirmState || !API_URL) return;

    setError(null);
    setConfirmBusy(true);

    try {
      const nextVisible = !confirmState.visible;

      const res = await fetch(
        `${API_URL}/api/dashboard/listings/${confirmState.id}/visibility`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            visible: nextVisible,
          }),
        },
      );

      const data = (await res.json().catch(() => ({}))) as {
        listing?: Partial<ListingRow>;
        error?: string;
      };

      if (!res.ok) {
        setError(data.error || 'Could not update listing.');
        return;
      }

      setAllRows((prev) =>
        prev.map((row) =>
          row.id === confirmState.id
            ? {
                ...row,
                status: nextVisible ? 'published' : 'disabled',
                visible: nextVisible,
              }
            : row,
        ),
      );

      closeConfirm();
    } catch {
      setError('Could not update listing.');
    } finally {
      setConfirmBusy(false);
    }
  }, [closeConfirm, confirmState]);

  return (
    <div className="grid gap-4">
      <Card className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-sm font-semibold">Listings moderation</div>
            <div className="mt-1 text-xs text-black/50">
              Enable or disable marketplace listings.
            </div>
          </div>
        </div>
      </Card>

      <ConfirmationModal
        open={confirmOpen}
        title={confirmState?.visible ? 'Disable listing?' : 'Enable listing?'}
        description={
          confirmState?.title ? `This will affect “${confirmState.title}”.` : ''
        }
        confirmLabel={confirmState?.visible ? 'Disable' : 'Enable'}
        cancelLabel="Cancel"
        busy={confirmBusy}
        onClose={closeConfirm}
        onConfirm={confirmAction}
      />

      {error ? <Card className="p-4 text-sm text-red-700">{error}</Card> : null}

      {loading ? (
        <Card className="p-6 text-sm text-black/70">Loading listings...</Card>
      ) : (
        <>
          <Table columns="2.8fr 1fr 1fr 1.2fr">
            <>
              <div>Title</div>
              <div>Seller</div>
              <div>Price</div>
              <div className="text-right">Actions</div>
            </>

            {rows.map((listing) => (
              <Row key={listing.id} columns="2.8fr 1fr 1fr 1.2fr">
                <div className="min-w-0">
                  <div className="truncate cursor-pointer font-semibold text-black hover:underline underline-offset-2">
                    {listing.title}
                  </div>
                </div>
                <div className="text-black/80">{formatSeller(listing.seller)}</div>
                <div className="font-semibold text-black">
                  {formatPrice(listing.basePrice)}
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className={`inline-flex items-center rounded-2xl px-2.5 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      listing.visible
                        ? 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                        : 'border border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                    }`}
                    title={listing.visible ? 'Disable' : 'Enable'}
                    onClick={() => openToggleConfirm(listing)}
                    disabled={confirmBusy}
                  >
                    {listing.visible ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </Row>
            ))}
          </Table>

          {total > 0 ? (
            <PaginationControls
              page={page}
              totalPages={totalPages}
              onPrev={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={confirmBusy}
            />
          ) : null}

          {total === 0 ? (
            <Card className="p-6 text-sm text-black/70">
              No listings match your search.
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}