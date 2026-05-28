'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';

import { DisputeResolutionModal } from '@/components/modals/dispute-resolution-modal';

type DashboardActor = {
  id?: string | number | null;
  name?: string | null;
  username?: string | null;
  email?: string | null;
};

type DashboardDispute = {
  id: string;
  orderId: string;
  orderNumber?: string | null;
  status?: string | null;
  orderStatus?: string | null;
  openedAt?: string | null;
  openedStage?: string | null;
  disputeOpenedAt?: string | null;
  disputeOpenedStage?: string | null;
  resolvedAt?: string | null;
  reason?: string | null;
  disputeReason?: string | null;
  otherReason?: string | null;
  disputeOtherReason?: string | null;
  message?: string | null;
  disputeMessage?: string | null;
  subtotalUsd?: number | null;
  serviceFeeUsd?: number | null;
  totalUsd?: number | null;
  listing?: { id?: string | null; title?: string | null } | null;
  buyer?: DashboardActor | null;
  seller?: DashboardActor | null;
};

type DashboardDisputeMessage = {
  id: string;
  senderId: string;
  senderRole: string | null;
  body: string;
  reason?: string | null;
  openedStage?: string | null;
  isInitial?: boolean;
  imageUrl: string | null;
  imagePublicId: string | null;
  attachmentName: string | null;
  attachmentKind: 'image' | 'pdf' | null;
  createdAt: string | null;
  attachments?: Array<{
    id: string;
    url: string;
    publicId: string | null;
    fileName: string | null;
    mimeType: string | null;
    attachmentKind: 'image' | 'pdf' | null;
  }>;
};

type DashboardDisputesResponse = {
  disputes?: Array<{
    id: string;
    orderId: string;
    orderPartId?: string | null;
    orderNumber?: string | null;
    listingId?: string | null;
    listingTitle?: string | null;
    totalAmount?: number | null;
    totalAmountCents?: number | null;
    status?: string | null;
    resolution?: string | null;
    openedStage?: string | null;
    orderStatus?: string | null;
    orderPaymentStatus?: string | null;
    buyer?: DashboardActor | null;
    seller?: DashboardActor | null;
    openedBy?: number | null;
    openedAt?: string | null;
    resolvedAt?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
  }>;
  error?: string;
};

