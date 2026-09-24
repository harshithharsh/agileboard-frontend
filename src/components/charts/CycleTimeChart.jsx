import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { COLORS } from '../../lib/format.js';
import { axisProps, gridProps, tooltipProps, legendProps, sprintAxisProps } from './common.jsx';

// Cycle time per sprint: average, median and 85th percentile (days)
const ORDER = { avg: 0, median: 1, p85: 2 };
const byOrder = (item) => ORDER[item.dataKey] ?? 9;

function formatValue(value, name, { payload }) {
  if (value === null || value === undefined) return ['No completed items', name];
  return [`${value} days${name === 'Average' ? ` (${payload.items} item${payload.items === 1 ? '' : 's'})` : ''}`, name];
}

export default function CycleTimeChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="sprint" {...sprintAxisProps(data)} padding={{ left: 36, right: 36 }} />
        <YAxis {...axisProps} width={40} tickFormatter={(v) => `${v}d`} allowDecimals={false} />
        <Tooltip {...tooltipProps} formatter={formatValue} itemSorter={byOrder} />
        <Legend {...legendProps} itemSorter={byOrder} />
        <Line dataKey="avg" name="Average" stroke={COLORS.primary} strokeWidth={2} dot={{ r: 3 }} />
        <Line dataKey="median" name="Median" stroke={COLORS.success} strokeWidth={2} dot={{ r: 3 }} />
        <Line dataKey="p85" name="85th Percentile" stroke={COLORS.warning} strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
