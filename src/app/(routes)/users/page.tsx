'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';

import { PaginationControls } from '../../../components/pagination-controls';
import { ConfirmationModal } from '../../../components/modals/confirmation-modal';
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

type UserRow = {
  id: string;
  name: string;
  username: string;
  role: string;
  status: string;
};

type UsersResponse = {
  users: UserRow[];
  total: number;
  page: number;
  limit: number;
};

export default function Page() {
  return (
    <React.Suspense fallback={null}>
      <UsersPage />
    </React.Suspense>
  );
}

function UsersPage() {
  const searchParams = useSearchParams();
  const search = searchParams.get('q') ?? '';
  return <UsersView search={search} />;
}

function UsersView({ search }: { search: string }) {
  const [rows, setRows] = React.useState<UserRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadToken, setReloadToken] = React.useState(0);

  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirmBusy, setConfirmBusy] = React.useState(false);
  const [confirmState, setConfirmState] = React.useState<null | {
    id: string;
    name: string;
    username: string;
    nextStatus: 'Active' | 'Restricted';
  }>(null);
  const { page, setPage, pageSize, totalPages } = usePagination({
    total,
    resetKey: search,
    pageSize: 10,
  });

  const baseUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

  React.useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError(null);

    const qs = new URLSearchParams();
    if (search.trim()) qs.set('q', search.trim());
    qs.set('page', String(page));
    qs.set('limit', String(pageSize));

    fetch(`${baseUrl}/api/dashboard/users?${qs.toString()}`, {
      credentials: 'include',
      signal: ac.signal,
    })
      .then(async (resp) => {
        const raw = (await resp.json().catch(() => null)) as unknown;
        const data = raw as UsersResponse;
        const maybeError = raw as { error?: unknown };

        if (!resp.ok) {
          const message =
            typeof maybeError?.error === 'string'
              ? maybeError.error
              : 'Could not load users';
          throw new Error(message);
        }

        setRows(Array.isArray(data?.users) ? data.users : []);
        setTotal(Number.isFinite(data?.total) ? data.total : 0);
      })
      .catch((e) => {
        if (e instanceof Error && e.name === 'AbortError') return;
        setRows([]);
        setTotal(0);
        setError(e instanceof Error ? e.message : 'Could not load users');
      })
      .finally(() => {
        setLoading(false);
      });

    return () => ac.abort();
  }, [baseUrl, page, pageSize, reloadToken, search]);

  const setUserStatus = React.useCallback(
    async (id: string, nextStatus: 'Active' | 'Restricted') => {
      setError(null);

      const action = nextStatus === 'Restricted' ? 'restrict' : 'unrestrict';
      const resp = await fetch(
        `${baseUrl}/api/dashboard/users/${id}/${action}`,
        {
          method: 'PATCH',
          credentials: 'include',
        },
      );

      if (!resp.ok) {
        const data = await resp.json().catch(() => null);
        const message =
          typeof data?.error === 'string'
            ? data.error
            : 'Could not update user';
        setError(message);
        return;
      }

      setReloadToken((t) => t + 1);
    },
    [baseUrl],
  );

  const closeConfirm = React.useCallback(() => {
    if (confirmBusy) return;
    setConfirmOpen(false);
    setConfirmState(null);
  }, [confirmBusy]);

  const openConfirm = React.useCallback((u: UserRow) => {
    setConfirmState({
      id: u.id,
      name: u.name,
      username: u.username,
      nextStatus: u.status === 'Restricted' ? 'Active' : 'Restricted',
    });
    setConfirmOpen(true);
  }, []);

  const confirmAction = React.useCallback(async () => {
    if (!confirmState) return;

    setConfirmBusy(true);
    try {
      await setUserStatus(confirmState.id, confirmState.nextStatus);
      closeConfirm();
    } finally {
      setConfirmBusy(false);
    }
  }, [closeConfirm, confirmState, setUserStatus]);

  return (
    <div className="grid gap-4">
      <Card className="p-5">
        <div className="text-sm font-semibold">Users</div>
        <div className="mt-1 text-xs text-black/50">
          Manage access and restrictions.
        </div>
      </Card>

      <ConfirmationModal
        open={confirmOpen}
        title={
          confirmState?.nextStatus === 'Restricted'
            ? 'Restrict user?'
            : 'Unrestrict user?'
        }
        description={
          confirmState
            ? `This will affect ${confirmState.name || confirmState.username || 'this user'}.`
            : ''
        }
        confirmLabel={
          confirmState?.nextStatus === 'Restricted' ? 'Restrict' : 'Unrestrict'
        }
        cancelLabel="Cancel"
        busy={confirmBusy}
        onClose={closeConfirm}
        onConfirm={confirmAction}
      />

      <Table columns="2fr 1.2fr 1fr 1fr">
        <>
          <div>Name</div>
          <div>Username</div>
          <div>Role</div>
          <div className="text-right">Actions</div>
        </>
        {rows.map((u) => (
          <Row key={u.id} columns="2fr 1.2fr 1fr 1fr">
            <div>
              <div className="font-semibold text-black">{u.name}</div>
            </div>
            <div className="text-black/70">
              {u.username
                ? u.username.startsWith('@')
                  ? u.username
                  : `@${u.username}`
                : ''}
            </div>
            <div>{u.role}</div>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                className={`px-2.5 py-1 text-[11px] ${
                  u.status === 'Restricted'
                    ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                    : ''
                }`}
                onClick={() => openConfirm(u)}
                disabled={loading || confirmBusy}
              >
                {u.status === 'Restricted' ? 'Unrestrict' : 'Restrict'}
              </Button>
            </div>
          </Row>
        ))}
      </Table>

      {error ? <Card className="p-4 text-sm text-red-700">{error}</Card> : null}

      {total > 0 ? (
        <PaginationControls
          page={page}
          totalPages={totalPages}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={loading}
        />
      ) : null}

      {!loading && total === 0 ? (
        <Card className="p-6 text-sm text-black/70">
          No users match your search.
        </Card>
      ) : null}
    </div>
  );
}
