import { COLORS } from '../../lib/format.js';

export const axisProps = {
  tick: { fill: COLORS.muted, fontSize: 12 },
  tickLine: false,
  axisLine: false,
};

export const gridProps = { stroke: COLORS.grid, vertical: false };

export const tooltipProps = {
  contentStyle: { borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 12 },
  labelStyle: { color: 'var(--text)', fontWeight: 600 },
  cursor: { fill: 'rgba(47, 111, 219, 0.06)' },
};

export const legendProps = { iconType: 'circle', iconSize: 8, wrapperStyle: { fontSize: 12, color: COLORS.muted } };
