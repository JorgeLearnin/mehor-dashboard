import * as React from 'react';
import {
  formatDashboardActor,
  formatDashboardDateTime,
  getDashboardOrderDisplay,
} from '@/lib/dashboard-formatters';

export type DashboardTransaction = {
  orderId: string;
  orderNumber?: string | null;
  orderStatus?: string | null;
  transactionStatus: 'completed' | 'canceled' | 'part-refunded';
  createdAt?: string | null;
  paidAt?: string | null;
  updatedAt?: string | null;
  subtotalUsd: number;
  refundedSubtotalUsd: number;
  listing?: { id?: string | null; title?: string | null } | null;
  buyer?: {
    id?: string | null;
    name?: string | null;
    username?: string | null;
    email?: string | null;
  } | null;
  seller?: {
    id?: string | null;
    name?: string | null;
    username?: string | null;
    email?: string | null;
  } | null;
  dispute?: { openedAt?: string | null; resolvedAt?: string | null } | null;
};

export function TransactionDetailsModal({
  open,
  transaction,
  onClose,
}: {
  open: boolean;
  transaction: DashboardTransaction | null;
  onClose: () => void;
}) {
  if (!open || !transaction) return null;

  const orderDisplay = getDashboardOrderDisplay(
    transaction.orderNumber,
    transaction.orderId,
  ).full;

  const listingTitle = String(transaction.listing?.title ?? '').trim() || '—';
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

  const subtotalUsd = Math.max(0, Number(transaction.subtotalUsd ?? 0));
  const refundedSubtotalUsd = Math.max(
    0,
    Number(transaction.refundedSubtotalUsd ?? 0),
  );

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
              <div className="text-sm font-semibold">Transaction</div>
              <div className="mt-1 truncate text-xs text-black/50">
                Order:{' '}
                <span className="font-semibold text-black">{orderDisplay}</span>
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
                      Listing
                    </div>
                    <div className="mt-1 font-semibold text-black">
                      {listingTitle}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-black/50">
                      Status
                    </div>
                    <div className="mt-1 font-semibold text-black">
                      {transaction.transactionStatus}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-black/50">
                      Buyer
                    </div>
                    <div className="mt-1">{buyer}</div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-black/50">
                      Seller
                    </div>
                    <div className="mt-1">{seller}</div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-black/50">
                      Subtotal (base + add-ons)
                    </div>
                    <div className="mt-1 font-semibold text-black">
                      ${subtotalUsd.toLocaleString()}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-black/50">
                      Refunded (subtotal)
                    </div>
                    <div className="mt-1 font-semibold text-black">
                      ${refundedSubtotalUsd.toLocaleString()}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-black/50">
                      Paid at
                    </div>
                    <div className="mt-1">
                      {formatDashboardDateTime(transaction.paidAt)}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-black/50">
                      Updated at
                    </div>
                    <div className="mt-1">
                      {formatDashboardDateTime(transaction.updatedAt)}
                    </div>
                  </div>

                  {transaction.dispute?.openedAt ? (
                    <div className="sm:col-span-2">
                      <div className="text-xs font-semibold text-black/50">
                        Dispute
                      </div>
                      <div className="mt-1 text-sm text-black/70">
                        Opened:{' '}
                        {formatDashboardDateTime(transaction.dispute?.openedAt)}
                        {' · '}Resolved:{' '}
                        {formatDashboardDateTime(transaction.dispute?.resolvedAt)}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
