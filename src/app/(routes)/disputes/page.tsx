'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';

import { PaginationControls } from '../../../components/pagination-controls';
import {
  DisputeResolutionModal,
  type DashboardDispute,
} from '../../../components/modals/dispute-resolution-modal';
import {
  formatDashboardActor,
  getDashboardOrderDisplay,
} from '../../../lib/dashboard-formatters';
import { usePagination } from '../../../lib/use-pagination';

type DisputesResponse = {
  disputes: DashboardDispute[];
  total: number;
  page: number;
  limit: number;
};

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

export default function Page() {
  return (
    <React.Suspense fallback={null}>
      <DisputesPage />
    </React.Suspense>
  );
}

function DisputesPage() {
  const searchParams = useSearchParams();
  const search = searchParams.get('q') ?? '';
  return <Disputes search={search} />;
}

function Disputes({ search }: { search: string }) {
  const [rows, setRows] = React.useState<DashboardDispute[] | null>(null);
  const [total, setTotal] = React.useState(0);
  const [reloadToken, setReloadToken] = React.useState(0);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<DashboardDispute | null>(null);
  const [actionBusy, setActionBusy] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const { page, setPage, pageSize, totalPages } = usePagination({
    total,
    resetKey: search,
    pageSize: 10,
  });

  const baseUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:5000';

  const openDispute = React.useCallback((dispute: DashboardDispute) => {
    setSelected(dispute);
    setActionError(null);
    setOpen(true);
  }, []);

  const closeModal = React.useCallback(() => {
    if (actionBusy) return;
    setOpen(false);
    setSelected(null);
    setActionError(null);
  }, [actionBusy]);

  React.useEffect(() => {
    const ac = new AbortController();
    setLoadError(null);

    const qs = new URLSearchParams();
    if (search.trim()) qs.set('q', search.trim());
    qs.set('page', String(page));
    qs.set('limit', String(pageSize));

    fetch(`${baseUrl}/api/dashboard/disputes?${qs.toString()}`, {
      credentials: 'include',
      signal: ac.signal,
    })
      .then(async (resp) => {
        const raw = (await resp.json().catch(() => null)) as unknown;
        const maybeError = raw as { error?: unknown };
        const data = raw as Partial<DisputesResponse>;

        if (!resp.ok) {
          const message =
            typeof maybeError?.error === 'string'
              ? maybeError.error
              : 'Could not load disputes';
          throw new Error(message);
        }

        setRows(Array.isArray(data?.disputes) ? data.disputes : []);
        setTotal(Number.isFinite(data?.total) ? Number(data.total) : 0);
      })
      .catch((e) => {
        if (e instanceof Error && e.name === 'AbortError') return;
        setRows([]);
        setTotal(0);
        setLoadError(
          e instanceof Error ? e.message : 'Could not load disputes',
        );
      });

    return () => ac.abort();
  }, [baseUrl, page, pageSize, reloadToken, search]);

  const resolveDispute = React.useCallback(
    async (input: {
      action: 'cancel' | 'approve' | 'part_refund';
      reason: string;
      percent?: number;
    }) => {
      if (!selected) return;

      setActionBusy(true);
      setActionError(null);

      try {
        const orderId = selected.orderId;
        const resp = await fetch(
          `${baseUrl}/api/dashboard/disputes/${encodeURIComponent(orderId)}/resolve`,
          {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: input.action,
              reason: input.reason,
              percent: input.percent,
            }),
          },
        );

        const raw = (await resp.json().catch(() => null)) as unknown;
        const maybeError = raw as { error?: unknown };
        const data = raw as { ok?: unknown; order?: { orderId?: unknown } };

        if (!resp.ok) {
          const message =
            typeof maybeError?.error === 'string'
              ? maybeError.error
              : 'Resolve failed';
          throw new Error(message);
        }

        if (!data?.ok || !data?.order?.orderId) {
          throw new Error('Resolve failed');
        }

        setOpen(false);
        setSelected(null);
        setActionError(null);

        if ((rows?.length ?? 0) <= 1 && page > 1) {
          setPage((p) => Math.max(1, p - 1));
        } else {
          setReloadToken((t) => t + 1);
        }
      } catch (e) {
        setActionError(e instanceof Error ? e.message : 'Resolve failed');
      } finally {
        setActionBusy(false);
      }
    },
    [baseUrl, page, rows?.length, selected, setPage],
  );

  return (
    <div className="grid gap-4">
      <Card className="p-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Disputes</div>
            <div className="mt-1 text-xs text-black/50">
              Review evidence and decide outcomes.
            </div>
          </div>
        </div>
      </Card>

      <DisputeResolutionModal
        open={open}
        dispute={selected}
        busy={actionBusy}
        error={actionError}
        onClose={closeModal}
        onResolve={resolveDispute}
      />

      <Table columns="1.2fr 2.2fr 1fr 1.2fr 1fr">
        <>
          <div>Order #</div>
          <div>Listing</div>
          <div>Amount</div>
          <div>Buyer</div>
          <div className="text-right">Action</div>
        </>
        {rows?.map((dispute) => {
          const order = getDashboardOrderDisplay(
            dispute.orderNumber,
            dispute.orderId,
          );
          const listingTitle = dispute.listing?.title ?? '—';
          const buyer = formatDashboardActor({
            username: dispute.buyer?.username,
            email: dispute.buyer?.email,
            name: dispute.buyer?.name,
          });
          const seller = formatDashboardActor({
            username: dispute.seller?.username,
            email: dispute.seller?.email,
            name: dispute.seller?.name,
          });
          const openedStage = String(
            dispute.openedStage ?? dispute.disputeOpenedStage ?? '',
          )
            .trim()
            .toLowerCase();
          const stageLabel = openedStage === 'addons' ? 'Add-ons' : 'Delivery';

          return (
            <Row key={dispute.orderId} columns="1.2fr 2.2fr 1fr 1.2fr 1fr">
              <div className="font-semibold text-black">{order.full}</div>
              <div className="min-w-0">
                <div className="truncate font-semibold text-black">
                  {listingTitle}
                </div>
                <div className="mt-1 text-xs text-black/50">
                  Seller: {seller} • {stageLabel} dispute
                </div>
              </div>
              <div className="font-semibold text-black">
                ${Number(dispute.subtotalUsd ?? 0).toLocaleString()}
              </div>
              <div>{buyer}</div>
              <div className="flex justify-end">
                <button
                  type="button"
                  className="inline-flex items-center rounded-2xl border border-black/10 bg-black/5 px-2.5 py-1.5 text-xs font-semibold text-black/70 transition hover:bg-black/10 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => openDispute(dispute)}
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
          No disputes match your search.
        </Card>
      ) : null}
    </div>
  );
}
