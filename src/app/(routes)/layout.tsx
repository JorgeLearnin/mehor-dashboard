'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Package,
  ShieldAlert,
  CreditCard,
  Settings,
  Search,
  Bell,
  LogOut,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';

type NavKey =
  | 'overview'
  | 'listings'
  | 'users'
  | 'transactions'
  | 'disputes'
  | 'invites'
  | 'feedback'
  | 'reports';

const NAV: Array<{ key: NavKey; label: string; icon: LucideIcon }> = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'listings', label: 'Listings', icon: Package },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'transactions', label: 'Transactions', icon: CreditCard },
  { key: 'disputes', label: 'Disputes', icon: ShieldAlert },
  { key: 'feedback', label: 'Feedback', icon: Bell },
  { key: 'reports', label: 'Reports', icon: CreditCard },
  { key: 'invites', label: 'Invites', icon: Settings },
];

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

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-2.5 h-4 w-4 text-black/40" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-black/10 bg-white py-2 pl-9 pr-3 text-sm text-black outline-none focus:border-black/30"
      />
    </div>
  );
}

function getActiveNavKey(pathname: string): NavKey {
  const key = pathname.replace(/^\//, '').split('/')[0] as NavKey;
  return NAV.some((n) => n.key === key) ? key : 'overview';
}

export default function RoutesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <React.Suspense
      fallback={<div className="min-h-screen bg-white text-black" />}
    >
      <RoutesShell>{children}</RoutesShell>
    </React.Suspense>
  );
}

function RoutesShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const nav = React.useMemo(() => getActiveNavKey(pathname), [pathname]);

  const urlQuery = searchParams.get('q') ?? '';
  const [search, setSearch] = React.useState(urlQuery);
  const [loggingOut, setLoggingOut] = React.useState(false);

  React.useEffect(() => {
    setSearch(urlQuery);
  }, [urlQuery]);

  const sectionLabel = React.useMemo(() => {
    const item = NAV.find((n) => n.key === nav);
    return item?.label ?? 'Overview';
  }, [nav]);

  const setQuery = React.useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams);
      const trimmed = next.trim();
      if (trimmed) params.set('q', trimmed);
      else params.delete('q');

      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, router, searchParams],
  );

  const navigateTo = React.useCallback(
    (key: NavKey) => {
      const params = new URLSearchParams(searchParams);
      const qs = params.toString();
      router.push(qs ? `/${key}?${qs}` : `/${key}`);
    },
    [router, searchParams],
  );

  const logout = React.useCallback(async () => {
    if (loggingOut) return;
    const baseUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      'http://localhost:5000';

    setLoggingOut(true);
    try {
      await fetch(`${baseUrl}/api/dashboard-auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // ignore
    }

    // Full navigation so middleware immediately sees updated cookies.
    window.location.assign('/sign-in');
  }, [loggingOut]);

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-black/5 blur-3xl" />
        <div className="absolute top-56 left-[-120px] h-[420px] w-[420px] rounded-full bg-black/5 blur-3xl" />
        <div className="absolute bottom-[-180px] right-[-120px] h-[520px] w-[520px] rounded-full bg-black/5 blur-3xl" />
      </div>

      <div className="sticky top-0 z-20 border-b border-black/10 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-3 px-4 py-4">
          <div className="min-w-0">
            <div className="text-xs text-black/50">Admin</div>
            <div className="truncate text-lg font-bold">{sectionLabel}</div>
          </div>

          <div className="hidden w-140 md:block">
            <TextInput
              value={search}
              onChange={(v) => {
                setSearch(v);
                setQuery(v);
              }}
              placeholder="Search listings, users, transactions…"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-2xl border border-black/10 bg-black/5 text-black/70 transition hover:bg-black/10"
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => void logout()}
              disabled={loggingOut}
              className="grid h-10 w-10 place-items-center rounded-2xl border border-red-200 bg-red-50 text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="mx-auto max-w-screen-2xl px-4 pb-4 md:hidden">
          <TextInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              setQuery(v);
            }}
            placeholder="Search…"
          />
        </div>
      </div>

      <div className="mx-auto grid max-w-screen-2xl items-start gap-4 px-4 py-6 md:grid-cols-12">
        <Card className="md:col-span-3">
          <div className="p-4">
            <div className="flex items-center gap-2">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-black font-black">
                M
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold">Mehor Admin</div>
                <div className="text-xs text-black/50">Control center</div>
              </div>
            </div>

            <div className="mt-4 grid gap-2">
              {NAV.map((n) => {
                const Icon = n.icon;
                const active = nav === n.key;
                return (
                  <button
                    key={n.key}
                    type="button"
                    onClick={() => (active ? null : navigateTo(n.key))}
                    className={`flex w-full items-center justify-between rounded-2xl border px-3 py-2 text-sm transition ${
                      active
                        ? 'border-black/30 bg-black text-white'
                        : 'border-black/10 bg-black/5 text-black/80 hover:bg-black/10'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {n.label}
                    </span>
                    <ChevronRight
                      className={`h-4 w-4 ${active ? 'opacity-100' : 'opacity-40'}`}
                    />
                  </button>
                );
              })}

              <div className="my-2 h-px bg-black/10" />

              <button
                type="button"
                onClick={() => void logout()}
                disabled={loggingOut}
                className="flex w-full items-center justify-between rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="flex items-center gap-2">
                  <LogOut className="h-4 w-4" />
                  Logout
                </span>
                <ChevronRight className="h-4 w-4 opacity-40" />
              </button>
            </div>
          </div>
        </Card>

        <div className="md:col-span-9">{children}</div>
      </div>
    </div>
  );
}
