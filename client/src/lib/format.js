const pad = (n) => String(n).padStart(2, '0');

export function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
}

export function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return `${formatDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export function formatINR(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return inr.format(Number(value));
}

export function formatPercent(value) {
  if (value == null) return '—';
  return `${Math.round(Number(value) * 10) / 10}%`;
}

export function daysUntil(value, now = Date.now()) {
  return Math.ceil((new Date(value).getTime() - now) / 86400000);
}

// Value for <input type="date">, in local time.
export function toDateInput(value) {
  if (!value) return '';
  const d = new Date(value);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
