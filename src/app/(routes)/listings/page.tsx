'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';

import { PaginationControls } from '../../../components/pagination-controls';
import { ConfirmationModal } from '../../../components/modals/confirmation-modal';
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

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: React.PropsWithChildren<ButtonProps>) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-black/20 disabled:cursor-not-allowed disabled:opacity-40';
  const styles =
    variant === 'primary'
      ? 'bg-black text-white hover:bg-black/90'
      : variant === 'secondary'
        ? 'bg-black/5 text-black hover:bg-black/10 border border-black/10'
        : 'bg-transparent text-black/70 hover:bg-black/5';
  return (
    <button className={`${base} ${styles} ${className}`} {...props}>
      {children}
    </button>
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

type ListingRow = {
  id: string;
  title: string;
  price: number;
  seller: string;
  status: string;
};

type ListingsResponse = {
  listings: ListingRow[];
  total: number;
  page: number;
  limit: number;
};

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
  const [rows, setRows] = React.useState<ListingRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadToken, setReloadToken] = React.useState(0);
  const { page, setPage, pageSize, totalPages } = usePagination({
    total,
    resetKey: search,
    pageSize: 10,
  });

  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirmBusy, setConfirmBusy] = React.useState(false);
  const [confirmState, setConfirmState] = React.useState<null | {
    kind: 'toggle' | 'remove';
    id: string;
    status: string;
    title: string;
  }>(null);

  const displayStatus = React.useCallback((status: string) => {
    const normalized = String(status ?? '')
      .trim()
      .toLowerCase();
    if (!normalized) return 'Pending';

    if (normalized === 'pending') return 'Pending';
    if (normalized === 'active') return 'Active';
    if (normalized === 'disabled') return 'Disabled';
    if (normalized === 'sold') return 'Sold';

    // Legacy/internal statuses -> dashboard display terms
    if (normalized === 'approved') return 'Active';
    if (normalized === 'flagged') return 'Pending';
    if (normalized === 'rejected') return 'Sold';

    return status;
  }, []);

  const displaySeller = React.useCallback((seller: string) => {
    const value = String(seller ?? '').trim();
    if (!value) return '@';
    return value.startsWith('@') ? value : `@${value}`;
  }, []);

  const baseUrl = getDashboardApiBaseUrl();

  React.useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError(null);

    const qs = new URLSearchParams();
    if (search.trim()) qs.set('q', search.trim());
    qs.set('page', String(page));
    qs.set('limit', String(pageSize));

    fetch(`${baseUrl}/api/dashboard/listings?${qs.toString()}`, {
      credentials: 'include',
      signal: ac.signal,
    })
      .then(async (resp) => {
        const raw = (await resp.json().catch(() => null)) as unknown;
        const data = raw as ListingsResponse;
        const maybeError = raw as { error?: unknown };

        if (!resp.ok) {
          const message =
            typeof maybeError?.error === 'string'
              ? maybeError.error
              : 'Could not load listings';
          throw new Error(message);
        }

        setRows(Array.isArray(data?.listings) ? data.listings : []);
        setTotal(Number.isFinite(data?.total) ? data.total : 0);
      })
      .catch((e) => {
        if (e instanceof Error && e.name === 'AbortError') return;
        setRows([]);
        setTotal(0);
        setError(e instanceof Error ? e.message : 'Could not load listings');
      })
      .finally(() => {
        setLoading(false);
      });

    return () => ac.abort();
  }, [baseUrl, page, pageSize, reloadToken, search]);

  const closeConfirm = React.useCallback(() => {
    if (confirmBusy) return;
    setConfirmOpen(false);
    setConfirmState(null);
  }, [confirmBusy]);

  const openToggleConfirm = React.useCallback(
    (row: ListingRow) => {
      const s = displayStatus(row.status);
      if (s !== 'Active' && s !== 'Disabled') return;
      setConfirmState({
        kind: 'toggle',
        id: row.id,
        status: row.status,
        title: row.title,
      });
      setConfirmOpen(true);
    },
    [displayStatus],
  );

  const openRemoveConfirm = React.useCallback(
    (row: ListingRow) => {
      const s = displayStatus(row.status);
      if (s === 'Pending' || s === 'Sold') return;
      setConfirmState({
        kind: 'remove',
        id: row.id,
        status: row.status,
        title: row.title,
      });
      setConfirmOpen(true);
    },
    [displayStatus],
  );

  const confirmAction = React.useCallback(async () => {
    if (!confirmState) return;

    setError(null);
    setConfirmBusy(true);
    try {
      const s = displayStatus(confirmState.status);

      if (confirmState.kind === 'remove') {
        const resp = await fetch(
          `${baseUrl}/api/dashboard/listings/${confirmState.id}`,
          {
            method: 'DELETE',
            credentials: 'include',
          },
        );

        if (!resp.ok) {
          const data = await resp.json().catch(() => null);
          const message =
            typeof data?.error === 'string'
              ? data.error
              : 'Could not remove listing';
          setError(message);
          return;
        }

        closeConfirm();
        if (rows.length <= 1 && page > 1) {
          setPage((p) => Math.max(1, p - 1));
        } else {
          setReloadToken((t) => t + 1);
        }
        return;
      }

      if (confirmState.kind === 'toggle') {
        if (s !== 'Active' && s !== 'Disabled') return;

        const resp = await fetch(
          `${baseUrl}/api/dashboard/listings/${confirmState.id}/${s === 'Disabled' ? 'enable' : 'disable'}`,
          {
            method: 'PATCH',
            credentials: 'include',
          },
        );

        if (!resp.ok) {
          const data = await resp.json().catch(() => null);
          const message =
            typeof data?.error === 'string'
              ? data.error
              : 'Could not update listing';
          setError(message);
          return;
        }

        closeConfirm();
        setReloadToken((t) => t + 1);
      }
    } finally {
      setConfirmBusy(false);
    }
  }, [baseUrl, closeConfirm, confirmState, displayStatus, page, rows.length]);

  return (
    <div className="grid gap-4">
      <Card className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-sm font-semibold">Listings moderation</div>
            <div className="mt-1 text-xs text-black/50">
              Enable, disable, or remove listings.
            </div>
          </div>
        </div>
      </Card>

      <ConfirmationModal
        open={confirmOpen}
        title={
          confirmState?.kind === 'remove'
            ? 'Remove listing?'
            : displayStatus(confirmState?.status ?? '') === 'Disabled'
              ? 'Enable listing?'
              : 'Disable listing?'
        }
        description={
          confirmState?.title ? `This will affect “${confirmState.title}”.` : ''
        }
        confirmLabel={
          confirmState?.kind === 'remove'
            ? 'Remove'
            : displayStatus(confirmState?.status ?? '') === 'Disabled'
              ? 'Enable'
              : 'Disable'
        }
        cancelLabel="Cancel"
        busy={confirmBusy}
        onClose={closeConfirm}
        onConfirm={confirmAction}
      />

      <Table columns="2.4fr 1fr 1fr 1fr 1.2fr">
        <>
          <div>Title</div>
          <div>Seller</div>
          <div>Price</div>
          <div>Status</div>
          <div className="text-right">Actions</div>
        </>
        {rows.map((r) => (
          <Row key={r.id} columns="2.4fr 1fr 1fr 1fr 1.2fr">
            <div className="min-w-0">
              <div className="truncate cursor-pointer font-semibold text-black hover:underline underline-offset-2">
                {r.title}
              </div>
            </div>
            <div className="text-black/80">{displaySeller(r.seller)}</div>
            <div className="font-semibold text-black">${r.price}</div>
            <div>
              <Badge>{displayStatus(r.status)}</Badge>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="inline-flex items-center rounded-2xl border border-black/10 bg-black/5 px-2.5 py-1.5 text-xs font-semibold text-black/70 transition hover:bg-black/10 disabled:cursor-not-allowed disabled:opacity-50"
                title={
                  displayStatus(r.status) === 'Disabled' ? 'Enable' : 'Disable'
                }
                onClick={() => openToggleConfirm(r)}
                disabled={
                  (displayStatus(r.status) !== 'Active' &&
                    displayStatus(r.status) !== 'Disabled') ||
                  displayStatus(r.status) === 'Pending' ||
                  displayStatus(r.status) === 'Sold' ||
                  loading ||
                  confirmBusy
                }
              >
                {displayStatus(r.status) === 'Disabled' ? 'Enable' : 'Disable'}
              </button>
              <button
                type="button"
                className="inline-flex items-center rounded-2xl border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                title="Remove"
                onClick={() => openRemoveConfirm(r)}
                disabled={
                  displayStatus(r.status) === 'Pending' ||
                  displayStatus(r.status) === 'Sold' ||
                  loading ||
                  confirmBusy
                }
              >
                Remove
              </button>
            </div>
          </Row>
        ))}
      </Table>

      {error ? <Card className="p-4 text-sm text-red-700">{error}</Card> : null}

      {total > 0 ? (
        <PaginationControls
          page={page}
          totalPages={totalPages}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
        />
      ) : null}

      {!loading && total === 0 ? (
        <Card className="p-6 text-sm text-black/70">
          No listings match your search.
        </Card>
      ) : null}
    </div>
  );
}
