import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { COLORS } from '../../lib/format.js';
import { axisProps, gridProps, tooltipProps, legendProps, sprintAxisProps } from './common.jsx';

export default function DefectChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="sprint" {...sprintAxisProps(data)} />
        <YAxis {...axisProps} width={28} allowDecimals={false} />
        <Tooltip {...tooltipProps} />
        <Legend {...legendProps} />
        <Line type="monotone" dataKey="created" name="Created" stroke={COLORS.danger} strokeWidth={2} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="closed" name="Closed" stroke={COLORS.success} strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
