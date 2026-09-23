export const STATUS_LABEL = { on_track: 'On track', attention: 'Attention', at_risk: 'At risk' };

export const formatValue = (value, unit) => {
  if (value === null || value === undefined) return '—';
  if (unit === '%') return `${value}%`;
  if (unit === 'SP') return `${value} SP`;
  return String(value);
};

export const formatDateTime = (iso) =>
  new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// Colours shared by charts (kept in sync with CSS tokens in index.css)
export const COLORS = {
  primary: '#2f6fdb',
  primarySoft: '#b9d0f5',
  success: '#2e8b57',
  warning: '#d19a2a',
  danger: '#d9534f',
  muted: '#8a94a6',
  grid: '#e6e9ef',
};
