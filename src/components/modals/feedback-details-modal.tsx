import * as React from 'react';

import { formatDashboardDateTime } from '@/lib/dashboard-formatters';

export type DashboardFeedback = {
  id: string;
  subject: string;
  from: string;
  createdAt?: string | null;
  message?: string | null;
  orderId?: string | null;
  listingTitle?: string | null;
  type?: 'buyer' | 'seller' | 'internal' | 'other' | null;
};

export function FeedbackDetailsModal({
  open,
  feedback,
  onClose,
}: {
  open: boolean;
  feedback: DashboardFeedback | null;
  onClose: () => void;
}) {
  if (!open || !feedback) return null;

  const subject = String(feedback.subject ?? '').trim() || '—';
  const from = String(feedback.from ?? '').trim() || '—';
  const message = String(feedback.message ?? '').trim() || '—';
  const createdAt = formatDashboardDateTime(feedback.createdAt);
  const orderId = String(feedback.orderId ?? '').trim();
  const listingTitle = String(feedback.listingTitle ?? '').trim();
  const type = String(feedback.type ?? '').trim() || '—';

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
              <div className="text-sm font-semibold">Feedback</div>
              <div className="mt-1 truncate text-xs text-black/50">
                <span className="font-semibold text-black">{subject}</span>
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
                  Details
                </div>

                <div className="mt-3 grid gap-3 text-sm text-black/80 sm:grid-cols-2">
                  <div>
                    <div className="text-xs font-semibold text-black/50">
                      From
                    </div>
                    <div className="mt-1 font-semibold text-black">{from}</div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-black/50">
                      Received
                    </div>
                    <div className="mt-1">{createdAt}</div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-black/50">
                      Type
                    </div>
                    <div className="mt-1">{type}</div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-black/50">
                      Related
                    </div>
                    <div className="mt-1 text-black/70">
                      {orderId || listingTitle
                        ? `${orderId ? `Order: ${orderId}` : ''}${
                            orderId && listingTitle ? ' · ' : ''
                          }${listingTitle ? `Listing: ${listingTitle}` : ''}`
                        : '—'}
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <div className="text-xs font-semibold text-black/50">
                      Message
                    </div>
                    <div className="mt-2 whitespace-pre-wrap rounded-2xl border border-black/10 bg-black/5 p-3 text-sm text-black/80">
                      {message}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-black/10 bg-white p-4">
                <div className="text-xs font-semibold text-black/60">Notes</div>
                <div className="mt-2 text-sm text-black/70">
                  UI only for now — this modal will later support internal
                  notes, labeling, and follow-up actions.
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
