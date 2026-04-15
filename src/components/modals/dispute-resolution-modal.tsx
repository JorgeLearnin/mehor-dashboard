'use client';

import * as React from 'react';
import { Paperclip } from 'lucide-react';

import {
  getOptimizedAttachmentUrl,
  uploadFileToSignedCloudinaryUrl,
} from '@/lib/cloudinary';
import { formatDashboardActor } from '@/lib/dashboard-formatters';

import { ConfirmationModal } from './confirmation-modal';
import { PartRefundModal } from './part-refund-modal';

function formatTimelineStamp(ms: number) {
  try {
    const d = new Date(ms);
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(d);
  } catch {
    return '—';
  }
}

function extractFilenameFromUrl(url: string) {
  const raw = String(url || '').trim();
  if (!raw) return 'image.png';
  try {
    const u = new URL(raw);
    const last = u.pathname.split('/').filter(Boolean).pop();
    const filename = decodeURIComponent(last || '');
    const ext = filename.includes('.') ? filename.split('.').pop() : '';
    const safeExt = String(ext || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 8);
    return safeExt ? `image.${safeExt}` : 'image.png';
  } catch {
    const last = raw.split('?')[0].split('#')[0].split('/').pop();
    const filename = String(last || '');
    const ext = filename.includes('.') ? filename.split('.').pop() : '';
    const safeExt = String(ext || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 8);
    return safeExt ? `image.${safeExt}` : 'image.png';
  }
}

function getDashboardAttachmentKindFromFile(file: File | null | undefined) {
  const mimetype = String(file?.type || '').toLowerCase();
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype === 'application/pdf') return 'pdf';

  const filename = String(file?.name || '').toLowerCase();
  if (filename.endsWith('.pdf')) return 'pdf';
  return null;
}

