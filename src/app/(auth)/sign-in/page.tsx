'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { getDashboardApiBaseUrl } from '@/lib/api-base';

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

type ButtonVariant = 'primary' | 'secondary';

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
      : 'bg-black/5 text-black hover:bg-black/10 border border-black/10';
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
  type = 'text',
  autoComplete,
  placeholder,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  error?: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-semibold text-black/60">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        className={`w-full rounded-2xl border bg-white px-3 py-2 text-sm text-black outline-none focus:border-black/30 ${
          error ? 'border-red-300 focus:border-red-400' : 'border-black/10'
        }`}
      />
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </label>
  );
}

export default function Page() {
  const router = useRouter();

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [rememberMe, setRememberMe] = React.useState(true);
  const [checkingSession, setCheckingSession] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [errors, setErrors] = React.useState<{
    email?: string;
    password?: string;
  }>({});

  React.useEffect(() => {
    let cancelled = false;

    const verifySession = async () => {
      try {
        const baseUrl = getDashboardApiBaseUrl();
        const resp = await fetch(`${baseUrl}/api/dashboard-auth/me`, {
          method: 'GET',
          credentials: 'include',
        });

        if (cancelled) return;

        if (resp.ok) {
          router.replace('/overview');
          return;
        }

        if (resp.status === 401 || resp.status === 403) {
          await fetch(`${baseUrl}/api/dashboard-auth/logout`, {
            method: 'POST',
            credentials: 'include',
          }).catch(() => undefined);
        }
      } catch {
        // Ignore transient verification failures and allow manual sign-in.
      } finally {
        if (!cancelled) setCheckingSession(false);
      }
    };

    void verifySession();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const setEmailSafe = React.useCallback((v: string) => {
    setEmail(v);
    setErrors((prev) => (prev.email ? { ...prev, email: undefined } : prev));
  }, []);

  const setPasswordSafe = React.useCallback((v: string) => {
    setPassword(v);
    setErrors((prev) =>
      prev.password ? { ...prev, password: undefined } : prev,
    );
  }, []);

  const applyServerError = React.useCallback((message: string) => {
    const normalized = String(message ?? '').trim();
    if (!normalized) {
      setErrors({ password: 'Could not sign in' });
      return;
    }

    // Try to attach the message to the most relevant field.
    const lower = normalized.toLowerCase();
    if (lower.includes('email')) {
      setErrors({ email: normalized });
      return;
    }
    if (lower.includes('password')) {
      setErrors({ password: normalized });
      return;
    }

    // Default: show under password to avoid hinting whether the email exists.
    setErrors({ password: normalized });
  }, []);

  const validate = React.useCallback(() => {
    const next: { email?: string; password?: string } = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) next.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(trimmedEmail))
      next.email = 'Enter a valid email';

    if (!password) next.password = 'Password is required';

    setErrors(next);
    return Object.keys(next).length === 0;
  }, [email, password]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (checkingSession) return;

    if (!validate()) return;

    setSubmitting(true);
    try {
      const baseUrl = getDashboardApiBaseUrl();

      const resp = await fetch(`${baseUrl}/api/dashboard-auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email,
          password,
          remember: rememberMe,
        }),
      });

      if (!resp.ok) {
        if (resp.status === 401) {
          setErrors({ password: 'Email or password is incorrect.' });
          return;
        }

        const data = await resp.json().catch(() => null);
        const message =
          typeof data?.error === 'string' ? data.error : 'Could not sign in';
        applyServerError(message);
        return;
      }

      router.push('/overview');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-black/5 blur-3xl" />
        <div className="absolute bottom-[-180px] right-[-120px] h-[520px] w-[520px] rounded-full bg-black/5 blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-screen max-w-md items-center px-4 py-10">
        <Card className="w-full p-6">
          <div className="grid gap-2">
            <div className="text-xs text-black/50">Admin</div>
            <div className="text-2xl font-extrabold">Sign in</div>
            <div className="text-sm text-black/60">
              Use your admin credentials to continue.
            </div>
          </div>

          {checkingSession ? (
            <div className="mt-6 rounded-3xl border border-black/10 bg-black/5 p-4 text-sm text-black/60">
              Checking your session…
            </div>
          ) : null}

          <form onSubmit={onSubmit} className="mt-6 grid gap-4">
            <TextInput
              label="Email"
              value={email}
              onChange={setEmailSafe}
              type="email"
              autoComplete="email"
              placeholder="you@domain.com"
              error={errors.email}
            />
            <TextInput
              label="Password"
              value={password}
              onChange={setPasswordSafe}
              type="password"
              autoComplete="current-password"
              placeholder="Your password"
              error={errors.password}
            />

            <label className="flex items-center gap-2 text-sm text-black/70">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-black/20"
              />
              Remember me
            </label>

            <div className="mt-2 grid gap-2">
              <Button type="submit" disabled={submitting || checkingSession}>
                {submitting ? 'Signing in…' : 'Sign in'}
              </Button>
            </div>

            <div className="mt-2 rounded-3xl border border-black/10 bg-black/5 p-4 text-xs text-black/60">
              Need help? Contact{' '}
              <a href="mailto:support@mehor.com" className="underline">
                support@mehor.com
              </a>
              .
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
