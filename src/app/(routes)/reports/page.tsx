'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';

import { PaginationControls } from '../../../components/pagination-controls';
import { ConfirmationModal } from '../../../components/modals/confirmation-modal';
import {
  ReportDetailsModal,
  type DashboardReport,
} from '../../../components/modals/report-details-modal';
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

type ReportRow = {
  id: string;
  targetLabel: string;
  reason: string;
  reporterLabel: string;
  createdAt: string | null;
};

type ReportsListResponse = {
  reports: ReportRow[];
  total: number;
  page: number;
  limit: number;
};

type ReportDetailsResponse = {
  report: DashboardReport;
};

export default function Page() {
  return (
    <React.Suspense fallback={null}>
      <ReportsPage />
    </React.Suspense>
  );
}

function ReportsPage() {
  const searchParams = useSearchParams();
  const search = searchParams.get('q') ?? '';
  return <Reports search={search} />;
}

function Reports({ search }: { search: string }) {
  const [rows, setRows] = React.useState<ReportRow[] | null>(null);
  const [total, setTotal] = React.useState(0);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [reloadToken, setReloadToken] = React.useState(0);
  const [detailsBusy, setDetailsBusy] = React.useState(false);
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [detailsReport, setDetailsReport] =
    React.useState<DashboardReport | null>(null);
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

  const reload = React.useCallback(
    (signal?: AbortSignal) => {
      setLoadError(null);

      const qs = new URLSearchParams();
      if (search.trim()) qs.set('q', search.trim());
      qs.set('page', String(page));
      qs.set('limit', String(pageSize));

      return fetch(`${baseUrl}/api/dashboard/reports?${qs.toString()}`, {
        credentials: 'include',
        signal,
      });
    },
    [baseUrl, page, pageSize, search],
  );

  React.useEffect(() => {
    const ac = new AbortController();
    setRows(null);

    reload(ac.signal)
      .then(async (resp) => {
        const raw = (await resp.json().catch(() => null)) as unknown;
        const maybeError = raw as { error?: unknown };
        const data = raw as Partial<ReportsListResponse>;

        if (!resp.ok) {
          const message =
            typeof maybeError?.error === 'string'
              ? maybeError.error
              : 'Could not load reports';
          throw new Error(message);
        }

        setRows(Array.isArray(data?.reports) ? data.reports : []);
        setTotal(Number.isFinite(data?.total) ? Number(data.total) : 0);
      })
      .catch((e) => {
        if (e instanceof Error && e.name === 'AbortError') return;
        setRows([]);
        setTotal(0);
        setLoadError(e instanceof Error ? e.message : 'Could not load reports');
      });

    return () => ac.abort();
  }, [reload, reloadToken]);

  const openRemove = React.useCallback((id: string) => {
    setConfirmId(id);
    setConfirmOpen(true);
  }, []);

  const openDetails = React.useCallback(
    async (row: ReportRow) => {
      setLoadError(null);
      setDetailsBusy(true);
      try {
        const resp = await fetch(`${baseUrl}/api/dashboard/reports/${row.id}`, {
          credentials: 'include',
        });

        const raw = (await resp.json().catch(() => null)) as unknown;
        const maybeError = raw as { error?: unknown };
        const data = raw as Partial<ReportDetailsResponse>;

        if (!resp.ok) {
          const message =
            typeof maybeError?.error === 'string'
              ? maybeError.error
              : 'Could not load report';
          throw new Error(message);
        }

        setDetailsReport(data?.report ?? null);
        setDetailsOpen(true);
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : 'Could not load report');
      } finally {
        setDetailsBusy(false);
      }
    },
    [baseUrl],
  );

  const closeDetails = React.useCallback(() => {
    setDetailsOpen(false);
    setDetailsReport(null);
  }, []);

  const closeRemove = React.useCallback(() => {
    setConfirmOpen(false);
    setConfirmId(null);
  }, []);

  const confirmRemove = React.useCallback(async () => {
    if (!confirmId) return;
    setLoadError(null);

    const resp = await fetch(`${baseUrl}/api/dashboard/reports/${confirmId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!resp.ok) {
      const data = await resp.json().catch(() => null);
      const message =
        typeof data?.error === 'string'
          ? data.error
          : 'Could not remove report';
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
        <div className="text-sm font-semibold">Reports</div>
        <div className="mt-1 text-xs text-black/50">
          Review submitted website reports.
        </div>
      </Card>

      <ConfirmationModal
        open={confirmOpen}
        title="Remove report?"
        description="This will remove the report entry from this view."
        confirmLabel="Remove"
        cancelLabel="Cancel"
        onClose={closeRemove}
        onConfirm={confirmRemove}
      />

      <ReportDetailsModal
        open={detailsOpen}
        report={detailsReport}
        onClose={closeDetails}
      />

      <Table columns="2fr 1.2fr 1.2fr 1fr 1.1fr">
        <>
          <div>Target</div>
          <div>Reason</div>
          <div>Reporter</div>
          <div>Submitted</div>
          <div className="text-right">Actions</div>
        </>
        {rows?.map((r) => (
          <Row key={r.id} columns="2fr 1.2fr 1.2fr 1fr 1.1fr">
            <div className="min-w-0">
              <div className="truncate font-semibold text-black">
                {r.targetLabel}
              </div>
            </div>
            <div className="text-black/70">{r.reason}</div>
            <div className="text-black/70">{r.reporterLabel}</div>
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
        <Card className="p-6 text-sm text-black/70">No reports found.</Card>
      ) : null}
    </div>
  );
}