function getDashboardAttachmentKindFromUrl(
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

function getDashboardAttachmentLabel(
  url: string | null | undefined,
  kind?: 'image' | 'pdf' | null,
  attachmentName?: string | null,
) {
  const cleanedName = String(attachmentName || '').trim();
  if (cleanedName) return cleanedName;

  const extracted = extractFilenameFromUrl(String(url || '').trim());
  if (extracted) return extracted;
  return kind === 'pdf' ? 'document.pdf' : 'image';
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
): string {
  const reason = String(reasonRaw ?? '').trim();
  if (!reason) return '';

  const lower = reason.toLowerCase();
  const direct = WEBSITE_DISPUTE_REASON_LABELS.find(
    (l) => l.toLowerCase() === lower,
  );
  if (direct) return direct;

  if (lower === 'delivery_issue') return 'Delivery issue';
  if (lower === 'files_missing') return 'Missing files';
  if (lower === 'cannot_run') return 'Incorrect access';
  if (lower === 'not_as_described') return 'Quality not as described';
  if (lower === 'seller_unresponsive') return 'Delivery issue';
  if (lower === 'late_delivery') return 'Delivery issue';

  if (lower === 'other') {
    const other = String(otherReasonRaw ?? '').trim();
    const otherLower = other.toLowerCase();
    const otherLabel = WEBSITE_DISPUTE_REASON_LABELS.find(
      (l) => l.toLowerCase() === otherLower,
    );
    if (otherLabel) return otherLabel;
    return 'Other';
  }

  return '';
}

export type DashboardDispute = {
  orderId: string;
  orderNumber?: string | null;
  orderStatus?: string | null;
  openedAt?: string | null;
  openedStage?: string | null;
  // Backend dashboard disputes list currently uses disputeOpenedAt.
  disputeOpenedAt?: string | null;
  disputeOpenedStage?: string | null;
  resolvedAt?: string | null;
  reason?: string | null;
  // Backend dashboard disputes list currently uses disputeReason.
  disputeReason?: string | null;
  otherReason?: string | null;
  // Backend dashboard disputes list currently uses disputeOtherReason.
  disputeOtherReason?: string | null;
  message?: string | null;
  // Backend dashboard disputes list currently uses disputeMessage.
  disputeMessage?: string | null;
  subtotalUsd?: number | null;
  serviceFeeUsd?: number | null;
  totalUsd?: number | null;
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
};

type DashboardDisputeMessage = {
  id: string;
  senderId: string;
  body: string;
  imageUrl: string | null;
  imagePublicId: string | null;
  attachmentName?: string | null;
  attachmentKind?: 'image' | 'pdf' | null;
  createdAt: string | null;
};

type DashboardDisputeMessagesResponse = {
  threadId: string | null;
  messages: DashboardDisputeMessage[];
};

type DashboardSendMessageResponse = {
  threadId: string | null;
  message: DashboardDisputeMessage;
};

export function DisputeResolutionModal({
  open,
  dispute,
  busy = false,
  error,
  onClose,
  onResolve,
}: {
  open: boolean;
  dispute: DashboardDispute | null;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onResolve: (input: {
    action: 'cancel' | 'approve' | 'part_refund';
    reason: string;
    percent?: number;
  }) => void | Promise<void>;
}) {
  const [decisionReason, setDecisionReason] = React.useState('');
  const [replyText, setReplyText] = React.useState('');
  const [confirmAction, setConfirmAction] = React.useState<
    'cancel-order' | 'approve-order' | null
  >(null);
  const [partRefundOpen, setPartRefundOpen] = React.useState(false);
  const [openedAtFallbackMs, setOpenedAtFallbackMs] = React.useState<
    number | null
  >(null);

  const [discussionLoading, setDiscussionLoading] = React.useState(false);
  const [discussionError, setDiscussionError] = React.useState<string | null>(
    null,
  );
  const [messages, setMessages] = React.useState<DashboardDisputeMessage[]>([]);
  const [sendingReply, setSendingReply] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const baseUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:5000';

  const disputeStage = React.useMemo(() => {
    const raw = String(
      dispute?.openedStage ?? dispute?.disputeOpenedStage ?? '',
    )
      .trim()
      .toLowerCase();
    return raw === 'addons' ? 'addons' : 'delivery';
  }, [dispute?.disputeOpenedStage, dispute?.openedStage]);

  const getAttachmentDownloadUrl = React.useCallback(
    (messageId: string) => {
      const orderId = String(dispute?.orderId ?? '').trim();
      if (!orderId || !messageId) return '';
      const qs = new URLSearchParams({ stage: disputeStage });
      return `${baseUrl}/api/dashboard/disputes/${encodeURIComponent(orderId)}/messages/${encodeURIComponent(messageId)}/attachment?${qs.toString()}`;
    },
    [baseUrl, dispute?.orderId, disputeStage],
  );

  React.useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  React.useEffect(() => {
    if (!open) return;
    setDecisionReason('');
    setReplyText('');
    setConfirmAction(null);
    setPartRefundOpen(false);
    setOpenedAtFallbackMs(Date.now());
    setDiscussionError(null);
    setDiscussionLoading(false);
    setMessages([]);
    setSendingReply(false);
  }, [open]);

  React.useEffect(() => {
    if (!open) return;

    const orderId = String(dispute?.orderId ?? '').trim();
    if (!orderId) return;
    const qs = new URLSearchParams({ stage: disputeStage });

    const ac = new AbortController();
    setDiscussionLoading(true);
    setDiscussionError(null);
    setMessages([]);

    fetch(
      `${baseUrl}/api/dashboard/disputes/${encodeURIComponent(orderId)}/messages?${qs.toString()}`,
      {
        credentials: 'include',
        signal: ac.signal,
      },
    )
      .then(async (resp) => {
        const raw = (await resp.json().catch(() => null)) as unknown;
        const maybeError = raw as { error?: unknown };
        const data = raw as Partial<DashboardDisputeMessagesResponse>;

        if (!resp.ok) {
          const message =
            typeof maybeError?.error === 'string'
              ? maybeError.error
              : 'Could not load dispute messages';
          throw new Error(message);
        }
        setMessages(
          Array.isArray(data?.messages)
            ? (data.messages as DashboardDisputeMessage[])
            : [],
        );
      })
      .catch((e) => {
        if (e instanceof Error && e.name === 'AbortError') return;
        setMessages([]);
        setDiscussionError(
          e instanceof Error ? e.message : 'Could not load dispute messages',
        );
      })
      .finally(() => {
        setDiscussionLoading(false);
      });

    return () => ac.abort();
  }, [baseUrl, dispute?.orderId, disputeStage, open]);

  const confirmCopy = React.useMemo(() => {
    if (!confirmAction) return null;
    if (confirmAction === 'cancel-order') {
      return {
        title: 'Cancel order',
        description: 'This will cancel the order and resolve the dispute.',
        confirmLabel: 'Cancel order',
      };
    }
    return {
      title: 'Approve order',
      description: 'This will approve the order and resolve the dispute.',
      confirmLabel: 'Approve order',
    };
  }, [confirmAction]);

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

  const openedAtMs = (() => {
    const openedAtRaw =
      dispute.openedAt ??
      dispute.disputeOpenedAt ??
      // tolerate older wire format
      (dispute as { disputeOpenedAt?: string | null } | null)
        ?.disputeOpenedAt ??
      null;
    const ms = Date.parse(String(openedAtRaw ?? ''));
    return Number.isFinite(ms) ? ms : (openedAtFallbackMs ?? 0);
  })();

  const discussion = (() => {
    const buyerId = String(dispute.buyer?.id ?? '').trim();
    const sellerId = String(dispute.seller?.id ?? '').trim();

    const getWhoLabel = (senderIdRaw: unknown) => {
      const senderId = String(senderIdRaw ?? '').trim();
      if (senderId && buyerId && senderId === buyerId) return 'Buyer';
      if (senderId && sellerId && senderId === sellerId) return 'Seller';
      if (senderId === 'mehor_support_user') return 'Mehor team';
      return 'User';
    };

    const openedLines: Array<{ label: string; value: React.ReactNode }> = [];
    const reasonRaw = String(
      dispute.reason ?? dispute.disputeReason ?? '',
    ).trim();
    const otherReason = String(
      dispute.otherReason ?? dispute.disputeOtherReason ?? '',
    ).trim();
    const disputeMessage = String(
      dispute.message ?? dispute.disputeMessage ?? '',
    ).trim();
    const detail = disputeMessage || otherReason;

    const reasonLabel = formatWebsiteDisputeReasonLabel(reasonRaw, otherReason);

    if (reasonLabel) openedLines.push({ label: 'Reason', value: reasonLabel });
    if (detail) openedLines.push({ label: 'Details', value: detail });

    const sourceMessages = Array.isArray(messages) ? messages : [];

    const seedIndex = sourceMessages.findIndex((m) =>
      String(m?.id ?? '').startsWith('dispute-opened:'),
    );

    const OPEN_ATTACHMENT_WINDOW_MS = 10 * 60 * 1000;
    const attachmentIndexesToMerge = new Set<number>();
    // If the buyer attached an image right when opening the dispute,
    // merge that image into the dispute-opened timeline event.
    for (let i = 0; i < sourceMessages.length; i++) {
      if (i === seedIndex) continue;
      const m = sourceMessages[i];
      const senderId = String(m?.senderId ?? '').trim();
      if (!buyerId || senderId !== buyerId) continue;
      const imageUrl = String(m?.imageUrl ?? '').trim();
      if (!imageUrl) continue;

      const ms = Date.parse(String(m?.createdAt ?? ''));
      const atMs = Number.isFinite(ms) ? ms : openedAtMs;
      if (Math.abs(atMs - openedAtMs) > OPEN_ATTACHMENT_WINDOW_MS) continue;

      // Merge the buyer's initial attachment into the opened event.
      // Common patterns:
      // - image-only message (empty body)
      // - image message whose body duplicates the dispute details text
      const body = String(m?.body ?? '').trim();
      const bodyMatchesDetails = !!detail && body === detail;
      if (body && !bodyMatchesDetails) continue;

      attachmentIndexesToMerge.add(i);
    }

    const openedAttachments = Array.from(attachmentIndexesToMerge)
      .map((i) => sourceMessages[i])
      .filter(Boolean);

    if (openedAttachments.length) {
      for (const item of openedAttachments) {
        const url = String(item?.imageUrl ?? '').trim();
        const attachmentKind = getDashboardAttachmentKindFromUrl(
          url,
          item?.attachmentKind ?? null,
        );
        const label = getDashboardAttachmentLabel(
          url,
          attachmentKind,
          item?.attachmentName ?? null,
        );
        openedLines.push({
          label: attachmentKind === 'pdf' ? 'PDF' : 'Image',
          value: (
            <a
              href={
                attachmentKind === 'pdf'
                  ? getAttachmentDownloadUrl(String(item?.id ?? ''))
                  : getOptimizedAttachmentUrl(url)
              }
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline"
            >
              {attachmentKind === 'pdf' ? (
                <Paperclip className="h-4 w-4 shrink-0" />
              ) : null}
              {label}
            </a>
          ),
        });
      }
    }

    const openedEvent = {
      atMs: openedAtMs,
      who: 'Buyer',
      lines: openedLines.length
        ? openedLines
        : [{ label: 'Message', value: '—' }],
    };

    const msgEvents = sourceMessages
      .filter(
        (_, idx) => idx !== seedIndex && !attachmentIndexesToMerge.has(idx),
      )
      .map((m) => {
        const ms = Date.parse(String(m.createdAt ?? ''));
        const atMs = Number.isFinite(ms) ? ms : openedAtMs;

        const lines: Array<{ label: string; value: React.ReactNode }> = [];
        const body = String(m.body ?? '').trim();
        const imageUrl = m.imageUrl ? String(m.imageUrl).trim() : '';
        const attachmentKind = getDashboardAttachmentKindFromUrl(
          imageUrl,
          m.attachmentKind ?? null,
        );
        const attachmentLabel = getDashboardAttachmentLabel(
          imageUrl,
          attachmentKind,
          m.attachmentName ?? null,
        );

        if (body) lines.push({ label: 'Message', value: body });
        if (imageUrl) {
          lines.push({
            label: attachmentKind === 'pdf' ? 'PDF' : 'Image',
            value: (
              <a
                href={
                  attachmentKind === 'pdf'
                    ? getAttachmentDownloadUrl(String(m.id))
                    : getOptimizedAttachmentUrl(imageUrl)
                }
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline"
              >
                {attachmentKind === 'pdf' ? (
                  <Paperclip className="h-4 w-4 shrink-0" />
                ) : null}
                {attachmentLabel}
              </a>
            ),
          });
        }

        return {
          atMs,
          who: getWhoLabel(m.senderId),
          lines: lines.length ? lines : [{ label: 'Message', value: '—' }],
        };
      });

    const all = [openedEvent, ...msgEvents];
    return all;
  })();

  const sendReply = async () => {
    if (busy) return;
    if (sendingReply) return;

    const orderId = String(dispute?.orderId ?? '').trim();
    const body = replyText.trim();
    if (!orderId || !body) return;

    setSendingReply(true);
    setDiscussionError(null);

    try {
      const qs = new URLSearchParams({ stage: disputeStage });
      const resp = await fetch(
        `${baseUrl}/api/dashboard/disputes/${encodeURIComponent(orderId)}/messages?${qs.toString()}`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body }),
        },
      );

      const raw = (await resp.json().catch(() => null)) as unknown;
      const maybeError = raw as { error?: unknown };
      const data = raw as Partial<DashboardSendMessageResponse>;

      if (!resp.ok) {
        const message =
          typeof maybeError?.error === 'string'
            ? maybeError.error
            : 'Could not send message';
        throw new Error(message);
      }

      if (data?.message?.id) {
        setMessages((prev) => [
          ...prev,
          data.message as DashboardDisputeMessage,
        ]);
      }
      setReplyText('');
    } catch (e) {
      setDiscussionError(
        e instanceof Error ? e.message : 'Could not send message',
      );
    } finally {
      setSendingReply(false);
    }
  };

  const sendAttachment = async (file: File) => {
    if (busy) return;
    if (sendingReply) return;

    const orderId = String(dispute?.orderId ?? '').trim();
    if (!orderId) return;

    setSendingReply(true);
    setDiscussionError(null);

    try {
      const mimetype = String(file.type || '').toLowerCase();
      void mimetype;
      const attachmentKind = getDashboardAttachmentKindFromFile(file);
      if (!attachmentKind) throw new Error('Only images and PDFs are allowed');
      if (attachmentKind === 'image' && file.size > 6 * 1024 * 1024) {
        throw new Error('Image is too large');
      }
      if (attachmentKind === 'pdf' && file.size > 10 * 1024 * 1024) {
        throw new Error('PDF is too large');
      }

      const qs = new URLSearchParams({ stage: disputeStage });
      const signedResp = await fetch(
        `${baseUrl}/api/dashboard/disputes/${encodeURIComponent(orderId)}/messages/upload?${qs.toString()}`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind: attachmentKind }),
        },
      );

      const signedRaw = (await signedResp.json().catch(() => null)) as unknown;
      const signedError = signedRaw as { error?: unknown };
      const signedData = signedRaw as {
        upload?: { uploadUrl: string; fields: Record<string, string | number> };
      };

      if (!signedResp.ok || !signedData?.upload) {
        const message =
          typeof signedError?.error === 'string'
            ? signedError.error
            : 'Could not prepare attachment upload';
        throw new Error(message);
      }

      const uploaded = await uploadFileToSignedCloudinaryUrl({
        file,
        upload: signedData.upload,
      });

      const resp = await fetch(
        `${baseUrl}/api/dashboard/disputes/${encodeURIComponent(orderId)}/messages?${qs.toString()}`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrl: uploaded.url,
            imagePublicId: uploaded.publicId,
            attachmentKind,
            attachmentName: String(file.name || '').trim() || null,
          }),
        },
      );

      const raw = (await resp.json().catch(() => null)) as unknown;
      const maybeError = raw as { error?: unknown };
      const data = raw as Partial<DashboardSendMessageResponse>;

      if (!resp.ok) {
        const message =
          typeof maybeError?.error === 'string'
            ? maybeError.error
            : 'Could not send attachment';
        throw new Error(message);
      }

      if (data?.message?.id) {
        setMessages((prev) => [
          ...prev,
          data.message as DashboardDisputeMessage,
        ]);
      }
    } catch (e) {
      setDiscussionError(
        e instanceof Error ? e.message : 'Could not send attachment',
      );
    } finally {
      setSendingReply(false);
    }
  };

  const canTakeAction = !busy && !!decisionReason.trim();

  return (
    <div className="fixed inset-0 z-50">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          e.target.value = '';
          if (!f) return;
          void sendAttachment(f);
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
                      {discussionLoading ? (
                        <div className="text-sm text-black/60">
                          Loading messages…
                        </div>
                      ) : discussionError ? (
                        <div className="text-sm text-red-700">
                          {discussionError}
                        </div>
                      ) : (
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
                      )}
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <input
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Add reply..."
                        className="h-11 w-full flex-1 rounded-full border border-black/10 bg-white px-4 text-sm text-black/90 outline-none placeholder:text-black/35 focus:border-black/30 disabled:cursor-not-allowed disabled:bg-black/5"
                        disabled={busy || sendingReply}
                      />

                      <button
                        type="button"
                        onClick={() => {
                          fileInputRef.current?.click();
                        }}
                        disabled={busy || sendingReply}
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
                          void sendReply();
                        }}
                        disabled={busy || sendingReply || !replyText.trim()}
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
                        </div>

                        <div className="grid gap-2">
                          <button
                            type="button"
                            disabled={!canTakeAction}
                            onClick={() => {
                              setConfirmAction('cancel-order');
                            }}
                            className="inline-flex items-center justify-center rounded-2xl border border-black/10 bg-black/5 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-black/10 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Cancel order
                          </button>

                          <button
                            type="button"
                            disabled={!canTakeAction}
                            onClick={() => {
                              setPartRefundOpen(true);
                            }}
                            className="inline-flex items-center justify-center rounded-2xl border border-black/10 bg-black/5 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-black/10 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Part-refund
                          </button>

                          <button
                            type="button"
                            disabled={!canTakeAction}
                            onClick={() => {
                              setConfirmAction('approve-order');
                            }}
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
        title={confirmCopy?.title ?? 'Confirm'}
        description={confirmCopy?.description}
        confirmLabel={confirmCopy?.confirmLabel ?? 'Confirm'}
        busy={busy}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => {
          if (!canTakeAction) return;
          const reason = decisionReason.trim();

          if (confirmAction === 'cancel-order') {
            setConfirmAction(null);
            void onResolve({ action: 'cancel', reason });
            return;
          }

          if (confirmAction === 'approve-order') {
            setConfirmAction(null);
            void onResolve({ action: 'approve', reason });
          }
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
