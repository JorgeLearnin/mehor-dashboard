import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { PrivateShell } from '@/components/private-shell';

type AuthMeResponse = {
  user?: {
    id?: string | number;
    email?: string;
    username?: string;
    fullName?: string | null;
    role?: string;
  };
};

async function getDashboardUser() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl) {
    return null;
  }

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ');

  if (!cookieHeader) {
    return null;
  }

  try {
    const res = await fetch(`${apiUrl}/api/dashboard/auth/me`, {
      method: 'GET',
      headers: {
        cookie: cookieHeader,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as AuthMeResponse;
    return data.user ?? null;
  } catch {
    return null;
  }
}

export default async function PrivateLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getDashboardUser();

  if (!user) {
    redirect('/sign-in');
  }

  return <PrivateShell>{children}</PrivateShell>;
}