type DashboardDisputeMessagesResponse = {
  dispute?: {
    id: string;
    orderId: string;
    orderNumber?: string | null;
    status?: string | null;
    openedStage?: string | null;
    openedAt?: string | null;
    resolvedAt?: string | null;
  };
  messages?: DashboardDisputeMessage[];
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

function getDisputeStatusPresentation(status?: string | null) {
  const normalized = String(status ?? '')
    .trim()
    .toLowerCase();

  if (normalized === 'resolved') {
    return {
      label: 'Resolved',
      className: 'border-green-200 bg-green-50 text-green-700',
    };
  }

  return {
    label: 'Active',
    className: 'border-red-200 bg-red-50 text-red-700',
  };
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
  const [allRows, setAllRows] = React.useState<DashboardDispute[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<DashboardDispute | null>(null);
  const [actionBusy, setActionBusy] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [messagesByOrder, setMessagesByOrder] = React.useState<
    Record<string, DashboardDisputeMessage[]>
  >({});

  const loadDisputes = React.useCallback(async () => {
    if (!API_URL) {
      setLoadError('Missing NEXT_PUBLIC_API_URL.');
      setLoading(false);
      return;
    }

    setLoadError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/dashboard/disputes`, {
        method: 'GET',
        credentials: 'include',
      });

      const data = (await res
        .json()
        .catch(() => ({}))) as DashboardDisputesResponse;

      if (!res.ok) {
        setLoadError(data.error || 'Could not load disputes.');
        return;
      }

      const rows: DashboardDispute[] = Array.isArray(data.disputes)
        ? data.disputes.map((dispute) => ({
            id: dispute.id,
            orderId: dispute.orderId,
            orderNumber: dispute.orderNumber ?? null,
            status: dispute.status ?? null,
            orderStatus: dispute.orderStatus ?? null,
            openedAt: dispute.openedAt ?? dispute.createdAt ?? null,
            openedStage: dispute.openedStage ?? null,
            disputeOpenedAt: dispute.openedAt ?? dispute.createdAt ?? null,
            disputeOpenedStage: dispute.openedStage ?? null,
            resolvedAt: dispute.resolvedAt ?? null,
            reason: dispute.status ?? null,
            disputeReason: dispute.status ?? null,
            otherReason: null,
            disputeOtherReason: null,
            message: dispute.resolution ?? null,
            disputeMessage: dispute.resolution ?? null,
            subtotalUsd:
              typeof dispute.totalAmount === 'number'
                ? dispute.totalAmount
                : Number(dispute.totalAmountCents || 0) / 100,
            serviceFeeUsd: 0,
            totalUsd:
              typeof dispute.totalAmount === 'number'
                ? dispute.totalAmount
                : Number(dispute.totalAmountCents || 0) / 100,
            listing: {
              id: dispute.listingId ?? null,
              title: dispute.listingTitle ?? null,
            },
            buyer: dispute.buyer ?? null,
            seller: dispute.seller ?? null,
          }))
        : [];

      setAllRows(rows);
    } catch {
      setLoadError('Could not load disputes.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadDisputes();
  }, [loadDisputes]);

  const loadDisputeMessages = React.useCallback(
    async (dispute: DashboardDispute) => {
      if (!API_URL) {
        setActionError('Missing NEXT_PUBLIC_API_URL.');
        return;
      }

      setActionError(null);

      try {
        const res = await fetch(
          `${API_URL}/api/dashboard/disputes/${dispute.id}/messages`,
          {
            method: 'GET',
            credentials: 'include',
          },
        );

        const data = (await res
          .json()
          .catch(() => ({}))) as DashboardDisputeMessagesResponse;

        if (!res.ok) {
          setActionError(data.error || 'Could not load dispute messages.');
          return;
        }

        setMessagesByOrder((prev) => ({
          ...prev,
          [dispute.id]: Array.isArray(data.messages) ? data.messages : [],
        }));
      } catch {
        setActionError('Could not load dispute messages.');
      }
    },
    [],
  );

  const filteredRows = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allRows;

    return allRows.filter((dispute) =>
      [
        dispute.id,
        dispute.orderId,
        dispute.orderNumber,
        dispute.listing?.title,
        dispute.buyer?.email,
        dispute.buyer?.username,
        dispute.seller?.email,
        dispute.seller?.username,
        dispute.reason,
        dispute.message,
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

  const openDispute = React.useCallback(
    (dispute: DashboardDispute) => {
      setSelected(dispute);
      setActionError(null);
      setOpen(true);
      void loadDisputeMessages(dispute);
    },
    [loadDisputeMessages],
  );

  const closeModal = React.useCallback(() => {
    if (actionBusy) return;
    setOpen(false);
    setSelected(null);
    setActionError(null);
  }, [actionBusy]);

  const resolveDispute = React.useCallback(
    async (input: {
      action: 'cancel' | 'approve' | 'part_refund';
      reason: string;
      percent?: number;
    }) => {
      if (!selected || !API_URL) return;

      setActionBusy(true);
      setActionError(null);

      try {
        const res = await fetch(
          `${API_URL}/api/dashboard/disputes/${selected.id}/resolve`,
          {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(input),
          },
        );

        const data = (await res
          .json()
          .catch(() => ({}))) as DashboardDisputeMessagesResponse & {
          order?: {
            status?: string | null;
            paymentStatus?: string | null;
            finalizedAt?: string | null;
            totalRefundedCents?: number | null;
            itemRefundedCents?: number | null;
            sellerPayoutCents?: number | null;
          };
        };

        if (!res.ok) {
          setActionError(data.error || 'Could not resolve dispute.');
          return;
        }

        setMessagesByOrder((prev) => ({
          ...prev,
          [selected.id]: Array.isArray(data.messages) ? data.messages : [],
        }));

        setAllRows((prev) =>
          prev.map((row) => {
            if (row.orderId !== selected.orderId) return row;

            return {
              ...row,
              status: 'resolved',
              orderStatus: data.order?.status ?? row.orderStatus ?? null,
              resolvedAt: data.order?.finalizedAt ?? new Date().toISOString(),
              message:
                input.action === 'cancel'
                  ? 'dashboard_canceled_order'
                  : input.action === 'approve'
                    ? 'dashboard_approved_order'
                    : 'dashboard_part_refunded_order',
              disputeMessage:
                input.action === 'cancel'
                  ? 'dashboard_canceled_order'
                  : input.action === 'approve'
                    ? 'dashboard_approved_order'
                    : 'dashboard_part_refunded_order',
            };
          }),
        );

        await loadDisputes();
        await loadDisputeMessages(selected);
      } catch {
        setActionError('Could not resolve dispute.');
      } finally {
        setActionBusy(false);
      }
    },
    [loadDisputeMessages, loadDisputes, selected],
  );

  const sendReply = React.useCallback(
    async (_orderId: string, body: string) => {
      if (!selected || !API_URL) return;

      setActionBusy(true);
      setActionError(null);

      try {
        const formData = new FormData();
        formData.append('message', body);

        const res = await fetch(
          `${API_URL}/api/dashboard/disputes/${selected.id}/messages`,
          {
            method: 'POST',
            credentials: 'include',
            body: formData,
          },
        );

        const data = (await res
          .json()
          .catch(() => ({}))) as DashboardDisputeMessagesResponse;

        if (!res.ok) {
          setActionError(data.error || 'Could not send reply.');
          return;
        }

        setMessagesByOrder((prev) => ({
          ...prev,
          [selected.id]: Array.isArray(data.messages) ? data.messages : [],
        }));
      } catch {
        setActionError('Could not send reply.');
      } finally {
        setActionBusy(false);
      }
    },
    [selected],
  );

  const sendAttachment = React.useCallback(
    async (_orderId: string, file: File) => {
      if (!selected || !API_URL) return;

      setActionBusy(true);
      setActionError(null);

      try {
        const formData = new FormData();
        formData.append('attachments', file);

        const res = await fetch(
          `${API_URL}/api/dashboard/disputes/${selected.id}/messages`,
          {
            method: 'POST',
            credentials: 'include',
            body: formData,
          },
        );

        const data = (await res
          .json()
          .catch(() => ({}))) as DashboardDisputeMessagesResponse;

        if (!res.ok) {
          setActionError(data.error || 'Could not upload attachment.');
          return;
        }

        setMessagesByOrder((prev) => ({
          ...prev,
          [selected.id]: Array.isArray(data.messages) ? data.messages : [],
        }));
      } catch {
        setActionError('Could not upload attachment.');
      } finally {
        setActionBusy(false);
      }
    },
    [selected],
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
        messages={selected ? (messagesByOrder[selected.id] ?? []) : []}
        onClose={closeModal}
        onResolve={resolveDispute}
        onSendReply={sendReply}
        onSendAttachment={sendAttachment}
      />

      {loadError ? (
        <Card className="p-6 text-sm text-red-700">{loadError}</Card>
      ) : null}

      {loading ? (
        <Card className="p-6 text-sm text-black/70">Loading disputes...</Card>
      ) : (
        <>
          <Table columns="1.1fr 2.1fr 0.9fr 1fr 1.2fr 1fr">
            <>
              <div>Order #</div>
              <div>Listing</div>
              <div>Amount</div>
              <div>Status</div>
              <div>Buyer</div>
              <div className="text-right">Action</div>
            </>

            {rows.map((dispute) => {
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
              const status = getDisputeStatusPresentation(dispute.status);

              return (
                <Row key={dispute.id} columns="1.1fr 2.1fr 0.9fr 1fr 1.2fr 1fr">
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
                    {formatMoney(Number(dispute.subtotalUsd || 0))}
                  </div>
                  <div>
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${status.className}`}
                    >
                      {status.label}
                    </span>
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

          {total > 0 ? (
            <PaginationControls
              page={page}
              totalPages={totalPages}
              onPrev={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={actionBusy}
            />
          ) : null}

          {total === 0 ? (
            <Card className="p-6 text-sm text-black/70">
              No disputes match your search.
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
