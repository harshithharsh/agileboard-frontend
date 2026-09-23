import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { COLORS } from '../../lib/format.js';
import { axisProps, gridProps, tooltipProps, legendProps } from './common.jsx';

export default function DeliveryChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} barGap={4}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="sprint" {...axisProps} />
        <YAxis {...axisProps} width={32} />
        <Tooltip {...tooltipProps} />
        <Legend {...legendProps} />
        <Bar dataKey="committed" name="Committed" fill={COLORS.primarySoft} radius={[4, 4, 0, 0]} />
        <Bar dataKey="completed" name="Completed" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
