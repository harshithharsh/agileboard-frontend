import { ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceArea } from 'recharts';
import { COLORS } from '../../lib/format.js';
import { axisProps, gridProps, tooltipProps, legendProps, sprintAxisProps } from './common.jsx';

// Committed vs. completed velocity per sprint, with the rolling average and the stable band shaded.
const ORDER = { committed: 0, velocity: 1, rollingAverage: 2 };
const byOrder = (item) => ORDER[item.dataKey] ?? 9;

export default function VelocityChart({ data, band }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="sprint" {...sprintAxisProps(data)} padding={{ left: 36, right: 36 }} />
        <YAxis {...axisProps} width={36} />
        <Tooltip {...tooltipProps} formatter={(v, name) => [`${v} SP`, name]} itemSorter={byOrder} />
        <Legend {...legendProps} itemSorter={byOrder} />
        {band && <ReferenceArea y1={band.low} y2={band.high} fill={COLORS.primary} fillOpacity={0.06} />}
        <Line dataKey="committed" name="Committed Velocity" stroke={COLORS.primaryMid} strokeWidth={2} dot={{ r: 3 }} />
        <Line dataKey="velocity" name="Completed Velocity" stroke={COLORS.primary} strokeWidth={2} dot={{ r: 3 }} />
        <Line dataKey="rollingAverage" name="Rolling Average" stroke={COLORS.warning} strokeWidth={2} strokeDasharray="4 4" dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
