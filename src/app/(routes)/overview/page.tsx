'use client';

import * as React from 'react';
import { motion } from 'framer-motion';

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

type BadgeTone = 'neutral' | 'good' | 'warn' | 'bad';

function Badge({
  children,
  tone = 'neutral',
}: React.PropsWithChildren<{ tone?: BadgeTone }>) {
  const tones: Record<BadgeTone, string> = {
    neutral: 'bg-black/5 text-black/70 ring-black/10',
    good: 'bg-black text-white ring-black/15',
    warn: 'bg-black/5 text-black/80 ring-black/10',
    bad: 'bg-black/5 text-black/80 ring-black/10',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 backdrop-blur ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: React.PropsWithChildren<ButtonProps>) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-black/20 disabled:cursor-not-allowed disabled:opacity-40';
  const styles =
    variant === 'primary'
      ? 'bg-black text-white hover:bg-black/90'
      : variant === 'secondary'
        ? 'bg-black/5 text-black hover:bg-black/10 border border-black/10'
        : 'bg-transparent text-black/70 hover:bg-black/5';
  return (
    <button className={`${base} ${styles} ${className}`} {...props}>
      {children}
    </button>
  );
}

const SAMPLE = {
  kpis: [
    { label: 'Active listings', value: '142', note: '+12 this week' },
    { label: 'Pending reviews', value: '9', note: 'Needs action' },
    { label: 'New users (7d)', value: '318', note: '+8% WoW' },
    { label: 'GMV (30d)', value: '$24,890', note: 'Net +14%' },
  ],
  alerts: [
    {
      title: '3 listings flagged for policy review',
      tone: 'warn' as const,
      tag: 'Listings',
    },
    {
      title: '1 dispute awaiting admin decision',
      tone: 'warn' as const,
      tag: 'Disputes',
    },
    {
      title: 'Payments provider webhook delay detected',
      tone: 'neutral' as const,
      tag: 'Ops',
    },
  ],
};

export default function Page() {
  return <Overview />;
}

function Overview() {
  return (
    <div className="grid gap-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="grid gap-4 md:grid-cols-4">
          {SAMPLE.kpis.map((k) => (
            <Card key={k.label} className="p-5">
              <div className="text-xs font-semibold text-black/50">
                {k.label}
              </div>
              <div className="mt-2 text-2xl font-extrabold">{k.value}</div>
              <div className="mt-1 text-xs text-black/50">{k.note}</div>
            </Card>
          ))}
        </div>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Needs attention</div>
            <Badge>Today</Badge>
          </div>
          <div className="mt-4 grid gap-2">
            {SAMPLE.alerts.map((a) => (
              <div
                key={a.title}
                className="flex items-center justify-between gap-3 rounded-2xl border border-black/10 bg-black/5 p-3"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">
                    {a.title}
                  </div>
                  <div className="mt-1 text-xs text-black/50">{a.tag}</div>
                </div>
                <Button
                  variant="secondary"
                  className="px-3"
                  onClick={() => window.alert('Open item (placeholder)')}
                >
                  View
                </Button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="text-sm font-semibold">System status</div>
          <div className="mt-4 grid gap-3">
            <div className="rounded-2xl border border-black/10 bg-black/5 p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">API</div>
                <Badge>Operational</Badge>
              </div>
              <div className="mt-1 text-xs text-black/50">
                Latency within normal range.
              </div>
            </div>
            <div className="rounded-2xl border border-black/10 bg-black/5 p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Email</div>
                <Badge>Operational</Badge>
              </div>
              <div className="mt-1 text-xs text-black/50">
                Delivery rate stable.
              </div>
            </div>
            <div className="rounded-2xl border border-black/10 bg-black/5 p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Payments</div>
                <Badge>Degraded</Badge>
              </div>
              <div className="mt-1 text-xs text-black/50">
                Webhook processing delay detected.
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
