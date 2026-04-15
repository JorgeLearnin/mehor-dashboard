'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';

import { PaginationControls } from '../../../components/pagination-controls';
import { ConfirmationModal } from '../../../components/modals/confirmation-modal';
import {
  FeedbackDetailsModal,
  type DashboardFeedback,
} from '../../../components/modals/feedback-details-modal';
import { formatDashboardShortDate } from '../../../lib/dashboard-formatters';
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

type FeedbackRow = {
  id: string;
  subject: string;
  from: string;
  createdAt: string | null;
};

type FeedbackListResponse = {
  feedback: FeedbackRow[];
  total: number;
  page: number;
  limit: number;
};

type FeedbackDetailsResponse = {
  feedback: DashboardFeedback;
};

export default function Page() {
  return (
    <React.Suspense fallback={null}>
      <FeedbackPage />
    </React.Suspense>
  );
}

function FeedbackPage() {
  const searchParams = useSearchParams();
  const search = searchParams.get('q') ?? '';
  return <Feedback search={search} />;
}

function Feedback({ search }: { search: string }) {
  const [rows, setRows] = React.useState<FeedbackRow[] | null>(null);
  const [total, setTotal] = React.useState(0);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [reloadToken, setReloadToken] = React.useState(0);
  const [detailsBusy, setDetailsBusy] = React.useState(false);
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [detailsFeedback, setDetailsFeedback] =
    React.useState<DashboardFeedback | null>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirmId, setConfirmId] = React.useState<string | null>(null);
  const { page, setPage, pageSize, totalPages } = usePagination({
    total,
    resetKey: search,
    pageSize: 10,
  });

  const baseUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:5000';

  React.useEffect(() => {
    const ac = new AbortController();
    setLoadError(null);

    const qs = new URLSearchParams();
    if (search.trim()) qs.set('q', search.trim());
    qs.set('page', String(page));
    qs.set('limit', String(pageSize));

    fetch(`${baseUrl}/api/dashboard/feedback?${qs.toString()}`, {
      credentials: 'include',
      signal: ac.signal,
    })
      .then(async (resp) => {
        const raw = (await resp.json().catch(() => null)) as unknown;
        const maybeError = raw as { error?: unknown };
        const data = raw as Partial<FeedbackListResponse>;

        if (!resp.ok) {
          const message =
            typeof maybeError?.error === 'string'
              ? maybeError.error
              : 'Could not load feedback';
          throw new Error(message);
        }

        setRows(
          Array.isArray(data?.feedback) ? (data.feedback as FeedbackRow[]) : [],
        );
        setTotal(Number.isFinite(data?.total) ? Number(data.total) : 0);
      })
      .catch((e) => {
        if (e instanceof Error && e.name === 'AbortError') return;
        setRows([]);
        setTotal(0);
        setLoadError(
          e instanceof Error ? e.message : 'Could not load feedback',
        );
      });

    return () => ac.abort();
  }, [baseUrl, page, pageSize, reloadToken, search]);

  const openRemove = React.useCallback((id: string) => {
    setConfirmId(id);
    setConfirmOpen(true);
  }, []);

  const openDetails = React.useCallback(
    async (row: FeedbackRow) => {
      setLoadError(null);
      setDetailsBusy(true);
      try {
        const resp = await fetch(
          `${baseUrl}/api/dashboard/feedback/${row.id}`,
          {
            credentials: 'include',
          },
        );

        const raw = (await resp.json().catch(() => null)) as unknown;
        const maybeError = raw as { error?: unknown };
        const data = raw as Partial<FeedbackDetailsResponse>;

        if (!resp.ok) {
          const message =
            typeof maybeError?.error === 'string'
              ? maybeError.error
              : 'Could not load feedback';
          throw new Error(message);
        }

        setDetailsFeedback(data?.feedback ?? null);
        setDetailsOpen(true);
      } catch (e) {
        setLoadError(
          e instanceof Error ? e.message : 'Could not load feedback',
        );
      } finally {
        setDetailsBusy(false);
      }
    },
    [baseUrl],
  );

  const closeDetails = React.useCallback(() => {
    setDetailsOpen(false);
    setDetailsFeedback(null);
  }, []);

  const closeRemove = React.useCallback(() => {
    setConfirmOpen(false);
    setConfirmId(null);
  }, []);

  const confirmRemove = React.useCallback(async () => {
    if (!confirmId) return;
    setLoadError(null);

    const resp = await fetch(`${baseUrl}/api/dashboard/feedback/${confirmId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!resp.ok) {
      const data = await resp.json().catch(() => null);
      const message =
        typeof data?.error === 'string'
          ? data.error
          : 'Could not remove feedback';
      setLoadError(message);
      return;
    }

    closeRemove();
    if ((rows?.length ?? 0) <= 1) {
      if (page > 1) {
        setPage((p) => Math.max(1, p - 1));
      } else {
        setReloadToken((t) => t + 1);
      }
    } else {
      setReloadToken((t) => t + 1);
    }
  }, [baseUrl, closeRemove, confirmId, page, rows?.length, setPage]);

  return (
    <div className="grid gap-4">
      <Card className="p-5">
        <div className="text-sm font-semibold">Feedback</div>
        <div className="mt-1 text-xs text-black/50">
          Review customer feedback and internal notes.
        </div>
      </Card>

      <ConfirmationModal
        open={confirmOpen}
        title="Remove feedback?"
        description="This will remove the feedback entry from this view."
        confirmLabel="Remove"
        cancelLabel="Cancel"
        onClose={closeRemove}
        onConfirm={confirmRemove}
      />

      <FeedbackDetailsModal
        open={detailsOpen}
        feedback={detailsFeedback}
        onClose={closeDetails}
      />

      <Table columns="2.2fr 1.2fr 1fr 1.2fr">
        <>
          <div>Subject</div>
          <div>From</div>
          <div>Received</div>
          <div className="text-right">Actions</div>
        </>
        {rows?.map((r) => (
          <Row key={r.id} columns="2.2fr 1.2fr 1fr 1.2fr">
            <div className="min-w-0">
              <div className="truncate font-semibold text-black">
                {r.subject}
              </div>
            </div>
            <div className="truncate text-black/70">{r.from}</div>
            <div className="text-black/70">
              {formatDashboardShortDate(r.createdAt)}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="inline-flex items-center rounded-2xl border border-black/10 bg-black/5 px-2.5 py-1.5 text-xs font-semibold text-black/70 transition hover:bg-black/10"
                onClick={() => openDetails(r)}
                disabled={detailsBusy}
              >
                Open
              </button>
              <button
                type="button"
                className="inline-flex items-center rounded-2xl border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                onClick={() => openRemove(r.id)}
              >
                Remove
              </button>
            </div>
          </Row>
        ))}
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
      ) : null}

      {rows && total === 0 ? (
        <Card className="p-6 text-sm text-black/70">No feedback found.</Card>
      ) : null}
    </div>
  );
}
