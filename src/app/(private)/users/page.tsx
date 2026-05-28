'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';

import { ConfirmationModal } from '@/components/modals/confirmation-modal';

type UserRow = {
  id: number;
  email: string;
  username: string;
  name: string;
  role: 'seller' | 'user';
  status: string;
  restricted: boolean;
};

type UsersResponse = {
  users?: UserRow[];
  error?: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL;

function usePagination({
  total,
  resetKey,
  pageSize = 10,
}: {
  total: number;
  resetKey: string;
  pageSize?: number;
}) {
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    setPage(1);
  }, [resetKey]);

  const totalPages = React.useMemo(
    () => Math.max(1, Math.ceil(Math.max(0, total) / pageSize)),
    [pageSize, total],
  );

  React.useEffect(() => {
    setPage((prev) => Math.min(Math.max(1, prev), totalPages));
  }, [totalPages]);

  return { page, setPage, pageSize, totalPages };
}

function PaginationControls({
  page,
  totalPages,
  disabled = false,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  disabled?: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between">
      <div className="text-xs text-black/50">
        Page <span className="font-semibold text-black/70">{page}</span> of{' '}
        <span className="font-semibold text-black/70">{totalPages}</span>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-2xl border border-black/10 bg-black/5 px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-black/10 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={disabled || page <= 1}
          onClick={onPrev}
        >
          Prev
        </button>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-2xl border border-black/10 bg-black/5 px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-black/10 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={disabled || page >= totalPages}
          onClick={onNext}
        >
          Next
        </button>
      </div>
    </div>
  );
}

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

function Button({
  children,
  className = '',
  ...props
}: React.PropsWithChildren<React.ButtonHTMLAttributes<HTMLButtonElement>>) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-black/20 disabled:cursor-not-allowed disabled:opacity-40 bg-black/5 text-black hover:bg-black/10 border border-black/10 ${className}`}
      {...props}
    >
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

function formatUsername(username: string) {
  const value = String(username ?? '').trim();
  if (!value) return '—';
  return value.startsWith('@') ? value : `@${value}`;
}

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
  const [allRows, setAllRows] = React.useState<UserRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirmBusy, setConfirmBusy] = React.useState(false);
  const [confirmState, setConfirmState] = React.useState<null | {
    id: number;
    name: string;
    restricted: boolean;
  }>(null);

  const loadUsers = React.useCallback(async () => {
    if (!API_URL) {
      setError('Missing NEXT_PUBLIC_API_URL.');
      setLoading(false);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/dashboard/users`, {
        method: 'GET',
        credentials: 'include',
      });

      const data = (await res.json().catch(() => ({}))) as UsersResponse;

      if (!res.ok) {
        setError(data.error || 'Could not load users.');
        return;
      }

      setAllRows(Array.isArray(data.users) ? data.users : []);
    } catch {
      setError('Could not load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const filteredRows = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allRows;

    return allRows.filter((user) =>
      [user.id, user.email, user.name, user.username, user.role, user.status]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [allRows, search]);

  const total = filteredRows.length;
  const { page, setPage, pageSize, totalPages } = usePagination({
    total,
    resetKey: search,
    pageSize: 10,
  });

  const rows = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  const closeConfirm = React.useCallback(() => {
    if (confirmBusy) return;
    setConfirmOpen(false);
    setConfirmState(null);
  }, [confirmBusy]);

  const openConfirm = React.useCallback((user: UserRow) => {
    setConfirmState({
      id: user.id,
      name: user.name || user.username || user.email,
      restricted: user.restricted,
    });
    setConfirmOpen(true);
  }, []);

  const confirmAction = React.useCallback(async () => {
    if (!confirmState || !API_URL) return;

    setError(null);
    setConfirmBusy(true);

    try {
      const nextRestricted = !confirmState.restricted;

      const res = await fetch(
        `${API_URL}/api/dashboard/users/${confirmState.id}/restriction`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            restricted: nextRestricted,
          }),
        },
      );

      const data = (await res.json().catch(() => ({}))) as {
        user?: Partial<UserRow>;
        error?: string;
      };

      if (!res.ok) {
        setError(data.error || 'Could not update user.');
        return;
      }

      setAllRows((prev) =>
        prev.map((user) =>
          user.id === confirmState.id
            ? {
                ...user,
                status: nextRestricted ? 'restricted' : 'active',
                restricted: nextRestricted,
              }
            : user,
        ),
      );

      closeConfirm();
    } catch {
      setError('Could not update user.');
    } finally {
      setConfirmBusy(false);
    }
  }, [closeConfirm, confirmState]);

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
        title={confirmState?.restricted ? 'Unrestrict user?' : 'Restrict user?'}
        description={
          confirmState
            ? `This will affect ${confirmState.name || 'this user'}.`
            : ''
        }
        confirmLabel={confirmState?.restricted ? 'Unrestrict' : 'Restrict'}
        cancelLabel="Cancel"
        busy={confirmBusy}
        onClose={closeConfirm}
        onConfirm={confirmAction}
      />

      {error ? <Card className="p-4 text-sm text-red-700">{error}</Card> : null}

      {loading ? (
        <Card className="p-6 text-sm text-black/70">Loading users...</Card>
      ) : (
        <>
          <Table columns="1.7fr 1.6fr 1.2fr 0.8fr 1fr">
            <>
              <div>Name</div>
              <div>Email</div>
              <div>Username</div>
              <div>Role</div>
              <div className="text-right">Actions</div>
            </>

            {rows.map((user) => (
              <Row key={user.id} columns="1.7fr 1.6fr 1.2fr 0.8fr 1fr">
                <div>
                  <div className="font-semibold text-black">{user.name}</div>
                </div>
                <div className="truncate text-black/70">
                  {user.email || '-'}
                </div>
                <div className="text-black/70">
                  {formatUsername(user.username)}
                </div>
                <div>{user.role}</div>
                <div className="flex justify-end gap-2">
                  <Button
                    className={`px-2.5 py-1 text-[11px] ${
                      user.restricted
                        ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                        : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                    }`}
                    onClick={() => openConfirm(user)}
                    disabled={confirmBusy}
                  >
                    {user.restricted ? 'Unrestrict' : 'Restrict'}
                  </Button>
                </div>
              </Row>
            ))}
          </Table>

          {total > 0 ? (
            <PaginationControls
              page={page}
              totalPages={totalPages}
              onPrev={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={confirmBusy}
            />
          ) : null}

          {total === 0 ? (
            <Card className="p-6 text-sm text-black/70">
              No users match your search.
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
