'use client';

type InfoModalKind = 'feedback' | 'report';

export function FeedbackDetailsModal({
  open,
  kind,
  value,
  message,
  onClose,
}: {
  open: boolean;
  kind: InfoModalKind;
  value: string | null;
  message: string | null;
  onClose: () => void;
}) {
  if (!open) return null;

  const title = kind === 'report' ? 'Report' : 'Feedback';
  const topValue = String(value ?? '').trim() || '—';
  const details = String(message ?? '').trim() || '—';

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
              <div className="text-sm font-semibold">{title}</div>
              <div className="mt-1 truncate text-xs text-black/50">
                <span className="font-semibold text-black">{topValue}</span>
              </div>
            </div>

            <button
              type="button"
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

                <div className="mt-3 whitespace-pre-wrap text-sm text-black/80">
                  {details}
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