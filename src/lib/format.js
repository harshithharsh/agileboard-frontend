export const STATUS_LABEL = { on_track: 'On Track', attention: 'Attention', at_risk: 'At Risk', in_progress: 'In Progress' };

export const formatValue = (value, unit) => {
  if (value === null || value === undefined) return '—';
  if (unit === '%') return `${value}%`;
  if (unit === 'SP') return `${value} SP`;
  return String(value);
};

// Dates and times follow the workspace format (see lib/datetime.js)
export { formatDateTime } from './datetime.js';

// Colours shared by charts (kept in sync with CSS tokens in index.css)
export const COLORS = {
  primary: '#2f6fdb',
  primarySoft: '#b9d0f5',
  primaryMid: '#7fa3e6',
  success: '#2e8b57',
  warning: '#d19a2a',
  danger: '#d9534f',
  muted: '#8a94a6',
  grid: '#e6e9ef',
  teal: '#0f7c91',
  gold: '#d99a1e',
};
