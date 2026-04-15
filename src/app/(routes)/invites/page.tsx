'use client';

import * as React from 'react';

import { ConfirmationModal } from '../../../components/modals/confirmation-modal';

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

function TextInput({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-semibold text-black/60">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type={type}
        className="w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none focus:border-black/30"
      />
    </label>
  );
}

type InviteStatus = 'pending' | 'accepted' | 'expired';

type InviteRow = {
  email: string;
  status: InviteStatus;
  invitedAt: string;
};

export default function Page() {
  return <InvitesView />;
}

function InvitesView() {
  const [email, setEmail] = React.useState('');

  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirmEmail, setConfirmEmail] = React.useState<string | null>(null);

  // UI preview only
  const [invites, setInvites] = React.useState<InviteRow[]>(() => [
    {
      email: 'admin@example.com',
      status: 'pending',
      invitedAt: 'Just now',
    },
    {
      email: 'support@example.com',
      status: 'accepted',
      invitedAt: '2 days ago',
    },
  ]);

  const openRemove = React.useCallback((inviteEmail: string) => {
    setConfirmEmail(inviteEmail);
    setConfirmOpen(true);
  }, []);

  const closeRemove = React.useCallback(() => {
    setConfirmOpen(false);
    setConfirmEmail(null);
  }, []);

  const confirmRemove = React.useCallback(() => {
    if (!confirmEmail) return;
    setInvites((prev) => prev.filter((r) => r.email !== confirmEmail));
    closeRemove();
  }, [closeRemove, confirmEmail]);

  return (
    <div className="grid gap-4">
      <Card className="p-5">
        <div className="text-sm font-semibold">Invites</div>
        <div className="mt-1 text-xs text-black/50">
          Invite admins and support agents to access the dashboard.
        </div>
      </Card>

      <ConfirmationModal
        open={confirmOpen}
        title="Remove invite?"
        description={
          confirmEmail ? `This will remove the invite for ${confirmEmail}.` : ''
        }
        confirmLabel="Remove"
        cancelLabel="Cancel"
        onClose={closeRemove}
        onConfirm={confirmRemove}
      />

      <Card className="p-5">
        <div className="text-sm font-semibold">Send invite</div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <TextInput
            label="Email"
            value={email}
            onChange={setEmail}
            placeholder="name@domain.com"
            type="email"
          />
          <div className="grid gap-2">
            <span className="text-xs font-semibold text-black/60">Action</span>
            <Button
              onClick={() => window.alert('Send invite (preview)')}
              disabled={!email.trim()}
              className="h-10"
            >
              Send invite
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="border-b border-black/10 p-5">
          <div className="text-sm font-semibold">Pending & recent</div>
          <div className="mt-1 text-xs text-black/50">
            Manage recently sent invitations.
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-black/5 text-xs text-black/60">
              <tr>
                <th className="px-5 py-3 font-semibold">Email</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Invited</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invites.map((row) => (
                <tr
                  key={`${row.email}-${row.invitedAt}`}
                  className="border-t border-black/10"
                >
                  <td className="px-5 py-3">{row.email}</td>
                  <td className="px-5 py-3 capitalize">{row.status}</td>
                  <td className="px-5 py-3">{row.invitedAt}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="inline-flex items-center rounded-2xl border border-black/10 bg-black/5 px-2.5 py-1.5 text-xs font-semibold text-black/70 transition hover:bg-black/10"
                        onClick={() => window.alert('Resend (preview)')}
                      >
                        Resend
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center rounded-2xl border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                        onClick={() => openRemove(row.email)}
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
