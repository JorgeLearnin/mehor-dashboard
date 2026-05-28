'use client';

import * as React from 'react';
import { Paperclip } from 'lucide-react';

import { ConfirmationModal } from '@/components/modals/confirmation-modal';

function PartRefundModal({
  open,
  busy = false,
  title = 'Part-refund',
  description = 'What percentage should be refunded to the buyer?',
  cancelLabel = 'Cancel',
  confirmLabel = 'Continue',
  onConfirm,
  onClose,
}: {
  open: boolean;
  busy?: boolean;
  title?: string;
  description?: string | null;
  cancelLabel?: string;
  confirmLabel?: string;
  onConfirm: (percent: number) => void | Promise<void>;
  onClose: () => void;
}) {
  const [percent, setPercent] = React.useState('');

  React.useEffect(() => {
    if (!open) return;
    setPercent('');
  }, [open]);

  if (!open) return null;

  const parsed = percent.trim() ? Number(percent.trim()) : null;
  const clamped =
    parsed === null || !Number.isFinite(parsed)
      ? null
      : Math.min(100, Math.max(1, parsed));
  const isValid = clamped !== null && Number.isFinite(clamped);

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/30"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      />

      <div className="absolute inset-0 flex items-center justify-center overflow-auto p-4 sm:p-8">
        <div className="w-full max-w-md overflow-hidden rounded-3xl border border-black/10 bg-white shadow-lg shadow-black/10">
          <div className="flex items-start justify-between gap-4 border-b border-black/10 p-5">
            <div className="min-w-0">
              <div className="text-sm font-semibold">{title}</div>
              {description ? (
                <div className="mt-1 text-xs text-black/50">{description}</div>
              ) : null}
            </div>
            <button
              className="rounded-2xl px-3 py-2 text-sm font-semibold text-black/70 hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={onClose}
              disabled={busy}
            >
              Close
            </button>
          </div>

          <div className="p-5">
            <div className="grid gap-2">
              <div className="text-xs font-semibold text-black/50">
                Refund percentage <span className="text-red-600">*</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  inputMode="numeric"
                  value={percent}
                  onChange={(e) => setPercent(e.target.value)}
                  onBlur={() => {
                    if (clamped !== null)
                      setPercent(String(Math.round(clamped)));
                  }}
                  placeholder="e.g. 25"
                  className="h-11 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm text-black/90 outline-none placeholder:text-black/35 focus:border-black/30 disabled:cursor-not-allowed disabled:bg-black/5"
                  disabled={busy}
                  aria-required="true"
                />
                <div className="shrink-0 text-sm font-semibold text-black/60">
                  %
                </div>
              </div>
              <div className="text-xs text-black/50">
                Enter a value from 1 to 100.
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-black/10 p-5">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-2xl border border-black/10 bg-black/5 px-4 py-2 text-sm font-semibold text-black transition hover:bg-black/10 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={onClose}
              disabled={busy}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-2xl bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-black/90 disabled:cursor-not-allowed disabled:bg-black/20 disabled:text-white/70 disabled:hover:bg-black/20"
              onClick={() => {
                if (isValid && clamped !== null)
                  void onConfirm(Math.round(clamped));
              }}
              disabled={busy || !isValid}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
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

function formatTimelineStamp(ms: number) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(ms));
  } catch {
    return '—';
  }
}

function sanitizeAttachmentName(name: string | null | undefined) {
  return String(name || '')
    .trim()
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .slice(0, 255);
}

function getAttachmentKindFromUrl(
  url: string | null | undefined,
  explicitKind?: 'image' | 'pdf' | null,
) {
  if (explicitKind) return explicitKind;
  const raw = String(url || '')
    .trim()
    .toLowerCase();
  if (!raw) return null;
  if (raw.includes('/raw/upload/') || raw.endsWith('.pdf')) return 'pdf';
  return 'image';
}

