'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';

import { FeedbackDetailsModal } from '@/components/modals/info-modal';

type DashboardFeedback = {
  id: string;
  subject: string;
  from: string;
  fromUsername?: string | null;
  createdAt?: string | null;
  message?: string | null;
  status?: string | null;
};

type DashboardFeedbackResponse = {
  feedback?: DashboardFeedback[];
  error?: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL;

function formatDashboardShortDate(value?: string | null) {
  const raw = String(value ?? '').trim();
  if (!raw) return '—';

  const ms = Date.parse(raw);
  if (!Number.isFinite(ms)) return '—';

  return new Date(ms).toLocaleDateString();
}

function getUsername(value?: string | null) {
  const raw = String(value ?? '').trim();
  if (!raw) return 'unknown_user';
  return raw.startsWith('@') ? raw : `@${raw}`;
}

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
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
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
          disabled={page <= 1}
          onClick={onPrev}
        >
          Prev
        </button>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-2xl border border-black/10 bg-black/5 px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-black/10 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={page >= totalPages}
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
  const [allRows, setAllRows] = React.useState<DashboardFeedback[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [detailsFeedback, setDetailsFeedback] =
    React.useState<DashboardFeedback | null>(null);

  const loadFeedback = React.useCallback(async () => {
    if (!API_URL) {
      setLoadError('Missing NEXT_PUBLIC_API_URL.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);

    try {
      const res = await fetch(`${API_URL}/api/dashboard/feedback`, {
        method: 'GET',
        credentials: 'include',
      });

      const data = (await res
        .json()
        .catch(() => ({}))) as DashboardFeedbackResponse;

      if (!res.ok) {
        setLoadError(data.error || 'Could not load feedback.');
        return;
      }

      setAllRows(Array.isArray(data.feedback) ? data.feedback : []);
    } catch {
      setLoadError('Could not load feedback.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadFeedback();
  }, [loadFeedback]);

  const filteredRows = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allRows;

    return allRows.filter((row) =>
      [
        row.id,
        row.subject,
        row.from,
        row.fromUsername,
        row.message,
        row.createdAt,
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

  const openDetails = React.useCallback((row: DashboardFeedback) => {
    setDetailsFeedback(row);
    setDetailsOpen(true);
  }, []);

  const closeDetails = React.useCallback(() => {
    setDetailsOpen(false);
    setDetailsFeedback(null);
  }, []);

  return (
    <div className="grid gap-4">
      <Card className="p-5">
        <div className="text-sm font-semibold">Feedback</div>
        <div className="mt-1 text-xs text-black/50">
          Review customer feedback and internal notes.
        </div>
      </Card>

      <FeedbackDetailsModal
        open={detailsOpen}
        kind="feedback"
        value={detailsFeedback?.subject ?? null}
        message={detailsFeedback?.message ?? null}
        onClose={closeDetails}
      />

      {loadError ? (
        <Card className="p-6 text-sm text-red-500">{loadError}</Card>
      ) : null}

      <Table columns="2.2fr 1.2fr 1fr 1.2fr">
        <>
          <div>Subject</div>
          <div>From</div>
          <div>Received</div>
          <div className="text-right">Actions</div>
        </>

        {rows.map((r) => (
          <Row key={r.id} columns="2.2fr 1.2fr 1fr 1.2fr">
            <div className="min-w-0">
              <div className="truncate font-semibold text-black">
                {r.subject}
              </div>
            </div>

            <div className="truncate text-black/70">
              {getUsername(r.fromUsername ?? r.from)}
            </div>

            <div className="text-black/70">
              {formatDashboardShortDate(r.createdAt)}
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="inline-flex items-center rounded-2xl border border-black/10 bg-black/5 px-2.5 py-1.5 text-xs font-semibold text-black/70 transition hover:bg-black/10"
                onClick={() => openDetails(r)}
              >
                Open
              </button>
            </div>
          </Row>
        ))}
      </Table>

      {loading ? (
        <Card className="p-6 text-sm text-black/70">Loading feedback…</Card>
      ) : null}

      {!loading && total > 0 ? (
        <PaginationControls
          page={page}
          totalPages={totalPages}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
        />
      ) : null}

      {!loading && total === 0 && !loadError ? (
        <Card className="p-6 text-sm text-black/70">No feedback found.</Card>
      ) : null}
    </div>
  );
}
