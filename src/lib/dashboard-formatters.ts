type DashboardActor = {
  username?: string | null;
  email?: string | null;
  name?: string | null;
};

export function getDashboardOrderDisplay(
  orderNumber?: string | null,
  orderId?: string | null,
) {
  const rawNumber = String(orderNumber ?? '').trim();
  const rawId = String(orderId ?? '').trim();

  const shortSource = rawNumber || rawId;
  const short = shortSource ? shortSource.slice(-8) : '—';
  const full = short === '—' ? '—' : `#${short}`;

  return { full, short };
}

export function formatDashboardActor(value: DashboardActor) {
  const username = String(value.username ?? '').trim();
  if (username) return username.startsWith('@') ? username : `@${username}`;

  const email = String(value.email ?? '').trim();
  if (email) return email;

  const name = String(value.name ?? '').trim();
  return name || '—';
}

export function formatDashboardDateTime(value?: string | null) {
  const raw = String(value ?? '').trim();
  if (!raw) return '—';

  const ms = Date.parse(raw);
  if (!Number.isFinite(ms)) return '—';

  return new Date(ms).toLocaleString();
}

export function formatDashboardShortDate(value?: string | null) {
  const raw = String(value ?? '').trim();
  if (!raw) return '—';

  const ms = Date.parse(raw);
  if (!Number.isFinite(ms)) return '—';

  return new Date(ms).toLocaleDateString();
}
