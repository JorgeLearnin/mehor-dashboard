import * as React from 'react';

import { formatDashboardDateTime } from '@/lib/dashboard-formatters';

export type DashboardReport = {
  id: string;
  targetType: string;
  targetLabel: string;
  targetId: string;
  threadId?: string | null;
  listingId?: string | null;
  listingTitle?: string | null;
  targetExcerpt?: string | null;
  reason: string;
  details: string;
  reporterLabel: string;
  reporterEmail?: string | null;
  reporterUsername?: string | null;
  reporterName?: string | null;
  createdAt?: string | null;
};

export function ReportDetailsModal({
  open,
  report,
  onClose,
}: {
  open: boolean;
  report: DashboardReport | null;
  onClose: () => void;
}) {
  if (!open || !report) return null;

  const targetLabel = String(report.targetLabel ?? '').trim() || '—';
  const targetType = String(report.targetType ?? '').trim() || '—';
  const submittedAt = formatDashboardDateTime(report.createdAt);
  const listingTitle = String(report.listingTitle ?? '').trim() || '—';
  const targetExcerpt = String(report.targetExcerpt ?? '').trim();
  const details = String(report.details ?? '').trim() || '—';
  const reporter = String(report.reporterLabel ?? '').trim() || '—';
  const reason = String(report.reason ?? '').trim() || '—';

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/30"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      />

      <div className="absolute inset-0 flex items-center justify-center overflow-auto p-4 sm:p-8">
        <div className="flex max-h-[calc(100vh-4rem)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-black/10 bg-white shadow-lg shadow-black/10 sm:max-h-[calc(100vh-6rem)]">
          <div className="flex items-start justify-between gap-4 border-b border-black/10 p-5">
            <div className="min-w-0">
              <div className="text-sm font-semibold">Report</div>
              <div className="mt-1 truncate text-xs text-black/50">
                <span className="font-semibold text-black">{targetLabel}</span>
              </div>
            </div>
            <button
              className="rounded-2xl px-3 py-2 text-sm font-semibold text-black/70 hover:bg-black/5"
              onClick={onClose}
            >
              Close
            </button>
          </div>

          <div className="min-h-0 overflow-y-auto">
            <div className="grid gap-4 p-5">
              <div className="rounded-3xl border border-black/10 bg-white p-4">
                <div className="text-xs font-semibold text-black/60">
                  Summary
                </div>

                <div className="mt-3 grid gap-3 text-sm text-black/80 sm:grid-cols-2">
                  <div>
                    <div className="text-xs font-semibold text-black/50">
                      Reason
                    </div>
                    <div className="mt-1 font-semibold text-black">
                      {reason}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-black/50">
                      Submitted
                    </div>
                    <div className="mt-1">{submittedAt}</div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-black/50">
                      Target type
                    </div>
                    <div className="mt-1">{targetType}</div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-black/50">
                      Reporter
                    </div>
                    <div className="mt-1 text-black/70">{reporter}</div>
                  </div>

                  <div className="sm:col-span-2">
                    <div className="text-xs font-semibold text-black/50">
                      Listing
                    </div>
                    <div className="mt-2 whitespace-pre-wrap rounded-2xl border border-black/10 bg-black/5 p-3 text-sm text-black/80">
                      {listingTitle}
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <div className="text-xs font-semibold text-black/50">
                      Target excerpt
                    </div>
                    <div className="mt-2 whitespace-pre-wrap rounded-2xl border border-black/10 bg-black/5 p-3 text-sm text-black/80">
                      {targetExcerpt || '—'}
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <div className="text-xs font-semibold text-black/50">
                      Report details
                    </div>
                    <div className="mt-2 whitespace-pre-wrap rounded-2xl border border-black/10 bg-black/5 p-3 text-sm text-black/80">
                      {details}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-black/10 p-5">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-2xl border border-black/10 bg-black/5 px-4 py-2 text-sm font-semibold text-black transition hover:bg-black/10"
              onClick={onClose}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
