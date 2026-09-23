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

// Legend text in one readable colour; the series colour is shown by the marker only
export const legendProps = {
  iconType: 'circle',
  iconSize: 8,
  wrapperStyle: { fontSize: 12 },
  formatter: (value) => <span style={{ color: 'var(--muted)' }}>{value}</span>,
};

// Sprint labels on the x-axis. Combined labels ("Nexo 12 / Vertex 13") are split onto one line per team.
function SprintTick({ x, y, payload }) {
  const lines = String(payload.value).split(' / ');
  return (
    <text x={x} y={y + 12} textAnchor="middle" fill={COLORS.muted} fontSize={12}>
      {lines.map((line, i) => (
        <tspan key={line} x={x} dy={i === 0 ? 0 : 14}>{line}</tspan>
      ))}
    </text>
  );
}

// Props for an x-axis of sprints: show every sprint, with room for two-line labels.
export const sprintAxisProps = (data) => {
  const lines = Math.max(1, ...data.map((d) => String(d.sprint).split(' / ').length));
  return { ...axisProps, tick: <SprintTick />, interval: 0, height: 18 + lines * 14 };
};