function getAttachmentLabel(
  url: string | null | undefined,
  kind?: 'image' | 'pdf' | null,
  attachmentName?: string | null,
) {
  const cleaned = sanitizeAttachmentName(attachmentName);
  if (cleaned && !/^https?:\/\//i.test(cleaned)) return cleaned;
  const raw = String(url || '').trim();
  if (!raw) return kind === 'pdf' ? 'document.pdf' : 'image.jpg';
  const last = raw.split('?')[0].split('#')[0].split('/').pop() || '';
  return last || (kind === 'pdf' ? 'document.pdf' : 'image.jpg');
}

const WEBSITE_DISPUTE_REASON_LABELS = [
  'Delivery issue',
  'Missing files',
  'Incorrect access',
  'Quality not as described',
  'Other',
] as const;

function formatWebsiteDisputeReasonLabel(
  reasonRaw: unknown,
  otherReasonRaw?: unknown,
) {
  const reason = String(reasonRaw ?? '').trim();
  if (!reason) return '';
  const lower = reason.toLowerCase();
  const direct = WEBSITE_DISPUTE_REASON_LABELS.find(
    (label) => label.toLowerCase() === lower,
  );
  if (direct) return direct;
  if (lower === 'delivery_issue') return 'Delivery issue';
  if (lower === 'files_missing') return 'Missing files';
  if (lower === 'cannot_run') return 'Incorrect access';
  if (lower === 'not_as_described') return 'Quality not as described';
  if (lower === 'other') {
    const other = String(otherReasonRaw ?? '').trim();
    const otherLabel = WEBSITE_DISPUTE_REASON_LABELS.find(
      (label) => label.toLowerCase() === other.toLowerCase(),
    );
    return otherLabel || 'Other';
  }
  return '';
}

export function DisputeResolutionModal({
  open,
  dispute,
  busy = false,
  error,
  messages,
  onClose,
  onResolve,
  onSendReply,
  onSendAttachment,
}: {
  open: boolean;
  dispute: {
    orderId: string;
    orderNumber?: string | null;
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
    buyer?: {
      id?: string | number | null;
      name?: string | null;
      username?: string | null;
      email?: string | null;
    } | null;
    seller?: {
      id?: string | number | null;
      name?: string | null;
      username?: string | null;
      email?: string | null;
    } | null;
  } | null;
  busy?: boolean;
  error?: string | null;
  messages: Array<{
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
      mimeType?: string | null;
      attachmentKind: 'image' | 'pdf' | null;
    }>;
  }>;
  onClose: () => void;
  onResolve: (input: {
    action: 'cancel' | 'approve' | 'part_refund';
    reason: string;
    percent?: number;
  }) => void | Promise<void>;
  onSendReply: (orderId: string, body: string) => void;
  onSendAttachment: (orderId: string, file: File) => void;
}) {
  const [decisionReason, setDecisionReason] = React.useState('');
  const [replyText, setReplyText] = React.useState('');
  const [confirmAction, setConfirmAction] = React.useState<
    'cancel-order' | 'approve-order' | null
  >(null);
  const [partRefundOpen, setPartRefundOpen] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setDecisionReason('');
    setReplyText('');
    setConfirmAction(null);
    setPartRefundOpen(false);
  }, [open]);

  if (!open || !dispute) return null;

  const orderDisplay = (() => {
    const raw = String(dispute.orderNumber ?? dispute.orderId ?? '').trim();
    if (!raw) return '—';
    return `#${raw.slice(-8)}`;
  })();

  const listingTitle = String(dispute.listing?.title ?? '').trim() || '—';
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
  const subtotalUsd = Math.max(0, Number(dispute.subtotalUsd ?? 0));
  const openedAtRaw = dispute.openedAt ?? dispute.disputeOpenedAt ?? null;
  const openedAtMs = Number.isFinite(Date.parse(String(openedAtRaw ?? '')))
    ? Date.parse(String(openedAtRaw ?? ''))
    : Date.now();
  const canTakeAction = !busy && !!decisionReason.trim();
  const discussion = messages.map((message) => {
    const parsed = Date.parse(String(message.createdAt ?? ''));
    const atMs = Number.isFinite(parsed) ? parsed : openedAtMs;
    const who =
      message.senderId === String(dispute.buyer?.id ?? '')
        ? 'Buyer'
        : message.senderId === String(dispute.seller?.id ?? '')
          ? 'Seller'
          : message.senderId === 'mehor_support_user'
            ? 'Mehor team'
            : 'User';
    const lines: Array<{ label?: string; value: React.ReactNode }> = [];
    const body = String(message.body ?? '').trim();

    if (message.isInitial) {
      const reasonLabel = formatWebsiteDisputeReasonLabel(message.reason ?? '');

      if (reasonLabel) {
        lines.push({ label: 'Reason', value: reasonLabel });
      }

      if (body) {
        lines.push({ label: 'Details', value: body });
      }
    } else if (body) {
      lines.push({ label: 'Message', value: body });
    }
    const attachments = Array.isArray(message.attachments)
      ? message.attachments
      : message.imageUrl
        ? [
            {
              id: message.id,
              url: message.imageUrl,
              publicId: message.imagePublicId,
              fileName: message.attachmentName,
              attachmentKind: message.attachmentKind ?? null,
            },
          ]
        : [];

    for (const attachment of attachments) {
      const attachmentUrl = String(attachment.url ?? '').trim();
      if (!attachmentUrl) continue;

      const kind = getAttachmentKindFromUrl(
        attachmentUrl,
        attachment.attachmentKind ?? null,
      );

      lines.push({
        label: '',
        value: (
          <a
            href={attachmentUrl}
            download={sanitizeAttachmentName(attachment.fileName) || true}
            className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline"
          >
            {kind === 'pdf' ? <Paperclip className="h-4 w-4 shrink-0" /> : null}
            {getAttachmentLabel(
              attachmentUrl,
              kind,
              attachment.fileName ?? null,
            )}
          </a>
        ),
      });
    }
    return {
      atMs,
      who,
      lines: lines.length ? lines : [{ label: 'Message', value: '—' }],
    };
  });

  return (
    <div className="fixed inset-0 z-50">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          e.target.value = '';
          if (!file) return;
          onSendAttachment(dispute.orderId, file);
        }}
      />

      <div
        className="absolute inset-0 bg-black/30"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      />

      <div className="absolute inset-0 flex items-center justify-center overflow-auto p-4 sm:p-8">
        <div className="flex max-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-black/10 bg-white shadow-lg shadow-black/10 sm:max-h-[calc(100vh-6rem)]">
          <div className="flex items-start justify-between gap-4 border-b border-black/10 p-5">
            <div className="min-w-0">
              <div className="text-sm font-semibold">Resolve dispute</div>
              <div className="mt-1 truncate text-xs text-black/50">
                Order:{' '}
                <span className="font-semibold text-black">{orderDisplay}</span>
              </div>
            </div>
            <button
              className="rounded-2xl px-3 py-2 text-sm font-semibold text-black/70 hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={onClose}
              disabled={busy}
            >
              Close
            </button>
          </div>

          <div className="min-h-0 overflow-y-auto">
            <div className="grid gap-4 p-5">
              {error ? (
                <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
                <div className="min-w-0">
                  <div className="flex min-h-130 flex-col rounded-3xl border border-black/10 bg-white p-4">
                    <div className="text-xs font-semibold text-black/60">
                      Discussion
                    </div>

                    <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-2">
                      <div className="relative">
                        <div className="absolute bottom-2 left-3 top-2 w-0.5 -translate-x-1/2 bg-black/10" />

                        <div className="grid gap-5">
                          {discussion.map((event, idx) => (
                            <div
                              key={idx}
                              className="grid grid-cols-[24px_1fr] gap-x-3"
                            >
                              <div className="flex justify-center">
                                <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-black ring-2 ring-white" />
                              </div>

                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-black">
                                  {formatTimelineStamp(event.atMs)} —{' '}
                                  {event.who}
                                </div>

                                <div className="mt-2 grid gap-1 text-sm text-black/70">
                                  {event.lines.map((line, lineIdx) => (
                                    <div key={lineIdx}>
                                      {String(line.label)
                                        .trim()
                                        .toLowerCase() === 'message' ? (
                                        <span className="whitespace-pre-line">
                                          {line.value}
                                        </span>
                                      ) : !String(line.label).trim() ? (
                                        <span className="break-all">
                                          {line.value}
                                        </span>
                                      ) : (
                                        <>
                                          <span className="font-semibold text-black/80">
                                            {line.label}:
                                          </span>{' '}
                                          <span className="break-all">
                                            {line.value}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <input
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Add reply..."
                        className="h-11 w-full flex-1 rounded-full border border-black/10 bg-white px-4 text-sm text-black/90 outline-none placeholder:text-black/35 focus:border-black/30 disabled:cursor-not-allowed disabled:bg-black/5"
                        disabled={busy}
                      />

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={busy}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white text-black/70 transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Attach file"
                        title="Attach"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-5 w-5"
                        >
                          <path d="M18.364 5.636l-9.193 9.193a3 3 0 104.243 4.243l9.193-9.193a4.5 4.5 0 10-6.364-6.364l-9.193 9.193a6 6 0 108.485 8.485l9.193-9.193" />
                        </svg>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const body = replyText.trim();
                          if (!body) return;
                          onSendReply(dispute.orderId, body);
                          setReplyText('');
                        }}
                        disabled={busy || !replyText.trim()}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white text-black/70 transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Send reply"
                        title="Send"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-5 w-5"
                        >
                          <path d="M22 2L11 13" />
                          <path d="M22 2l-7 20-4-9-9-4 20-7z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="min-w-0 lg:sticky lg:top-5 lg:self-start">
                  <div className="grid gap-4">
                    <div className="rounded-3xl border border-black/10 bg-white p-4">
                      <div className="text-xs font-semibold text-black/60">
                        Info
                      </div>

                      <div className="mt-3 grid gap-4 text-sm text-black/80 lg:grid-cols-2">
                        <div className="grid gap-3">
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
                              Total base price
                            </div>
                            <div className="mt-1 font-semibold text-black">
                              ${subtotalUsd.toLocaleString()}
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-3 lg:justify-items-end">
                          <div className="w-full lg:max-w-70">
                            <div className="text-xs font-semibold text-black/50">
                              Buyer
                            </div>
                            <div className="mt-1">{buyer}</div>
                          </div>
                          <div className="w-full lg:max-w-70">
                            <div className="text-xs font-semibold text-black/50">
                              Seller
                            </div>
                            <div className="mt-1">{seller}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-black/10 bg-white p-4">
                      <div className="text-xs font-semibold text-black/60">
                        Actions
                      </div>

                      <div className="mt-3 grid gap-3 text-sm text-black/80">
                        <div className="grid gap-2">
                          <div className="text-xs font-semibold text-black/50">
                            Decision reason{' '}
                            <span className="text-red-600">*</span>
                          </div>

                          <textarea
                            value={decisionReason}
                            onChange={(e) => setDecisionReason(e.target.value)}
                            placeholder="Explain why the dashboard made this decision…"
                            className="min-h-28 w-full resize-none rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-black/90 outline-none placeholder:text-black/35 focus:border-black/30 disabled:cursor-not-allowed disabled:bg-black/5"
                            disabled={busy}
                            required
                          />

                          <div className="grid gap-2">
                            <button
                              type="button"
                              disabled={!canTakeAction}
                              onClick={() => setConfirmAction('cancel-order')}
                              className="inline-flex items-center justify-center rounded-2xl border border-black/10 bg-black/5 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-black/10 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Cancel order
                            </button>

                            <button
                              type="button"
                              disabled={!canTakeAction}
                              onClick={() => setPartRefundOpen(true)}
                              className="inline-flex items-center justify-center rounded-2xl border border-black/10 bg-black/5 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-black/10 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Part-refund
                            </button>

                            <button
                              type="button"
                              disabled={!canTakeAction}
                              onClick={() => setConfirmAction('approve-order')}
                              className="inline-flex items-center justify-center rounded-2xl bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-black/90 disabled:cursor-not-allowed disabled:bg-black/20 disabled:text-white/70 disabled:hover:bg-black/20"
                            >
                              Approve order
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-black/10 p-5">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-2xl border border-black/10 bg-black/5 px-4 py-2 text-sm font-semibold text-black transition hover:bg-black/10 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      <ConfirmationModal
        open={!!confirmAction}
        title={
          confirmAction === 'cancel-order' ? 'Cancel order' : 'Approve order'
        }
        description={
          confirmAction === 'cancel-order'
            ? 'This will cancel the order and resolve the dispute.'
            : 'This will approve the order and resolve the dispute.'
        }
        confirmLabel={
          confirmAction === 'cancel-order' ? 'Cancel order' : 'Approve order'
        }
        busy={busy}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => {
          if (!canTakeAction) return;
          const reason = decisionReason.trim();
          const action =
            confirmAction === 'cancel-order' ? 'cancel' : 'approve';
          setConfirmAction(null);
          void onResolve({ action, reason });
        }}
      />

      <PartRefundModal
        open={partRefundOpen}
        busy={busy}
        onClose={() => setPartRefundOpen(false)}
        onConfirm={(percent) => {
          if (!canTakeAction) return;
          const reason = decisionReason.trim();
          setPartRefundOpen(false);
          void onResolve({ action: 'part_refund', reason, percent });
        }}
      />
    </div>
  );
}
