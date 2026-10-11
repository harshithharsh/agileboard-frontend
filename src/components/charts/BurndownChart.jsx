import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { COLORS } from '../../lib/format.js';
import { axisProps, gridProps, tooltipProps, legendProps } from './common.jsx';

// Sprint dates are 'YYYY-MM-DD'; format without timezone shifts
const parse = (iso) => new Date(`${iso}T00:00:00`);
const tickDate = (iso) => parse(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const fullDate = (iso) => parse(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

export default function BurndownChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="date" tickFormatter={tickDate} {...axisProps} />
        <YAxis {...axisProps} width={32} />
        <Tooltip {...tooltipProps} labelFormatter={(iso, items) => `${fullDate(iso)} · Day ${(items?.[0]?.payload?.day || '').slice(1)}`} />
        <Legend {...legendProps} />
        <Line dataKey="ideal" name="Ideal Remaining" stroke={COLORS.muted} strokeDasharray="5 5" strokeWidth={2} dot={false} />
        <Line dataKey="actual" name="Actual Remaining" stroke={COLORS.primary} strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
