import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { COLORS } from '../../lib/format.js';
import { axisProps, gridProps, tooltipProps, legendProps } from './common.jsx';

export default function BurndownChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="day" {...axisProps} />
        <YAxis {...axisProps} width={32} />
        <Tooltip {...tooltipProps} />
        <Legend {...legendProps} />
        <Line dataKey="ideal" name="Ideal remaining" stroke={COLORS.muted} strokeDasharray="5 5" strokeWidth={2} dot={false} />
        <Line dataKey="actual" name="Actual remaining" stroke={COLORS.primary} strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
