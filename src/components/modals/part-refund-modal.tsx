'use client';

import * as React from 'react';

export function PartRefundModal({
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
  const [percent, setPercent] = React.useState<string>('');

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
    setPercent('');
  }, [open]);

  if (!open) return null;

  const parsed = (() => {
    const trimmed = percent.trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    if (!Number.isFinite(n)) return null;
    return n;
  })();

  const clamped = parsed === null ? null : Math.min(100, Math.max(1, parsed));
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
                  onChange={(e) => {
                    const next = e.target.value;
                    // Allow empty / partial typing; clamp on blur.
                    if (!next.trim()) {
                      setPercent(next);
                      return;
                    }
                    // Accept digits and decimals; validate later.
                    setPercent(next);
                  }}
                  onBlur={() => {
                    if (clamped === null) return;
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
                if (!isValid || clamped === null) return;
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
