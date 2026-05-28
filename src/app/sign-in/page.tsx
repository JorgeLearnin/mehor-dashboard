"use client";

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

type LoginResponse =
	| {
			user: {
				id: string | number;
				email: string;
				fullName: string | null;
				role: string;
			};
			fieldErrors?: never;
			error?: never;
		}
	| {
			user?: never;
			fieldErrors?: {
				email?: string;
				password?: string;
			};
			error?: string;
		};

export default function DashboardSignInPage() {
	const router = useRouter();

	const apiUrl = process.env.NEXT_PUBLIC_API_URL;

	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [remember, setRemember] = useState(true);
	const [saving, setSaving] = useState(false);

	const [emailError, setEmailError] = useState('');
	const [passwordError, setPasswordError] = useState('');
	const [submitError, setSubmitError] = useState('');

	const canSubmit = useMemo(() => {
		return Boolean(email.trim()) && Boolean(password) && !saving;
	}, [email, password, saving]);

	const clearErrors = () => {
		setEmailError('');
		setPasswordError('');
		setSubmitError('');
	};

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (saving) return;

		clearErrors();

		if (!apiUrl) {
			setSubmitError('Missing NEXT_PUBLIC_API_URL.');
			return;
		}

		try {
			setSaving(true);

			const res = await fetch(`${apiUrl}/api/dashboard/auth/login`, {
				method: 'POST',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					email: email.trim().toLowerCase(),
					password,
					remember,
				}),
			});

			const data = (await res.json().catch(() => ({}))) as LoginResponse;

			if (!res.ok) {
				if (data && typeof data === 'object' && 'fieldErrors' in data) {
					setEmailError(String(data.fieldErrors?.email || ''));
					setPasswordError(String(data.fieldErrors?.password || ''));
					if (!data.fieldErrors?.email && !data.fieldErrors?.password) {
						setSubmitError(String(data.error || 'Could not sign in.'));
					}

					return;
				}

				setSubmitError('Could not sign in.');
				return;
			}

			router.replace('/');
		} catch {
			setSubmitError('Could not sign in.');
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="min-h-screen bg-slate-50 px-4 py-10">
			<div className="mx-auto w-full max-w-md">
				<div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
					<div className="text-sm font-black text-slate-950">
						Mehor Dashboard
					</div>
					<div className="mt-1 text-sm text-slate-500">
						Sign in to continue.
					</div>

					<form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
						<div>
							<label className="text-xs font-semibold text-slate-600">
								Email
							</label>
							<input
								type="email"
								value={email}
								onChange={(e) => {
									setEmail(e.target.value);
									if (emailError) setEmailError('');
									if (submitError) setSubmitError('');
								}}
								autoComplete="email"
								className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
								placeholder="you@company.com"
								disabled={saving}
							/>
							{emailError ? (
								<div className="mt-2 text-xs text-red-600">{emailError}</div>
							) : null}
						</div>

						<div>
							<label className="text-xs font-semibold text-slate-600">
								Password
							</label>
							<input
								type="password"
								value={password}
								onChange={(e) => {
									setPassword(e.target.value);
									if (passwordError) setPasswordError('');
									if (submitError) setSubmitError('');
								}}
								autoComplete="current-password"
								className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
								placeholder="••••••••"
								disabled={saving}
							/>
							{passwordError ? (
								<div className="mt-2 text-xs text-red-600">
									{passwordError}
								</div>
							) : null}
						</div>

						<label className="flex items-center gap-2 text-xs text-slate-600">
							<input
								type="checkbox"
								checked={remember}
								onChange={(e) => setRemember(e.target.checked)}
								disabled={saving}
								className="h-4 w-4 rounded border-slate-300"
							/>
							Remember me
						</label>

						{submitError ? (
							<div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
								{submitError}
							</div>
						) : null}

						<button
							type="submit"
							disabled={!canSubmit}
							className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
						>
							{saving ? 'Signing in...' : 'Sign in'}
						</button>
					</form>
				</div>
			</div>
		</div>
	);
}
